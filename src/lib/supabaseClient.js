import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window === 'undefined') {
    // Server-side: throw error during build
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
  } else {
    // Client-side: log error
    console.error('Missing Supabase environment variables. Please check your .env.local file.')
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
      const timeout = 10000; // 10 seconds
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
  // Mobile-optimized settings
  realtime: {
    params: {
      eventsPerSecond: 2, // Reduce realtime events for mobile
    },
  },
})
