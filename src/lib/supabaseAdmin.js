import { createClient } from '@supabase/supabase-js';

/**
 * Centralized Supabase Admin Client
 * Uses service role key to bypass RLS for server-side operations
 * 
 * SECURITY: Only use in API routes, never expose to client
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);