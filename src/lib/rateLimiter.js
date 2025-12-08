/**
 * Rate Limiter Middleware
 * 
 * Prevents API abuse and DDoS attacks by limiting requests per IP/user.
 * Uses in-memory storage (for production, consider Redis).
 */

// Store for tracking requests: { key: { count: number, resetTime: timestamp } }
const requestStore = new Map();

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestStore.entries()) {
    if (now > data.resetTime) {
      requestStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limit configuration presets
 */
export const RATE_LIMITS = {
  // Strict limits for authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  
  // Medium limits for form submissions
  SUBMIT: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 submissions per hour
    message: 'Too many form submissions. Please try again later.'
  },
  
  // Generous limits for read operations
  READ: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'Too many requests. Please slow down.'
  },
  
  // Very strict for file uploads
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 uploads per hour
    message: 'Too many file uploads. Please try again later.'
  },
  
  // Moderate for API actions
  ACTION: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 actions per minute
    message: 'Too many actions. Please wait a moment.'
  }
};

/**
 * Get client identifier from request
 * Uses IP address and optional user ID for better tracking
 */
function getClientKey(request, prefix = 'ip') {
  // Try to get real IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  // Optional: Add user ID if authenticated (more granular control)
  const userId = request.headers.get('x-user-id') || '';
  
  return `${prefix}:${ip}:${userId}`;
}

/**
 * Check if request should be rate limited
 * 
 * @param {Request} request - Next.js request object
 * @param {Object} config - Rate limit configuration
 * @returns {Object} { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(request, config = RATE_LIMITS.READ) {
  const key = getClientKey(request, config.message.split(' ')[0].toLowerCase());
  const now = Date.now();
  
  // Get or create rate limit data for this client
  let clientData = requestStore.get(key);
  
  if (!clientData || now > clientData.resetTime) {
    // First request or window expired - reset
    clientData = {
      count: 1,
      resetTime: now + config.windowMs
    };
    requestStore.set(key, clientData);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: clientData.resetTime,
      retryAfter: 0
    };
  }
  
  // Increment request count
  clientData.count++;
  
  if (clientData.count > config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: clientData.resetTime,
      retryAfter,
      message: config.message
    };
  }
  
  // Request allowed
  return {
    allowed: true,
    remaining: config.maxRequests - clientData.count,
    resetTime: clientData.resetTime,
    retryAfter: 0
  };
}

/**
 * Express-style middleware wrapper for Next.js API routes
 * 
 * Usage:
 * export async function POST(request) {
 *   const rateLimitCheck = await rateLimit(request, RATE_LIMITS.SUBMIT);
 *   if (!rateLimitCheck.allowed) {
 *     return rateLimitCheck.response;
 *   }
 *   // Process request...
 * }
 */
export async function rateLimit(request, config = RATE_LIMITS.READ) {
  const check = checkRateLimit(request, config);
  
  if (!check.allowed) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: check.message,
          retryAfter: check.retryAfter
        }),
        {
          status: 429, // Too Many Requests
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': check.retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': check.resetTime.toString()
          }
        }
      )
    };
  }
  
  return {
    allowed: true,
    headers: {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': check.remaining.toString(),
      'X-RateLimit-Reset': check.resetTime.toString()
    }
  };
}

/**
 * Decorator-style rate limiter for cleaner code
 * 
 * Usage:
 * const handler = withRateLimit(
 *   async (request) => { ... },
 *   RATE_LIMITS.SUBMIT
 * );
 */
export function withRateLimit(handler, config = RATE_LIMITS.READ) {
  return async (request, ...args) => {
    const rateLimitCheck = await rateLimit(request, config);
    
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck.response;
    }
    
    // Call original handler
    const response = await handler(request, ...args);
    
    // Add rate limit headers to response
    if (response instanceof Response) {
      Object.entries(rateLimitCheck.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }
    
    return response;
  };
}

/**
 * Get rate limit status for a client (for monitoring)
 */
export function getRateLimitStatus(request, config = RATE_LIMITS.READ) {
  const check = checkRateLimit(request, config);
  return {
    limit: config.maxRequests,
    remaining: check.remaining,
    resetTime: check.resetTime,
    resetTimeFormatted: new Date(check.resetTime).toISOString()
  };
}

/**
 * Clear rate limit for a specific client (admin function)
 * Use with caution!
 */
export function clearRateLimit(ip, prefix = 'ip') {
  const key = `${prefix}:${ip}:`;
  let cleared = 0;
  
  for (const [storedKey] of requestStore.entries()) {
    if (storedKey.startsWith(key)) {
      requestStore.delete(storedKey);
      cleared++;
    }
  }
  
  return cleared;
}

/**
 * Get statistics about rate limiting (for monitoring dashboard)
 */
export function getRateLimitStats() {
  return {
    totalClients: requestStore.size,
    oldestEntry: Array.from(requestStore.values())
      .reduce((min, data) => Math.min(min, data.resetTime), Date.now()),
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
  };
}