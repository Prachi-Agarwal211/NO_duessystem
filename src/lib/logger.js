/**
 * Environment-aware logger utility
 * Provides structured logging with different levels and environment-based controls
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const CURRENT_LEVEL = (() => {
  const env = process.env.NODE_ENV;
  const logLevel = process.env.NEXT_PUBLIC_LOG_LEVEL;
  
  // Production: Only errors and warnings
  if (env === 'production') {
    return logLevel === 'debug' ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;
  }
  
  // Development: All logs
  return LOG_LEVELS.DEBUG;
})();

class Logger {
  constructor(context = '') {
    this.context = context;
  }

  _formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const ctx = this.context ? `[${this.context}]` : '';
    const prefix = `[${timestamp}] [${level}]${ctx}`;
    
    if (data) {
      return { prefix, message, data };
    }
    return { prefix, message };
  }

  _shouldLog(level) {
    return LOG_LEVELS[level] <= CURRENT_LEVEL;
  }

  error(message, error = null) {
    if (!this._shouldLog('ERROR')) return;
    
    const formatted = this._formatMessage('ERROR', message, error);
    console.error(formatted.prefix, formatted.message);
    
    if (error) {
      console.error('Error details:', error);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }

  warn(message, data = null) {
    if (!this._shouldLog('WARN')) return;
    
    const formatted = this._formatMessage('WARN', message, data);
    console.warn(formatted.prefix, formatted.message);
    
    if (data) {
      console.warn('Data:', data);
    }
  }

  info(message, data = null) {
    if (!this._shouldLog('INFO')) return;
    
    const formatted = this._formatMessage('INFO', message, data);
    console.log(formatted.prefix, formatted.message);
    
    if (data) {
      console.log('Data:', data);
    }
  }

  debug(message, data = null) {
    if (!this._shouldLog('DEBUG')) return;
    
    const formatted = this._formatMessage('DEBUG', message, data);
    console.log(formatted.prefix, formatted.message);
    
    if (data) {
      console.log('Data:', data);
    }
  }

  // Specialized methods for common scenarios
  apiRequest(method, endpoint, data = null) {
    this.info(`API ${method} ${endpoint}`, data);
  }

  apiResponse(method, endpoint, status, data = null) {
    if (status >= 400) {
      this.error(`API ${method} ${endpoint} failed with status ${status}`, data);
    } else {
      this.debug(`API ${method} ${endpoint} responded with ${status}`, data);
    }
  }

  realtimeEvent(event, payload = null) {
    this.debug(`Real-time event: ${event}`, payload);
  }

  dbQuery(query, params = null) {
    this.debug(`Database query: ${query}`, params);
  }

  performance(operation, duration) {
    this.info(`Performance: ${operation} took ${duration}ms`);
  }
}

// Create singleton instance
const defaultLogger = new Logger();

// Factory function to create context-specific loggers
export function createLogger(context) {
  return new Logger(context);
}

// Export default logger methods
export const logger = {
  error: (msg, data) => defaultLogger.error(msg, data),
  warn: (msg, data) => defaultLogger.warn(msg, data),
  info: (msg, data) => defaultLogger.info(msg, data),
  debug: (msg, data) => defaultLogger.debug(msg, data),
  apiRequest: (method, endpoint, data) => defaultLogger.apiRequest(method, endpoint, data),
  apiResponse: (method, endpoint, status, data) => defaultLogger.apiResponse(method, endpoint, status, data),
  realtimeEvent: (event, payload) => defaultLogger.realtimeEvent(event, payload),
  dbQuery: (query, params) => defaultLogger.dbQuery(query, params),
  performance: (operation, duration) => defaultLogger.performance(operation, duration),
};

export default logger;