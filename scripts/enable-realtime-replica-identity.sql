-- ========================================
-- Enable Realtime with REPLICA IDENTITY
-- ========================================
-- This ensures ALL column values are sent in realtime events
-- Required for proper event delivery and filtering

-- Set REPLICA IDENTITY to FULL for no_dues_forms
-- This sends complete row data in realtime events
ALTER TABLE no_dues_forms REPLICA IDENTITY FULL;

-- Set REPLICA IDENTITY to FULL for no_dues_status
-- This sends complete row data in realtime events
ALTER TABLE no_dues_status REPLICA IDENTITY FULL;

-- Verify the settings
SELECT 
  schemaname,
  tablename,
  CASE relreplident
    WHEN 'd' THEN 'DEFAULT (primary key only)'
    WHEN 'n' THEN 'NOTHING'
    WHEN 'f' THEN 'FULL (all columns)'
    WHEN 'i' THEN 'INDEX'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('no_dues_forms', 'no_dues_status')
ORDER BY c.relname;

-- Verify realtime publication includes our tables
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('no_dues_forms', 'no_dues_status')
ORDER BY tablename;

-- Expected output for replica_identity:
-- Both tables should show 'FULL (all columns)'

-- Expected output for publication:
-- public | no_dues_forms  | supabase_realtime
-- public | no_dues_status | supabase_realtime