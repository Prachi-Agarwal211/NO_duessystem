-- ============================================
-- COMPLETE DATABASE CLEANUP AND FIX
-- ============================================
-- Purpose: Clean up ALL existing forms, fix inconsistencies, and reset system
-- This addresses:
-- 1. Manual entries with department statuses
-- 2. Online forms with missing/incorrect statuses
-- 3. Convocation list issues
-- 4. Storage bucket cleanup
-- 5. Data consistency fixes
-- ============================================

-- ============================================
-- PART 1: ANALYZE CURRENT STATE
-- ============================================

-- Check all forms status
SELECT 
  '📊 CURRENT STATE ANALYSIS' as info,
  is_manual_entry,
  status,
  COUNT(*) as count,
  STRING_AGG(DISTINCT registration_no, ', ') as sample_reg_nos
FROM no_dues_forms
GROUP BY is_manual_entry, status
ORDER BY is_manual_entry, status;

-- Check department statuses
SELECT 
  '📊 DEPARTMENT STATUS ANALYSIS' as info,
  nf.is_manual_entry,
  ns.status,
  COUNT(*) as count
FROM no_dues_status ns
JOIN no_dues_forms nf ON ns.form_id = nf.id
GROUP BY nf.is_manual_entry, ns.status
ORDER BY nf.is_manual_entry, ns.status;

-- ============================================
-- PART 2: BACKUP CURRENT DATA (Optional - for safety)
-- ============================================

-- Create backup tables
CREATE TABLE IF NOT EXISTS no_dues_forms_backup_20251213 AS 
SELECT * FROM no_dues_forms;

CREATE TABLE IF NOT EXISTS no_dues_status_backup_20251213 AS 
SELECT * FROM no_dues_status;

SELECT '✅ Backup tables created' as info;

-- ============================================
-- PART 3: CLEAN UP MANUAL ENTRIES
-- ============================================

DO $$
DECLARE
  deleted_manual_statuses INTEGER;
  manual_forms_count INTEGER;
BEGIN
  -- Count manual entries
  SELECT COUNT(*) INTO manual_forms_count
  FROM no_dues_forms
  WHERE is_manual_entry = true;
  
  RAISE NOTICE '📋 Found % manual entries', manual_forms_count;
  
  -- Delete ALL department statuses for manual entries
  DELETE FROM no_dues_status
  WHERE form_id IN (
    SELECT id FROM no_dues_forms WHERE is_manual_entry = true
  );
  
  GET DIAGNOSTICS deleted_manual_statuses = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % spurious department statuses from manual entries', deleted_manual_statuses;
END $$;

-- ============================================
-- PART 4: FIX ONLINE FORMS - ENSURE ALL HAVE DEPARTMENT STATUSES
-- ============================================

DO $$
DECLARE
  form_record RECORD;
  dept_record RECORD;
  status_count INTEGER;
  forms_fixed INTEGER := 0;
BEGIN
  -- Loop through all online forms
  FOR form_record IN 
    SELECT id, registration_no 
    FROM no_dues_forms 
    WHERE (is_manual_entry = false OR is_manual_entry IS NULL)
  LOOP
    -- Check if this form has any department status records
    SELECT COUNT(*) INTO status_count
    FROM no_dues_status
    WHERE form_id = form_record.id;
    
    -- If no status records exist, create them
    IF status_count = 0 THEN
      RAISE NOTICE '🔧 Creating department statuses for online form: %', form_record.registration_no;
      forms_fixed := forms_fixed + 1;
      
      -- Create status record for each active department
      FOR dept_record IN 
        SELECT name FROM departments WHERE is_active = true
      LOOP
        INSERT INTO no_dues_status (
          form_id,
          department_name,
          status,
          created_at
        ) VALUES (
          form_record.id,
          dept_record.name,
          'pending',
          NOW()
        );
      END LOOP;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Fixed % online forms with missing department statuses', forms_fixed;
END $$;

-- ============================================
-- PART 5: FIX CONVOCATION LIST ISSUES
-- ============================================

-- Update any forms that should reference convocation data
DO $$
DECLARE
  form_rec RECORD;
  conv_rec RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- Loop through forms that match convocation list
  FOR form_rec IN 
    SELECT nf.id, nf.registration_no, nf.student_name, nf.admission_year
    FROM no_dues_forms nf
    WHERE nf.registration_no IN (
      SELECT registration_no FROM convocation_eligible_students
    )
  LOOP
    -- Get convocation data
    SELECT * INTO conv_rec
    FROM convocation_eligible_students
    WHERE registration_no = form_rec.registration_no;
    
    -- Update form with convocation data if different
    IF conv_rec IS NOT NULL AND (
      form_rec.student_name != conv_rec.student_name OR 
      form_rec.admission_year != conv_rec.admission_year
    ) THEN
      UPDATE no_dues_forms
      SET 
        student_name = COALESCE(conv_rec.student_name, student_name),
        admission_year = COALESCE(conv_rec.admission_year, admission_year),
        school = COALESCE(conv_rec.school, school),
        updated_at = NOW()
      WHERE id = form_rec.id;
      
      updated_count := updated_count + 1;
      RAISE NOTICE '✅ Updated form % with convocation data', form_rec.registration_no;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Updated % forms with convocation data', updated_count;
END $$;

-- ============================================
-- PART 6: FIX FORM STATUS CONSISTENCY
-- ============================================

-- Fix forms where status doesn't match department approval status
DO $$
DECLARE
  form_rec RECORD;
  approved_count INTEGER;
  rejected_count INTEGER;
  total_depts INTEGER;
  new_status TEXT;
  fixed_count INTEGER := 0;
BEGIN
  -- Get total active departments
  SELECT COUNT(*) INTO total_depts FROM departments WHERE is_active = true;
  
  -- Check each online form
  FOR form_rec IN 
    SELECT id, registration_no, status
    FROM no_dues_forms 
    WHERE (is_manual_entry = false OR is_manual_entry IS NULL)
  LOOP
    -- Count department statuses
    SELECT 
      COUNT(*) FILTER (WHERE status = 'approved'),
      COUNT(*) FILTER (WHERE status = 'rejected')
    INTO approved_count, rejected_count
    FROM no_dues_status
    WHERE form_id = form_rec.id;
    
    -- Determine correct status
    new_status := NULL;
    
    IF approved_count = total_depts THEN
      new_status := 'completed';
    ELSIF rejected_count > 0 THEN
      new_status := 'rejected';
    ELSE
      new_status := 'pending';
    END IF;
    
    -- Update if different
    IF new_status IS NOT NULL AND new_status != form_rec.status THEN
      UPDATE no_dues_forms
      SET status = new_status, updated_at = NOW()
      WHERE id = form_rec.id;
      
      fixed_count := fixed_count + 1;
      RAISE NOTICE '🔧 Fixed status for %: % -> %', form_rec.registration_no, form_rec.status, new_status;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Fixed status for % online forms', fixed_count;
END $$;

-- ============================================
-- PART 7: CLEAN UP ORPHANED RECORDS
-- ============================================

-- Delete department statuses without parent forms
DELETE FROM no_dues_status
WHERE form_id NOT IN (SELECT id FROM no_dues_forms);

-- Delete department statuses for non-existent departments
DELETE FROM no_dues_status
WHERE department_name NOT IN (SELECT name FROM departments);

SELECT '✅ Cleaned up orphaned records' as info;

-- ============================================
-- PART 8: FIX EMPTY/INVALID DATA
-- ============================================

-- Fix forms with empty or placeholder emails
UPDATE no_dues_forms
SET 
  personal_email = registration_no || '@student.temp',
  college_email = registration_no || '@jecrc.temp'
WHERE 
  is_manual_entry = true AND
  (personal_email IS NULL OR personal_email = '' OR personal_email LIKE '%@manual.temp');

-- Fix forms with invalid contact numbers
UPDATE no_dues_forms
SET contact_no = '0000000000'
WHERE 
  is_manual_entry = true AND
  (contact_no IS NULL OR contact_no = '' OR LENGTH(contact_no) < 10);

SELECT '✅ Fixed empty/invalid data fields' as info;

-- ============================================
-- PART 9: VERIFICATION QUERIES
-- ============================================

-- Verify manual entries have NO department statuses
SELECT 
  '✅ VERIFICATION: Manual entries' as check_type,
  COUNT(DISTINCT nf.id) as manual_forms_count,
  COUNT(ns.id) as dept_status_count,
  CASE WHEN COUNT(ns.id) = 0 THEN '✅ CLEAN' ELSE '❌ NEEDS FIX' END as status
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON nf.id = ns.form_id
WHERE nf.is_manual_entry = true;

-- Verify online forms HAVE department statuses
SELECT 
  '✅ VERIFICATION: Online forms' as check_type,
  COUNT(DISTINCT nf.id) as online_forms_count,
  COUNT(ns.id) as dept_status_count,
  ROUND(COUNT(ns.id)::DECIMAL / NULLIF(COUNT(DISTINCT nf.id), 0), 0) as avg_statuses_per_form,
  CASE WHEN COUNT(ns.id) > 0 THEN '✅ HAS STATUSES' ELSE '❌ MISSING STATUSES' END as status
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON nf.id = ns.form_id
WHERE (nf.is_manual_entry = false OR nf.is_manual_entry IS NULL);

-- Check forms without any department status (should be 0 for online forms)
SELECT 
  '⚠️  VERIFICATION: Forms without department statuses' as check_type,
  COUNT(*) as count,
  STRING_AGG(registration_no, ', ') as registration_numbers,
  CASE WHEN COUNT(*) = 0 THEN '✅ ALL ONLINE FORMS HAVE STATUSES' ELSE '❌ SOME MISSING' END as status
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON nf.id = ns.form_id
WHERE (nf.is_manual_entry = false OR nf.is_manual_entry IS NULL)
AND ns.id IS NULL;

-- Summary by status
SELECT 
  '📊 FINAL STATUS SUMMARY' as info,
  is_manual_entry,
  status,
  COUNT(*) as count
FROM no_dues_forms
GROUP BY ROLLUP(is_manual_entry, status)
ORDER BY is_manual_entry NULLS LAST, status NULLS LAST;

-- Department status distribution
SELECT 
  '📊 DEPARTMENT STATUS DISTRIBUTION' as info,
  department_name,
  status,
  COUNT(*) as count
FROM no_dues_status
GROUP BY ROLLUP(department_name, status)
ORDER BY department_name NULLS LAST, status NULLS LAST;

-- Specific check for 21BCON750
SELECT 
  '🎯 CHECK SPECIFIC STUDENT: 21BCON750' as info,
  nf.registration_no,
  nf.student_name,
  nf.status as form_status,
  nf.is_manual_entry,
  COUNT(ns.id) as dept_status_count,
  CASE 
    WHEN nf.is_manual_entry = true AND COUNT(ns.id) = 0 THEN '✅ CORRECT (no dept statuses)'
    WHEN nf.is_manual_entry = false AND COUNT(ns.id) > 0 THEN '✅ CORRECT (has dept statuses)'
    ELSE '❌ INCORRECT'
  END as validation_status
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON nf.id = ns.form_id
WHERE nf.registration_no = '21BCON750'
GROUP BY nf.id, nf.registration_no, nf.student_name, nf.status, nf.is_manual_entry;

-- ============================================
-- PART 10: STORAGE BUCKET CLEANUP QUERY
-- ============================================
-- Note: This query identifies orphaned files but cannot delete from storage directly
-- You need to run the cleanup in the application code or Supabase dashboard

SELECT 
  '📦 STORAGE FILES TO REVIEW' as info,
  COUNT(*) as total_files_referenced,
  COUNT(DISTINCT 
    CASE 
      WHEN certificate_url IS NOT NULL THEN certificate_url
      WHEN manual_certificate_url IS NOT NULL THEN manual_certificate_url
      WHEN alumni_screenshot_url IS NOT NULL THEN alumni_screenshot_url
    END
  ) as unique_files
FROM no_dues_forms;

-- ============================================
-- COMPLETION SUMMARY
-- ============================================

SELECT 
  '✅ CLEANUP COMPLETE!' as status,
  NOW() as completed_at;

SELECT 
  '📋 NEXT STEPS:' as info,
  '1. Review verification queries above' as step_1,
  '2. Check storage bucket in Supabase dashboard' as step_2,
  '3. Deploy code changes from earlier' as step_3,
  '4. Test with 21BCON750 and other students' as step_4;

-- ============================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================
/*
To rollback this cleanup:

-- Restore from backup
TRUNCATE no_dues_forms;
INSERT INTO no_dues_forms SELECT * FROM no_dues_forms_backup_20251213;

TRUNCATE no_dues_status;
INSERT INTO no_dues_status SELECT * FROM no_dues_status_backup_20251213;

-- Drop backup tables
DROP TABLE IF EXISTS no_dues_forms_backup_20251213;
DROP TABLE IF EXISTS no_dues_status_backup_20251213;
*/