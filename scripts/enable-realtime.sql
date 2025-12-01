-- ============================================================================
-- ENABLE SUPABASE REALTIME FOR NO DUES SYSTEM
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor to enable real-time functionality
-- Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT/editor
-- ============================================================================

-- 1. Enable Realtime on no_dues_forms table
-- This allows real-time updates when forms are submitted or updated
ALTER PUBLICATION supabase_realtime ADD TABLE no_dues_forms;

-- 2. Enable Realtime on no_dues_status table
-- This allows real-time updates when departments approve/reject
ALTER PUBLICATION supabase_realtime ADD TABLE no_dues_status;

-- 3. Verify Realtime is enabled (optional check)
SELECT 
  schemaname,
  tablename,
  pubname
FROM 
  pg_publication_tables
WHERE 
  pubname = 'supabase_realtime'
  AND tablename IN ('no_dues_forms', 'no_dues_status')
ORDER BY 
  tablename;

-- ============================================================================
-- EXPECTED OUTPUT:
-- You should see two rows:
--   public | no_dues_forms  | supabase_realtime
--   public | no_dues_status | supabase_realtime
-- ============================================================================

-- 4. Grant SELECT permission for Realtime (if needed)
GRANT SELECT ON no_dues_forms TO anon, authenticated;
GRANT SELECT ON no_dues_status TO anon, authenticated;

-- ============================================================================
-- NOTES:
-- - This enables real-time subscriptions for all INSERT, UPDATE, DELETE events
-- - Events will be broadcast to all connected clients
-- - RLS policies still apply (users can only see data they have access to)
-- - Changes take effect immediately after running this script
-- ============================================================================

-- 5. Check if Realtime extension is enabled (should already be enabled)
SELECT * FROM pg_extension WHERE extname = 'supabase_realtime';

-- If not enabled, run:
-- CREATE EXTENSION IF NOT EXISTS supabase_realtime;

COMMIT;

-- ============================================================================
-- TESTING REALTIME:
-- After running this script:
-- 1. Open browser console on your app
-- 2. You should see: "✅ [Dashboard] subscribed to real-time updates"
-- 3. Submit a form or make a status change
-- 4. Console should log: "🔔 New form submission detected" or "🔄 Form updated"
-- ============================================================================