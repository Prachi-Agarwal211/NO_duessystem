import { createClient } from '@supabase/supabase-js';

/**
 * Centralized Supabase Admin Client
 * Uses service role key to bypass RLS for server-side operations
 *
 * SECURITY: Only use in API routes, never expose to client
 */

// Create the client instance immediately (not lazily)
// This ensures it works with both dynamic imports and static imports during build
const supabaseAdminInstance = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Get the Supabase Admin client
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseAdmin() {
  return supabaseAdminInstance;
}

// Backward compatibility: Export both patterns
export const supabaseAdmin = supabaseAdminInstance;

// Default export for maximum compatibility
export default supabaseAdminInstance;