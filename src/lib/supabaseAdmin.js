/**
 * Supabase Admin Client
 * Uses service role key for admin operations
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client lazily or return mock for build time
const supabaseAdmin = (function () {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ [SupabaseAdmin] Missing Environment Variables:', {
      url: !!url,
      key: !!key
    });

    // Return mock with status flag
    return {
      isMock: true,
      from: () => ({
        select: () => ({
          data: [],
          error: { message: 'Supabase environment variables missing on server', code: 'ENV_MISSING' }
        }),
        insert: () => ({ error: { message: 'Mock' } }),
        update: () => ({ error: { message: 'Mock' } })
      }),
      auth: { getUser: () => ({ data: { user: null } }) }
    };
  }

  console.log('✅ [SupabaseAdmin] Initializing actual Supabase client');
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
})();

// Export as both default and named for compatibility
export { supabaseAdmin };
export default supabaseAdmin;