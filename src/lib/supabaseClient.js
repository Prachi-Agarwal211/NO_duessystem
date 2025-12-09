import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Creates a safe Supabase client that doesn't crash when environment variables are missing
 * Returns a mock client with helpful error messages instead of undefined values
 */
const createSafeClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
    
    // Return mock client to prevent crashes
    return {
      auth: {
        getSession: () => Promise.reject(new Error('Supabase not configured. Please check environment variables.')),
        signInWithPassword: () => Promise.reject(new Error('Supabase not configured. Please check environment variables.')),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => Promise.reject(new Error('Supabase not configured. Please check environment variables.')),
        insert: () => Promise.reject(new Error('Supabase not configured. Please check environment variables.')),
        update: () => Promise.reject(new Error('Supabase not configured. Please check environment variables.')),
        delete: () => Promise.reject(new Error('Supabase not configured. Please check environment variables.')),
        upsert: () => Promise.reject(new Error('Supabase not configured. Please check environment variables.')),
      }),
      storage: {
        from: () => ({
          upload: () => Promise.reject(new Error('Supabase not configured. Please check environment variables.')),
          download: () => Promise.reject(new Error('Supabase not configured. Please check environment variables.')),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }),
      },
    };
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'jecrc-no-dues-auth',
    },
    global: {
      headers: {
        'X-Client-Info': 'jecrc-no-dues-system',
        'apikey': supabaseAnonKey
      },
      fetch: (url, options = {}) => {
        // ✅ OPTIMIZATION: Reduced timeout for faster failures
        const timeout = 10000; // 10 seconds (was 15s)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
          // ✅ OPTIMIZATION: Add keepalive for better connection pooling
          keepalive: true,
        }).finally(() => clearTimeout(timeoutId));
      },
    },
    db: {
      schema: 'public',
    },
    // ✅ REALTIME CONFIGURATION - OPTIMIZED FOR PRODUCTION (PRESERVES FUNCTIONALITY)
    realtime: {
      params: {
        eventsPerSecond: 20, // ✅ Increased from 10 to 20 for better throughput (was 2)
      },
      // ✅ OPTIMIZATION: Increased heartbeat interval to reduce overhead
      heartbeatIntervalMs: 30000, // 30s (good balance)
      // ✅ OPTIMIZATION: Faster initial reconnects, then backoff
      reconnectAfterMs: (tries) => {
        // Exponential backoff: 500ms, 1s, 2s, 4s, max 8s (faster than before)
        return Math.min(500 * Math.pow(2, tries), 8000);
      },
      // ✅ OPTIMIZATION: Log reconnection attempts for debugging
      logger: typeof window !== 'undefined' && process.env.NODE_ENV === 'development'
        ? console.log
        : undefined,
    },
  });
};

export const supabase = createSafeClient();
