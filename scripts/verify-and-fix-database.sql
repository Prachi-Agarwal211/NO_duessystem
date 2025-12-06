-- ============================================================================
-- VERIFY AND FIX DATABASE INTEGRITY
-- ============================================================================
-- This script checks for data corruption and fixes common issues
-- Run this in Supabase SQL Editor to ensure database health
-- ============================================================================

-- 1. CHECK FOR ORPHANED RECORDS
-- Find no_dues_status records without corresponding forms
SELECT 
  'Orphaned Status Records' as check_name,
  COUNT(*) as count
FROM no_dues_status nds
LEFT JOIN no_dues_forms ndf ON nds.form_id = ndf.id
WHERE ndf.id IS NULL;

-- 2. CHECK FOR MISSING STATUS RECORDS
-- Forms that should have status records but don't
SELECT 
  'Forms Missing Status Records' as check_name,
  ndf.id,
  ndf.registration_no,
  ndf.student_name,
  ndf.created_at
FROM no_dues_forms ndf
WHERE NOT EXISTS (
  SELECT 1 FROM no_dues_status 
  WHERE form_id = ndf.id
)
ORDER BY ndf.created_at DESC;

-- 3. CHECK DEPARTMENT COUNT PER FORM
-- Each form should have status records for all active departments
SELECT 
  ndf.id,
  ndf.registration_no,
  ndf.student_name,
  COUNT(nds.id) as status_count,
  (SELECT COUNT(*) FROM departments WHERE is_active = true) as expected_count,
  CASE 
    WHEN COUNT(nds.id) = (SELECT COUNT(*) FROM departments WHERE is_active = true) 
    THEN '✅ OK'
    ELSE '❌ MISSING'
  END as status
FROM no_dues_forms ndf
LEFT JOIN no_dues_status nds ON ndf.id = nds.form_id
GROUP BY ndf.id, ndf.registration_no, ndf.student_name
HAVING COUNT(nds.id) != (SELECT COUNT(*) FROM departments WHERE is_active = true)
ORDER BY ndf.created_at DESC;

-- 4. CHECK FOR DUPLICATE STATUS RECORDS
-- Each form should have only ONE status per department
SELECT 
  form_id,
  department_name,
  COUNT(*) as duplicate_count
FROM no_dues_status
GROUP BY form_id, department_name
HAVING COUNT(*) > 1;

-- 5. CHECK DATA INTEGRITY
-- Verify foreign key relationships
SELECT 
  'Invalid School References' as check_name,
  COUNT(*) as count
FROM no_dues_forms
WHERE school_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM config_schools WHERE id = no_dues_forms.school_id);

SELECT 
  'Invalid Course References' as check_name,
  COUNT(*) as count
FROM no_dues_forms
WHERE course_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM config_courses WHERE id = no_dues_forms.course_id);

SELECT 
  'Invalid Branch References' as check_name,
  COUNT(*) as count
FROM no_dues_forms
WHERE branch_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM config_branches WHERE id = no_dues_forms.branch_id);

-- ============================================================================
-- FIX SECTION - Uncomment to apply fixes
-- ============================================================================

-- FIX 1: Remove orphaned status records
-- DELETE FROM no_dues_status 
-- WHERE form_id NOT IN (SELECT id FROM no_dues_forms);

-- FIX 2: Create missing status records for existing forms
-- This will create status records for any forms that are missing them
-- INSERT INTO no_dues_status (form_id, department_name, status, created_at, updated_at)
-- SELECT 
--   ndf.id as form_id,
--   d.name as department_name,
--   'pending' as status,
--   NOW() as created_at,
--   NOW() as updated_at
-- FROM no_dues_forms ndf
-- CROSS JOIN departments d
-- WHERE d.is_active = true
--   AND NOT EXISTS (
--     SELECT 1 FROM no_dues_status nds 
--     WHERE nds.form_id = ndf.id 
--       AND nds.department_name = d.name
--   );

-- FIX 3: Remove duplicate status records (keeps the latest one)
-- DELETE FROM no_dues_status nds1
-- WHERE EXISTS (
--   SELECT 1 FROM no_dues_status nds2
--   WHERE nds1.form_id = nds2.form_id
--     AND nds1.department_name = nds2.department_name
--     AND nds1.id < nds2.id
-- );

-- ============================================================================
-- VERIFY REALTIME IS ENABLED
-- ============================================================================

SELECT 
  'Realtime Status' as check_name,
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('no_dues_forms', 'no_dues_status')
ORDER BY tablename;

-- Expected output: Should show 2 rows
-- If not, run: scripts/enable-realtime.sql

-- ============================================================================
-- CHECK REPLICA IDENTITY (Important for Realtime Updates)
-- ============================================================================

SELECT
  n.nspname as schemaname,
  c.relname as tablename,
  CASE c.relreplident
    WHEN 'd' THEN 'default (primary key)'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full (all columns)'
    WHEN 'i' THEN 'index'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('no_dues_forms', 'no_dues_status')
ORDER BY c.relname;

-- Both should be 'full' for realtime to work properly
-- If not, run:
-- ALTER TABLE no_dues_forms REPLICA IDENTITY FULL;
-- ALTER TABLE no_dues_status REPLICA IDENTITY FULL;

-- ============================================================================
-- PERFORMANCE CHECK
-- ============================================================================

-- Check table sizes
SELECT
  t.schemaname,
  t.tablename,
  pg_size_pretty(pg_total_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename))) AS size,
  pg_total_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename)) AS size_bytes
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN ('no_dues_forms', 'no_dues_status', 'departments', 'profiles')
ORDER BY size_bytes DESC;

-- Check for missing indexes
SELECT
  'Missing Indexes Check' as check_name,
  s.schemaname,
  s.tablename,
  s.attname as column_name
FROM pg_stats s
WHERE s.schemaname = 'public'
  AND s.tablename IN ('no_dues_forms', 'no_dues_status')
  AND s.n_distinct < 0  -- Indicates high cardinality
ORDER BY s.tablename, s.attname;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
  'Database Health Summary' as report,
  (SELECT COUNT(*) FROM no_dues_forms) as total_forms,
  (SELECT COUNT(*) FROM no_dues_status) as total_status_records,
  (SELECT COUNT(*) FROM departments WHERE is_active = true) as active_departments,
  (SELECT COUNT(*) FROM profiles WHERE role IN ('admin', 'department')) as staff_users,
  (SELECT COUNT(*) FROM no_dues_forms WHERE status = 'completed') as completed_forms,
  (SELECT COUNT(*) FROM no_dues_forms WHERE status = 'pending') as pending_forms;

-- ============================================================================
-- DONE
-- ============================================================================
-- Review the output above to identify any issues
-- Uncomment and run the FIX sections if problems are found
-- ============================================================================