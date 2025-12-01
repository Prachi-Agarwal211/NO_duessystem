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
    headers: { 'X-Client-Info': 'jecrc-no-dues-system' },
    fetch: (url, options = {}) => {
      // Add timeout for mobile connections
      const timeout: 15000; // 15 seconds for better stability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
  db: {
    schema: 'public',
  },
  // REALTIME CONFIGURATION - OPTIMIZED FOR PRODUCTION
  realtime: {
    params: {
      eventsPerSecond: 10, // ✅ Increased from 2 to 10 for better real-time performance
    },
    // Enable heartbeat to maintain connection
    heartbeatIntervalMs: 30000,
    // Reconnect settings
    reconnectAfterMs: (tries) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
      return Math.min(1000 * Math.pow(2, tries), 10000);
    },
  },
  });
};

export const supabase = createSafeClient();
