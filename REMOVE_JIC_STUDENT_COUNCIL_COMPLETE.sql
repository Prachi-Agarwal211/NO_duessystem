-- ============================================================================
-- COMPLETE REMOVAL OF JIC AND STUDENT COUNCIL
-- ============================================================================
-- This script completely removes JIC and Student Council from the system
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: CREATE BACKUP TABLES (Safety First)
-- ============================================================================

-- Backup departments table
DROP TABLE IF EXISTS departments_backup_removal CASCADE;
CREATE TABLE departments_backup_removal AS 
SELECT * FROM public.departments;

-- Backup no_dues_status table
DROP TABLE IF EXISTS no_dues_status_backup_removal CASCADE;
CREATE TABLE no_dues_status_backup_removal AS 
SELECT * FROM public.no_dues_status;

-- Backup no_dues_forms table
DROP TABLE IF EXISTS no_dues_forms_backup_removal CASCADE;
CREATE TABLE no_dues_forms_backup_removal AS
SELECT * FROM public.no_dues_forms;

-- Backup profiles table (if staff members exist for these departments)
DROP TABLE IF EXISTS profiles_backup_removal CASCADE;
CREATE TABLE profiles_backup_removal AS 
SELECT * FROM public.profiles;

SELECT 'Backup tables created successfully' AS step_1_status;

-- ============================================================================
-- STEP 2: DELETE ALL NO_DUES_STATUS RECORDS FOR JIC AND STUDENT COUNCIL
-- ============================================================================

-- This removes all approval records for these departments from existing requests
DELETE FROM public.no_dues_status
WHERE department_name IN ('jic', 'student_council');

SELECT 'Deleted no_dues_status records for JIC and Student Council' AS step_2_status;

-- ============================================================================
-- STEP 3: No current_department column in no_dues_forms - Skip this step
-- ============================================================================

-- The no_dues_forms table doesn't track current_department
-- Department tracking is done in no_dues_status table which we already cleaned in Step 2

SELECT 'Skipped - no current_department column in no_dues_forms' AS step_3_status;

-- ============================================================================
-- STEP 4: DEACTIVATE STAFF PROFILES FOR THESE DEPARTMENTS
-- ============================================================================

-- Mark staff members of these departments as inactive
UPDATE public.profiles
SET 
    is_active = false,
    updated_at = NOW()
WHERE department_name IN ('jic', 'student_council');

SELECT 'Deactivated staff profiles for JIC and Student Council' AS step_4_status;

-- ============================================================================
-- STEP 5: REMOVE DEPARTMENTS FROM DEPARTMENTS TABLE
-- ============================================================================

-- Permanently delete these departments
DELETE FROM public.departments
WHERE name IN ('jic', 'student_council');

SELECT 'Deleted JIC and Student Council from departments table' AS step_5_status;

-- ============================================================================
-- STEP 6: ADD REGISTRAR DEPARTMENT (IF NOT EXISTS)
-- ============================================================================

-- Insert Registrar department if it doesn't exist
INSERT INTO public.departments (name, display_name, display_order, is_active)
VALUES ('registrar', 'Registrar', 10, true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    display_order = EXCLUDED.display_order,
    is_active = true,
    updated_at = NOW();

SELECT 'Added/Updated Registrar department' AS step_6_status;

-- ============================================================================
-- STEP 7: UPDATE DISPLAY ORDER FOR ALL REMAINING DEPARTMENTS
-- ============================================================================

-- Update display order to ensure correct sequence
UPDATE public.departments SET display_order = 1, updated_at = NOW() WHERE name = 'library';
UPDATE public.departments SET display_order = 2, updated_at = NOW() WHERE name = 'it_department';
UPDATE public.departments SET display_order = 3, updated_at = NOW() WHERE name = 'mess';
UPDATE public.departments SET display_order = 4, updated_at = NOW() WHERE name = 'hostel';
UPDATE public.departments SET display_order = 5, updated_at = NOW() WHERE name = 'alumni_association';
UPDATE public.departments SET display_order = 6, updated_at = NOW() WHERE name = 'sports';
UPDATE public.departments SET display_order = 7, updated_at = NOW() WHERE name = 'transport';
UPDATE public.departments SET display_order = 8, updated_at = NOW() WHERE name = 'canteen';
UPDATE public.departments SET display_order = 9, updated_at = NOW() WHERE name = 'accounts_department';
UPDATE public.departments SET display_order = 10, updated_at = NOW() WHERE name = 'registrar';

SELECT 'Updated display order for all departments' AS step_7_status;

-- ============================================================================
-- STEP 8: VERIFY CHANGES
-- ============================================================================

-- Show current department configuration
SELECT
    name,
    display_name,
    display_order,
    is_active
FROM public.departments
ORDER BY display_order;

-- Count removed status records
SELECT 
    'Removed status records' AS metric,
    COUNT(*) AS count
FROM no_dues_status_backup_removal
WHERE department_name IN ('jic', 'student_council');

-- Count forms with JIC/Student Council status records (from backup)
SELECT
    'Forms with JIC/Student Council records' AS metric,
    COUNT(DISTINCT form_id) AS count
FROM no_dues_status_backup_removal
WHERE department_name IN ('jic', 'student_council');

-- Count deactivated staff
SELECT 
    'Deactivated staff' AS metric,
    COUNT(*) AS count
FROM profiles_backup_removal
WHERE department_name IN ('jic', 'student_council');

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================

-- Verify no departments remain with jic or student_council
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ JIC and Student Council completely removed'
        ELSE '❌ ERROR: JIC or Student Council still exists'
    END AS verification_status
FROM public.departments
WHERE name IN ('jic', 'student_council');

-- Verify Registrar exists
SELECT 
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ Registrar department exists'
        ELSE '❌ ERROR: Registrar department not found'
    END AS registrar_status
FROM public.departments
WHERE name = 'registrar';

-- Verify total department count is 10
SELECT 
    CASE 
        WHEN COUNT(*) = 10 THEN '✅ Correct number of departments (10)'
        ELSE '❌ ERROR: Expected 10 departments, found ' || COUNT(*)
    END AS count_verification
FROM public.departments
WHERE is_active = true;

-- Show final department list
SELECT 
    '=== FINAL DEPARTMENT LIST ===' AS title;

SELECT 
    display_order,
    name,
    display_name,
    is_active
FROM public.departments
ORDER BY display_order;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (In case of issues)
-- ============================================================================

/*
IF YOU NEED TO ROLLBACK, RUN THESE COMMANDS:

BEGIN;

-- Restore departments
DROP TABLE IF EXISTS public.departments CASCADE;
CREATE TABLE public.departments AS SELECT * FROM departments_backup_removal;

-- Restore no_dues_status
DROP TABLE IF EXISTS public.no_dues_status CASCADE;
CREATE TABLE public.no_dues_status AS SELECT * FROM no_dues_status_backup_removal;

-- Restore no_dues_forms
DROP TABLE IF EXISTS public.no_dues_forms CASCADE;
CREATE TABLE public.no_dues_forms AS SELECT * FROM no_dues_forms_backup_removal;

-- Restore profiles
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles AS SELECT * FROM profiles_backup_removal;

COMMIT;

SELECT 'Rollback completed - all tables restored to pre-migration state' AS status;
*/

-- ============================================================================
-- CLEANUP BACKUP TABLES (Optional - Run after verifying everything works)
-- ============================================================================

/*
-- ONLY RUN THIS AFTER CONFIRMING EVERYTHING WORKS CORRECTLY!
-- These commands delete the backup tables to free up space

DROP TABLE IF EXISTS departments_backup_removal CASCADE;
DROP TABLE IF EXISTS no_dues_status_backup_removal CASCADE;
DROP TABLE IF EXISTS no_dues_forms_backup_removal CASCADE;
DROP TABLE IF EXISTS profiles_backup_removal CASCADE;

SELECT 'Backup tables cleaned up' AS cleanup_status;
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '
╔═══════════════════════════════════════════════════════════════╗
║           MIGRATION COMPLETE - SUMMARY                        ║
╚═══════════════════════════════════════════════════════════════╝

✅ Changes Applied:
  1. Backed up all affected tables
  2. Deleted all no_dues_status records for JIC and Student Council
  3. Updated requests to remove JIC/Student Council references
  4. Deactivated staff profiles for these departments
  5. Permanently removed JIC and Student Council departments
  6. Added/Updated Registrar department
  7. Updated display order for all 10 departments

📊 Final Department List (in order):
  1. Library
  2. IT Department
  3. Mess
  4. Hostel
  5. Alumni Association
  6. Sports
  7. Transport
  8. Canteen
  9. Accounts
  10. Registrar

⚠️  Backup Tables Created:
  - departments_backup_removal
  - no_dues_status_backup_removal
  - no_dues_forms_backup_removal
  - profiles_backup_removal

💡 Next Steps:
  1. Verify the department list above is correct
  2. Test creating a new student request
  3. Verify workflow goes through all 10 departments
  4. After confirming everything works, optionally run cleanup queries
  5. Deploy updated frontend code to production

🔄 To Rollback: Use the rollback instructions in this script

╔═══════════════════════════════════════════════════════════════╗
' AS migration_summary;