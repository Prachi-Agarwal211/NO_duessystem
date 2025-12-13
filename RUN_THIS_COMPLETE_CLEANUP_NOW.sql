-- ============================================
-- COMPLETE SYSTEM CLEANUP - RUN IN SUPABASE SQL EDITOR
-- ============================================
-- This is a ONE-TIME deep cleanup script
-- Run this directly in Supabase SQL Editor
-- 
-- What this does:
-- 1. Backs up all data (safety)
-- 2. Removes manual entry department statuses
-- 3. Fixes online forms with missing statuses
-- 4. Syncs convocation data
-- 5. Fixes form status consistency
-- 6. Cleans orphaned records
-- 7. Fixes empty/invalid data
-- 8. Lists storage files for manual cleanup
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🚀 STARTING COMPLETE SYSTEM CLEANUP';
  RAISE NOTICE '==================================';
END $$;

-- ============================================
-- STEP 1: CREATE SAFETY BACKUPS
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📦 STEP 1: Creating safety backups...';
END $$;

DROP TABLE IF EXISTS no_dues_forms_backup_cleanup CASCADE;
DROP TABLE IF EXISTS no_dues_status_backup_cleanup CASCADE;

CREATE TABLE no_dues_forms_backup_cleanup AS 
SELECT * FROM no_dues_forms;

CREATE TABLE no_dues_status_backup_cleanup AS 
SELECT * FROM no_dues_status;

DO $$
BEGIN
  RAISE NOTICE '✅ Backups created: no_dues_forms_backup_cleanup, no_dues_status_backup_cleanup';
END $$;

-- ============================================
-- STEP 2: ANALYZE CURRENT STATE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 STEP 2: Analyzing current state...';
END $$;

SELECT 
  '📊 FORMS BY TYPE AND STATUS' as info,
  COALESCE(is_manual_entry, false) as is_manual,
  status,
  COUNT(*) as count
FROM no_dues_forms
GROUP BY COALESCE(is_manual_entry, false), status
ORDER BY is_manual, status;

SELECT 
  '📊 DEPARTMENT STATUSES BY TYPE' as info,
  COALESCE(nf.is_manual_entry, false) as is_manual,
  ns.status,
  COUNT(*) as count
FROM no_dues_status ns
JOIN no_dues_forms nf ON ns.form_id = nf.id
GROUP BY COALESCE(nf.is_manual_entry, false), ns.status
ORDER BY is_manual, ns.status;

-- ============================================
-- STEP 3: CLEAN MANUAL ENTRY DEPARTMENT STATUSES
-- ============================================
DO $$
DECLARE
  deleted_count INTEGER;
  manual_forms_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  STEP 3: Removing department statuses from manual entries...';
  
  -- Count manual entries
  SELECT COUNT(*) INTO manual_forms_count
  FROM no_dues_forms
  WHERE is_manual_entry = true;
  
  RAISE NOTICE '📋 Found % manual entries', manual_forms_count;
  
  -- Delete spurious department statuses
  DELETE FROM no_dues_status
  WHERE form_id IN (
    SELECT id FROM no_dues_forms WHERE is_manual_entry = true
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % spurious department statuses', deleted_count;
  RAISE NOTICE '✅ Manual entry cleanup complete';
END $$;

-- ============================================
-- STEP 4: FIX ONLINE FORMS - ADD MISSING DEPARTMENT STATUSES
-- ============================================
DO $$
DECLARE
  form_record RECORD;
  dept_record RECORD;
  status_count INTEGER;
  forms_fixed INTEGER := 0;
  total_depts INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 STEP 4: Adding missing department statuses to online forms...';
  
  -- Get active department count
  SELECT COUNT(*) INTO total_depts FROM departments WHERE is_active = true;
  RAISE NOTICE '📋 Active departments: %', total_depts;
  
  -- Loop through online forms
  FOR form_record IN 
    SELECT id, registration_no 
    FROM no_dues_forms 
    WHERE (is_manual_entry = false OR is_manual_entry IS NULL)
  LOOP
    -- Check status count
    SELECT COUNT(*) INTO status_count
    FROM no_dues_status
    WHERE form_id = form_record.id;
    
    -- If missing statuses, create them
    IF status_count = 0 THEN
      RAISE NOTICE '🔧 Creating statuses for: %', form_record.registration_no;
      forms_fixed := forms_fixed + 1;
      
      FOR dept_record IN 
        SELECT name FROM departments WHERE is_active = true
      LOOP
        INSERT INTO no_dues_status (
          form_id, department_name, status, created_at
        ) VALUES (
          form_record.id, dept_record.name, 'pending', NOW()
        );
      END LOOP;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Fixed % online forms', forms_fixed;
END $$;

-- ============================================
-- STEP 5: SYNC CONVOCATION DATA
-- ============================================
DO $$
DECLARE
  form_rec RECORD;
  conv_rec RECORD;
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 STEP 5: Syncing convocation list data...';
  
  FOR form_rec IN 
    SELECT nf.id, nf.registration_no, nf.student_name, nf.admission_year
    FROM no_dues_forms nf
    WHERE nf.registration_no IN (
      SELECT registration_no FROM convocation_eligible_students
    )
  LOOP
    SELECT * INTO conv_rec
    FROM convocation_eligible_students
    WHERE registration_no = form_rec.registration_no;
    
    IF conv_rec IS NOT NULL AND (
      form_rec.student_name != conv_rec.student_name OR 
      COALESCE(form_rec.admission_year, '') != COALESCE(conv_rec.admission_year::text, '')
    ) THEN
      UPDATE no_dues_forms
      SET 
        student_name = COALESCE(conv_rec.student_name, student_name),
        admission_year = COALESCE(conv_rec.admission_year, admission_year),
        school = COALESCE(conv_rec.school, school),
        updated_at = NOW()
      WHERE id = form_rec.id;
      
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Updated % forms with convocation data', updated_count;
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
  
  RAISE NOTICE '✅ Fixed status for % forms', fixed_count;
END $$;

-- ============================================
-- STEP 7: CLEAN ORPHANED RECORDS
-- ============================================
DO $$
DECLARE
  deleted_statuses INTEGER;
  deleted_dept_statuses INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  STEP 7: Cleaning orphaned records...';
  
  -- Delete statuses without parent forms
  DELETE FROM no_dues_status
  WHERE form_id NOT IN (SELECT id FROM no_dues_forms);
  GET DIAGNOSTICS deleted_statuses = ROW_COUNT;
  
  -- Delete statuses for non-existent departments
  DELETE FROM no_dues_status
  WHERE department_name NOT IN (SELECT name FROM departments);
  GET DIAGNOSTICS deleted_dept_statuses = ROW_COUNT;
  
  RAISE NOTICE '✅ Deleted % orphaned statuses, % invalid department statuses', deleted_statuses, deleted_dept_statuses;
END $$;

-- ============================================
-- STEP 8: FIX EMPTY/INVALID DATA
-- ============================================
DO $$
DECLARE
  fixed_emails INTEGER;
  fixed_contacts INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 STEP 8: Fixing empty/invalid data...';
  
  -- Fix manual entries with placeholder emails
  UPDATE no_dues_forms
  SET 
    personal_email = LOWER(registration_no) || '@student.temp',
    college_email = LOWER(registration_no) || '@jecrc.temp'
  WHERE 
    is_manual_entry = true AND
    (personal_email IS NULL OR 
     personal_email = '' OR 
     personal_email LIKE '%@manual.temp');
  GET DIAGNOSTICS fixed_emails = ROW_COUNT;
  
  -- Fix invalid contact numbers
  UPDATE no_dues_forms
  SET contact_no = '0000000000'
  WHERE 
    is_manual_entry = true AND
    (contact_no IS NULL OR 
     contact_no = '' OR 
     LENGTH(contact_no) < 10);
  GET DIAGNOSTICS fixed_contacts = ROW_COUNT;
  
  RAISE NOTICE '✅ Fixed % emails, % contact numbers', fixed_emails, fixed_contacts;
END $$;

-- ============================================
-- STEP 9: VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ STEP 9: Running verification checks...';
END $$;

-- Check 1: Manual entries should have ZERO department statuses
SELECT 
  '✅ Manual Entries Check' as test,
  COUNT(*) as dept_status_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM no_dues_status ns
JOIN no_dues_forms nf ON ns.form_id = nf.id
WHERE nf.is_manual_entry = true;

-- Check 2: Online forms should ALL have department statuses
SELECT 
  '✅ Online Forms Check' as test,
  COUNT(*) as forms_without_statuses,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON nf.id = ns.form_id
WHERE (nf.is_manual_entry = false OR nf.is_manual_entry IS NULL)
AND ns.id IS NULL;

-- Check 3: Specific student 21BCON750
SELECT 
  '✅ 21BCON750 Check' as test,
  registration_no,
  student_name,
  status,
  is_manual_entry,
  (SELECT COUNT(*) FROM no_dues_status WHERE form_id = nf.id) as dept_count,
  CASE 
    WHEN is_manual_entry = true AND (SELECT COUNT(*) FROM no_dues_status WHERE form_id = nf.id) = 0 
    THEN '✅ CORRECT'
    ELSE '❌ NEEDS FIX'
  END as result
FROM no_dues_forms nf
WHERE registration_no = '21BCON750';

-- ============================================
-- STEP 10: FINAL SUMMARY
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 STEP 10: Final summary...';
END $$;

SELECT 
  '📊 FINAL FORMS SUMMARY' as info,
  COALESCE(is_manual_entry, false) as is_manual,
  status,
  COUNT(*) as count
FROM no_dues_forms
GROUP BY ROLLUP(COALESCE(is_manual_entry, false), status)
ORDER BY is_manual NULLS LAST, status NULLS LAST;

SELECT 
  '📊 FINAL DEPARTMENT STATUS SUMMARY' as info,
  department_name,
  status,
  COUNT(*) as count
FROM no_dues_status
GROUP BY ROLLUP(department_name, status)
ORDER BY department_name NULLS LAST, status NULLS LAST;

-- ============================================
-- STEP 11: STORAGE FILES LIST
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📦 STEP 11: Storage files referenced in database...';
END $$;

SELECT 
  '📦 STORAGE FILES TO KEEP' as info,
  COUNT(DISTINCT certificate_url) as certificates,
  COUNT(DISTINCT manual_certificate_url) as manual_certificates,
  COUNT(DISTINCT alumni_screenshot_url) as alumni_screenshots
FROM no_dues_forms;

-- ============================================
-- COMPLETION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================';
  RAISE NOTICE '✅ CLEANUP COMPLETE!';
  RAISE NOTICE '==================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Review verification results above';
  RAISE NOTICE '2. Check that 21BCON750 shows 0 dept_count';
  RAISE NOTICE '3. Go to Supabase Storage and manually delete orphaned files';
  RAISE NOTICE '4. Deploy code changes (StatusTracker fix)';
  RAISE NOTICE '5. Test with 21BCON750 on website';
  RAISE NOTICE '';
  RAISE NOTICE 'Rollback (if needed):';
  RAISE NOTICE 'TRUNCATE no_dues_forms; INSERT INTO no_dues_forms SELECT * FROM no_dues_forms_backup_cleanup;';
  RAISE NOTICE 'TRUNCATE no_dues_status; INSERT INTO no_dues_status SELECT * FROM no_dues_status_backup_cleanup;';
  RAISE NOTICE '';
END $$;