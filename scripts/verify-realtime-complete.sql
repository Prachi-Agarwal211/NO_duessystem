-- ============================================================================
-- COMPLETE REALTIME VERIFICATION FOR NO DUES SYSTEM
-- ============================================================================
-- Run this in Supabase SQL Editor to verify all realtime configurations
-- ============================================================================

-- ============================================================================
-- PART 1: CHECK REALTIME PUBLICATION
-- ============================================================================
SELECT 
  '✅ CHECK 1: Realtime Publication Status' as check_name;

SELECT 
  schemaname,
  tablename,
  pubname,
  CASE 
    WHEN pubname = 'supabase_realtime' THEN '✅ ENABLED'
    ELSE '❌ NOT ENABLED'
  END as status
FROM pg_publication_tables
WHERE tablename IN ('no_dues_forms', 'no_dues_status')
ORDER BY tablename;

-- Expected: 2 rows with supabase_realtime
-- If missing, run: ALTER PUBLICATION supabase_realtime ADD TABLE no_dues_forms;
--                  ALTER PUBLICATION supabase_realtime ADD TABLE no_dues_status;

-- ============================================================================
-- PART 2: CHECK REPLICA IDENTITY (CRITICAL FOR UPDATES)
-- ============================================================================
SELECT 
  '✅ CHECK 2: Replica Identity (Must be FULL for realtime)' as check_name;

SELECT
  n.nspname as schema,
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'd' THEN '⚠️  DEFAULT (primary key only)'
    WHEN 'n' THEN '❌ NOTHING'
    WHEN 'f' THEN '✅ FULL (all columns)'
    WHEN 'i' THEN '⚠️  INDEX'
  END as replica_identity,
  CASE c.relreplident
    WHEN 'f' THEN '✅ OK'
    ELSE '❌ NEEDS FIX'
  END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('no_dues_forms', 'no_dues_status')
ORDER BY c.relname;

-- Both must show 'FULL' for realtime UPDATE events to work
-- If not, run: ALTER TABLE no_dues_forms REPLICA IDENTITY FULL;
--              ALTER TABLE no_dues_status REPLICA IDENTITY FULL;

-- ============================================================================
-- PART 3: CHECK DATABASE TRIGGERS (Automatic Status Management)
-- ============================================================================
SELECT 
  '✅ CHECK 3: Database Triggers' as check_name;

SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE tgtype & 1
    WHEN 1 THEN 'ROW'
    ELSE 'STATEMENT'
  END as level,
  CASE tgtype & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as timing,
  CASE tgtype & 28
    WHEN 4 THEN 'INSERT'
    WHEN 8 THEN 'DELETE'
    WHEN 16 THEN 'UPDATE'
    WHEN 20 THEN 'INSERT, UPDATE'
    WHEN 28 THEN 'INSERT, UPDATE, DELETE'
    ELSE 'OTHER'
  END as events,
  CASE tgenabled
    WHEN 'O' THEN '✅ ENABLED'
    WHEN 'D' THEN '❌ DISABLED'
    WHEN 'R' THEN '⚠️  REPLICA'
    WHEN 'A' THEN '⚠️  ALWAYS'
  END as status
FROM pg_trigger
WHERE tgrelid IN (
  'no_dues_forms'::regclass,
  'no_dues_status'::regclass
)
AND tgname NOT LIKE 'RI_%' -- Exclude foreign key triggers
ORDER BY tgrelid::regclass::text, tgname;

-- Expected triggers:
-- 1. trigger_create_department_statuses ON no_dues_forms (AFTER INSERT)
-- 2. trigger_update_form_status ON no_dues_status (AFTER UPDATE)

-- ============================================================================
-- PART 4: CHECK RLS POLICIES (Row Level Security)
-- ============================================================================
SELECT 
  '✅ CHECK 4: Row Level Security Policies' as check_name;

SELECT 
  schemaname,
  tablename,
  policyname,
  CASE
    WHEN roles @> ARRAY['anon'] THEN '✅ PUBLIC ACCESS'
    WHEN roles @> ARRAY['authenticated'] THEN '🔒 AUTH ONLY'
    ELSE '🔐 RESTRICTED'
  END as access_level,
  cmd as command
FROM pg_policies
WHERE tablename IN ('no_dues_forms', 'no_dues_status')
ORDER BY tablename, policyname;

-- Policies should allow:
-- - anon: SELECT (for realtime subscription)
-- - authenticated: SELECT, INSERT, UPDATE (for dashboard operations)

-- ============================================================================
-- PART 5: TEST DATA INTEGRITY
-- ============================================================================
SELECT 
  '✅ CHECK 5: Data Integrity' as check_name;

-- Check for forms without status records
SELECT 
  'Forms Missing Status Records' as issue,
  COUNT(*) as count
FROM no_dues_forms ndf
WHERE NOT EXISTS (
  SELECT 1 FROM no_dues_status 
  WHERE form_id = ndf.id
);

-- Check for orphaned status records
SELECT 
  'Orphaned Status Records' as issue,
  COUNT(*) as count
FROM no_dues_status nds
WHERE NOT EXISTS (
  SELECT 1 FROM no_dues_forms 
  WHERE id = nds.form_id
);

-- ============================================================================
-- PART 6: SYSTEM SUMMARY
-- ============================================================================
SELECT 
  '✅ CHECK 6: System Summary' as check_name;

SELECT 
  (SELECT COUNT(*) FROM no_dues_forms) as total_forms,
  (SELECT COUNT(*) FROM no_dues_forms WHERE status = 'pending') as pending_forms,
  (SELECT COUNT(*) FROM no_dues_forms WHERE status = 'completed') as completed_forms,
  (SELECT COUNT(*) FROM no_dues_forms WHERE status = 'rejected') as rejected_forms,
  (SELECT COUNT(*) FROM no_dues_status) as total_status_records,
  (SELECT COUNT(*) FROM no_dues_status WHERE status = 'pending') as pending_statuses,
  (SELECT COUNT(*) FROM no_dues_status WHERE status = 'approved') as approved_statuses,
  (SELECT COUNT(*) FROM no_dues_status WHERE status = 'rejected') as rejected_statuses,
  (SELECT COUNT(*) FROM departments WHERE is_active = true) as active_departments;

-- ============================================================================
-- QUICK FIX COMMANDS (Uncomment if needed)
-- ============================================================================

-- Enable Realtime (if not enabled):
-- ALTER PUBLICATION supabase_realtime ADD TABLE no_dues_forms;
-- ALTER PUBLICATION supabase_realtime ADD TABLE no_dues_status;

-- Set Replica Identity to FULL (if not set):
-- ALTER TABLE no_dues_forms REPLICA IDENTITY FULL;
-- ALTER TABLE no_dues_status REPLICA IDENTITY FULL;

-- Grant SELECT for realtime (if needed):
-- GRANT SELECT ON no_dues_forms TO anon, authenticated;
-- GRANT SELECT ON no_dues_status TO anon, authenticated;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================
-- ✅ = Working correctly
-- ⚠️  = Might cause issues, check if intentional
-- ❌ = Needs fixing

-- All checks should show ✅ for realtime to work properly
-- ============================================================================