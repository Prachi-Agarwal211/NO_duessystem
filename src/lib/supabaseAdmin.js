/**
 * Supabase Admin Client
 * Uses service role key for admin operations
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client lazily or return mock for build time
const supabaseAdmin = (function () {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Return mock if envs missing (build time)
    return {
      from: () => ({ select: () => ({ data: [], error: null }), insert: () => ({ error: null }), update: () => ({ error: null }) }),
      auth: { getUser: () => ({ data: { user: null } }) }
    };
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
})();

// Export as both default and named for compatibility
export { supabaseAdmin };
export default supabaseAdmin;