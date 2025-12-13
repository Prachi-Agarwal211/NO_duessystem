-- ============================================
-- COMPLETE DATABASE RESET & CLEANUP
-- ============================================
-- This script performs a comprehensive cleanup:
-- 1. Removes ALL department statuses from manual entries
-- 2. Resets convocation table to "not_started"
-- 3. Clears form_id links in convocation
-- 4. Fixes any inconsistent data
-- 5. Provides verification
--
-- Run this in Supabase SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: BACKUP (Safety First)
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📦 STEP 1: Creating safety backups...';
END $$;

DROP TABLE IF EXISTS no_dues_forms_backup_reset CASCADE;
DROP TABLE IF EXISTS no_dues_status_backup_reset CASCADE;
DROP TABLE IF EXISTS convocation_backup_reset CASCADE;

CREATE TABLE no_dues_forms_backup_reset AS SELECT * FROM no_dues_forms;
CREATE TABLE no_dues_status_backup_reset AS SELECT * FROM no_dues_status;
CREATE TABLE convocation_backup_reset AS SELECT * FROM convocation_eligible_students;

DO $$
BEGIN
  RAISE NOTICE '✅ Backups created successfully';
END $$;

-- ============================================
-- STEP 2: ANALYZE CURRENT STATE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 STEP 2: Analyzing current state...';
END $$;

-- Show manual entries with department statuses
SELECT 
  '⚠️  Manual entries with dept statuses' as issue,
  nf.registration_no,
  nf.student_name,
  COUNT(ns.id) as status_count,
  STRING_AGG(ns.department_name, ', ') as departments
FROM no_dues_forms nf
JOIN no_dues_status ns ON ns.form_id = nf.id
WHERE nf.is_manual_entry = true
GROUP BY nf.id, nf.registration_no, nf.student_name;

-- Show convocation records with issues
SELECT 
  '📊 Convocation records status' as info,
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE form_id IS NOT NULL) as with_form_id
FROM convocation_eligible_students
GROUP BY status
ORDER BY status;

-- ============================================
-- STEP 3: DELETE MANUAL ENTRY DEPARTMENT STATUSES
-- ============================================
DO $$
DECLARE
  deleted_count INTEGER;
  manual_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  STEP 3: Deleting department statuses from manual entries...';
  
  -- Count manual entries
  SELECT COUNT(*) INTO manual_count
  FROM no_dues_forms
  WHERE is_manual_entry = true;
  
  RAISE NOTICE '📋 Found % manual entries', manual_count;
  
  -- Delete ALL department statuses for manual entries
  DELETE FROM no_dues_status
  WHERE form_id IN (
    SELECT id FROM no_dues_forms WHERE is_manual_entry = true
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Deleted % department statuses', deleted_count;
END $$;

-- ============================================
-- STEP 4: RESET CONVOCATION TABLE
-- ============================================
DO $$
DECLARE
  reset_count INTEGER;
  total_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎓 STEP 4: Resetting convocation table...';
  
  SELECT COUNT(*) INTO total_count
  FROM convocation_eligible_students;
  
  RAISE NOTICE '📋 Found % total convocation records', total_count;
  
  -- Reset ALL convocation records to "not_started" and clear form_id
  UPDATE convocation_eligible_students
  SET 
    status = 'not_started',
    form_id = NULL,
    updated_at = NOW()
  WHERE status != 'not_started' OR form_id IS NOT NULL;
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RAISE NOTICE '✅ Reset % convocation records to "not_started"', reset_count;
  RAISE NOTICE '✅ Cleared % form_id links', reset_count;
END $$;

-- ============================================
-- STEP 5: FIX ORPHANED RECORDS
-- ============================================
DO $$
DECLARE
  orphaned_statuses INTEGER;
  invalid_dept_statuses INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 STEP 5: Cleaning orphaned records...';
  
  -- Delete statuses without parent forms
  DELETE FROM no_dues_status
  WHERE form_id NOT IN (SELECT id FROM no_dues_forms);
  GET DIAGNOSTICS orphaned_statuses = ROW_COUNT;
  
  -- Delete statuses for non-existent departments
  DELETE FROM no_dues_status
  WHERE department_name NOT IN (SELECT name FROM departments);
  GET DIAGNOSTICS invalid_dept_statuses = ROW_COUNT;
  
  RAISE NOTICE '✅ Deleted % orphaned statuses', orphaned_statuses;
  RAISE NOTICE '✅ Deleted % invalid department statuses', invalid_dept_statuses;
END $$;

-- ============================================
-- STEP 6: FIX FORM STATUS CONSISTENCY
-- ============================================
DO $$
DECLARE
  form_rec RECORD;
  approved_count INTEGER;
  rejected_count INTEGER;
  total_depts INTEGER;
  new_status TEXT;
  fixed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 STEP 6: Fixing form status consistency...';
  
  SELECT COUNT(*) INTO total_depts FROM departments WHERE is_active = true;
  RAISE NOTICE '📋 Active departments: %', total_depts;
  
  -- Only fix online forms (manual entries stay as-is)
  FOR form_rec IN 
    SELECT id, registration_no, status
    FROM no_dues_forms 
    WHERE (is_manual_entry = false OR is_manual_entry IS NULL)
  LOOP
    SELECT 
      COUNT(*) FILTER (WHERE status = 'approved'),
      COUNT(*) FILTER (WHERE status = 'rejected')
    INTO approved_count, rejected_count
    FROM no_dues_status
    WHERE form_id = form_rec.id;
    
    new_status := NULL;
    IF approved_count = total_depts THEN
      new_status := 'completed';
    ELSIF rejected_count > 0 THEN
      new_status := 'rejected';
    ELSE
      new_status := 'pending';
    END IF;
    
    IF new_status IS NOT NULL AND new_status != form_rec.status THEN
      UPDATE no_dues_forms
      SET status = new_status, updated_at = NOW()
      WHERE id = form_rec.id;
      fixed_count := fixed_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Fixed status for % online forms', fixed_count;
END $$;

-- ============================================
-- STEP 7: VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ STEP 7: Running verification...';
END $$;

-- Check 1: Manual entries should have ZERO department statuses
SELECT 
  '✅ CHECK 1: Manual Entries' as test,
  COUNT(*) as dept_status_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - No dept statuses'
    ELSE '❌ FAIL - Still has dept statuses'
  END as result
FROM no_dues_status ns
JOIN no_dues_forms nf ON ns.form_id = nf.id
WHERE nf.is_manual_entry = true;

-- Check 2: Convocation records should all be "not_started" with no form_id
SELECT 
  '✅ CHECK 2: Convocation Reset' as test,
  COUNT(*) FILTER (WHERE status != 'not_started') as wrong_status_count,
  COUNT(*) FILTER (WHERE form_id IS NOT NULL) as has_form_id_count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status != 'not_started' OR form_id IS NOT NULL) = 0 
    THEN '✅ PASS - All reset'
    ELSE '❌ FAIL - Some not reset'
  END as result
FROM convocation_eligible_students;

-- Check 3: Specific check for 21BCON750
SELECT 
  '✅ CHECK 3: 21BCON750' as test,
  nf.registration_no,
  nf.student_name,
  nf.status,
  nf.is_manual_entry,
  COUNT(ns.id) as dept_status_count,
  CASE 
    WHEN nf.is_manual_entry = true AND COUNT(ns.id) = 0 
    THEN '✅ PASS - Correct'
    WHEN nf.is_manual_entry = true AND COUNT(ns.id) > 0 
    THEN '❌ FAIL - Has dept statuses'
    ELSE '⚠️  Not a manual entry'
  END as result
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON ns.form_id = nf.id
WHERE nf.registration_no = '21BCON750'
GROUP BY nf.id, nf.registration_no, nf.student_name, nf.status, nf.is_manual_entry;

-- Check 4: Online forms should have department statuses
SELECT 
  '✅ CHECK 4: Online Forms' as test,
  COUNT(*) as forms_without_statuses,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - All have statuses'
    ELSE '⚠️  Some forms missing statuses'
  END as result
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON nf.id = ns.form_id
WHERE (nf.is_manual_entry = false OR nf.is_manual_entry IS NULL)
AND ns.id IS NULL;

-- ============================================
-- STEP 8: SUMMARY
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================';
  RAISE NOTICE '✅ CLEANUP COMPLETE!';
  RAISE NOTICE '==================================';
  RAISE NOTICE '';
  RAISE NOTICE 'What was done:';
  RAISE NOTICE '1. ✅ Deleted ALL department statuses from manual entries';
  RAISE NOTICE '2. ✅ Reset ALL convocation records to "not_started"';
  RAISE NOTICE '3. ✅ Cleared ALL form_id links in convocation';
  RAISE NOTICE '4. ✅ Fixed orphaned records';
  RAISE NOTICE '5. ✅ Fixed form status consistency';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Review verification results above';
  RAISE NOTICE '2. Clear browser cache/localStorage';
  RAISE NOTICE '3. Test with 21BCON750 on website';
  RAISE NOTICE '4. Run: node scripts/cleanup-database-complete.js (optional)';
  RAISE NOTICE '';
  RAISE NOTICE 'Rollback (if needed):';
  RAISE NOTICE 'TRUNCATE no_dues_forms CASCADE;';
  RAISE NOTICE 'INSERT INTO no_dues_forms SELECT * FROM no_dues_forms_backup_reset;';
  RAISE NOTICE 'TRUNCATE no_dues_status CASCADE;';
  RAISE NOTICE 'INSERT INTO no_dues_status SELECT * FROM no_dues_status_backup_reset;';
  RAISE NOTICE 'TRUNCATE convocation_eligible_students CASCADE;';
  RAISE NOTICE 'INSERT INTO convocation_eligible_students SELECT * FROM convocation_backup_reset;';
  RAISE NOTICE '';
END $$;

-- Final summary query
SELECT 
  '📊 FINAL SUMMARY' as info,
  (SELECT COUNT(*) FROM no_dues_forms WHERE is_manual_entry = true) as manual_entries,
  (SELECT COUNT(*) FROM no_dues_status WHERE form_id IN (
    SELECT id FROM no_dues_forms WHERE is_manual_entry = true
  )) as manual_dept_statuses,
  (SELECT COUNT(*) FROM convocation_eligible_students WHERE status = 'not_started') as convocation_reset,
  (SELECT COUNT(*) FROM convocation_eligible_students WHERE form_id IS NULL) as convocation_no_form_id;

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 DATABASE CLEANUP SUCCESSFUL!';
  RAISE NOTICE '';
END $$;