-- ============================================
-- DIAGNOSE MANUAL ENTRY DATA LOADING ISSUE
-- ============================================
-- This script investigates why manual entry 21BCON750
-- shows department statuses when it shouldn't
-- ============================================

-- CRITICAL QUESTION: Where is the "approved" status coming from?
-- Possible sources:
-- 1. no_dues_status table (department statuses)
-- 2. no_dues_forms.status field (form overall status)
-- 3. Convocation table
-- 4. Realtime subscription caching
-- 5. Frontend state management

-- ============================================
-- CHECK 1: VERIFY 21BCON750 IN DATABASE
-- ============================================
\echo '========================================'
\echo 'CHECK 1: 21BCON750 in no_dues_forms'
\echo '========================================'

SELECT 
  id,
  registration_no,
  student_name,
  status as form_status,
  is_manual_entry,
  created_at,
  updated_at,
  manual_certificate_url,
  rejection_reason
FROM no_dues_forms
WHERE registration_no = '21BCON750';

-- ============================================
-- CHECK 2: DEPARTMENT STATUSES FOR 21BCON750
-- ============================================
\echo ''
\echo '========================================'
\echo 'CHECK 2: Department statuses (SHOULD BE EMPTY)'
\echo '========================================'

SELECT 
  ns.id,
  ns.form_id,
  ns.department_name,
  ns.status,
  ns.rejection_reason,
  ns.created_at,
  ns.updated_at,
  d.display_name,
  d.is_active
FROM no_dues_status ns
LEFT JOIN departments d ON d.name = ns.department_name
WHERE ns.form_id IN (
  SELECT id FROM no_dues_forms WHERE registration_no = '21BCON750'
)
ORDER BY ns.created_at;

-- ============================================
-- CHECK 3: ALL MANUAL ENTRIES WITH STATUSES
-- ============================================
\echo ''
\echo '========================================'
\echo 'CHECK 3: All manual entries (should have NO dept statuses)'
\echo '========================================'

SELECT 
  nf.registration_no,
  nf.student_name,
  nf.status as form_status,
  nf.is_manual_entry,
  COUNT(ns.id) as dept_status_count,
  STRING_AGG(ns.department_name || ':' || ns.status, ', ') as dept_statuses
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON ns.form_id = nf.id
WHERE nf.is_manual_entry = true
GROUP BY nf.id, nf.registration_no, nf.student_name, nf.status, nf.is_manual_entry
ORDER BY nf.created_at DESC;

-- ============================================
-- CHECK 4: CONVOCATION DATA
-- ============================================
\echo ''
\echo '========================================'
\echo 'CHECK 4: Convocation eligible students'
\echo '========================================'

SELECT 
  registration_no,
  student_name,
  school,
  admission_year,
  status as convocation_status,
  form_id,
  created_at
FROM convocation_eligible_students
WHERE registration_no = '21BCON750';

-- ============================================
-- CHECK 5: BACKUP TABLES (if exists)
-- ============================================
\echo ''
\echo '========================================'
\echo 'CHECK 5: Check if data exists in backups'
\echo '========================================'

-- Check if backup tables exist
SELECT 
  'BACKUP TABLES EXIST' as check_result,
  COUNT(*) FILTER (WHERE table_name = 'no_dues_forms_backup_cleanup') as forms_backup,
  COUNT(*) FILTER (WHERE table_name = 'no_dues_status_backup_cleanup') as status_backup
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('no_dues_forms_backup_cleanup', 'no_dues_status_backup_cleanup');

-- If backup exists, check what 21BCON750 looked like before
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'no_dues_status_backup_cleanup') THEN
    
    RAISE NOTICE '';
    RAISE NOTICE '📋 21BCON750 in backup (BEFORE cleanup):';
    
    PERFORM * FROM (
      SELECT 
        ns.department_name,
        ns.status,
        ns.created_at
      FROM no_dues_status_backup_cleanup ns
      WHERE ns.form_id IN (
        SELECT id FROM no_dues_forms_backup_cleanup WHERE registration_no = '21BCON750'
      )
    ) backup_data;
    
  ELSE
    RAISE NOTICE 'No backup tables found';
  END IF;
END $$;

-- ============================================
-- CHECK 6: DATABASE TRIGGER STATUS
-- ============================================
\echo ''
\echo '========================================'
\echo 'CHECK 6: Verify trigger that creates statuses'
\echo '========================================'

SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%department%' 
   OR trigger_name LIKE '%status%'
   OR trigger_name LIKE '%manual%'
ORDER BY trigger_name;

-- ============================================
-- CHECK 7: RECENT INSERTS/UPDATES
-- ============================================
\echo ''
\echo '========================================'
\echo 'CHECK 7: Recent activity on 21BCON750'
\echo '========================================'

-- Check forms table
SELECT 
  'FORM UPDATES' as activity_type,
  registration_no,
  status,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_ago
FROM no_dues_forms
WHERE registration_no = '21BCON750';

-- Check status table
SELECT 
  'STATUS UPDATES' as activity_type,
  ns.department_name,
  ns.status,
  ns.created_at,
  ns.updated_at,
  EXTRACT(EPOCH FROM (NOW() - ns.updated_at))/60 as minutes_ago
FROM no_dues_status ns
WHERE ns.form_id IN (
  SELECT id FROM no_dues_forms WHERE registration_no = '21BCON750'
)
ORDER BY ns.updated_at DESC;

-- ============================================
-- CHECK 8: REALTIME PUBLICATION
-- ============================================
\echo ''
\echo '========================================'
\echo 'CHECK 8: Realtime publication settings'
\echo '========================================'

SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('no_dues_forms', 'no_dues_status')
ORDER BY tablename;

-- ============================================
-- CHECK 9: ROW LEVEL SECURITY
-- ============================================
\echo ''
\echo '========================================'
\echo 'CHECK 9: RLS Policies on tables'
\echo '========================================'

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('no_dues_forms', 'no_dues_status')
ORDER BY tablename, policyname;

-- ============================================
-- SOLUTION RECOMMENDATIONS
-- ============================================
\echo ''
\echo '========================================'
\echo 'DIAGNOSIS COMPLETE - RECOMMENDATIONS'
\echo '========================================'

DO $$
DECLARE
  manual_with_statuses INTEGER;
  reg_21_status_count INTEGER;
BEGIN
  -- Count manual entries with department statuses
  SELECT COUNT(DISTINCT nf.id) INTO manual_with_statuses
  FROM no_dues_forms nf
  JOIN no_dues_status ns ON ns.form_id = nf.id
  WHERE nf.is_manual_entry = true;
  
  -- Count statuses for 21BCON750
  SELECT COUNT(*) INTO reg_21_status_count
  FROM no_dues_status ns
  WHERE ns.form_id IN (
    SELECT id FROM no_dues_forms WHERE registration_no = '21BCON750'
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 DIAGNOSIS SUMMARY:';
  RAISE NOTICE '====================';
  RAISE NOTICE 'Manual entries with dept statuses: %', manual_with_statuses;
  RAISE NOTICE '21BCON750 department status count: %', reg_21_status_count;
  RAISE NOTICE '';
  
  IF manual_with_statuses > 0 THEN
    RAISE NOTICE '❌ PROBLEM FOUND: Manual entries have department statuses!';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 SOLUTION: Run this SQL to fix:';
    RAISE NOTICE 'DELETE FROM no_dues_status WHERE form_id IN (';
    RAISE NOTICE '  SELECT id FROM no_dues_forms WHERE is_manual_entry = true';
    RAISE NOTICE ');';
  ELSE
    RAISE NOTICE '✅ DATABASE IS CLEAN: No manual entries have dept statuses';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 ISSUE IS LIKELY IN:';
    RAISE NOTICE '1. Frontend caching (check browser cache/local storage)';
    RAISE NOTICE '2. API route returning wrong data';
    RAISE NOTICE '3. Realtime subscription showing old data';
    RAISE NOTICE '4. StatusTracker component logic';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📝 NEXT STEPS:';
  RAISE NOTICE '1. Check API: /api/check-status?registration_no=21BCON750';
  RAISE NOTICE '2. Check API: /api/student/check-status (POST with reg no)';
  RAISE NOTICE '3. Clear browser cache and test again';
  RAISE NOTICE '4. Check Supabase realtime dashboard for active subscriptions';
  RAISE NOTICE '5. Review StatusTracker.jsx component logic';
END $$;

-- ============================================
-- EMERGENCY FIX (IF NEEDED)
-- ============================================
\echo ''
\echo '========================================'
\echo 'EMERGENCY FIX (uncomment if needed)'
\echo '========================================'

-- Uncomment these lines to force-delete department statuses from manual entries:

-- DELETE FROM no_dues_status 
-- WHERE form_id IN (
--   SELECT id FROM no_dues_forms WHERE is_manual_entry = true
-- );

-- RAISE NOTICE 'Manual entry department statuses deleted!';