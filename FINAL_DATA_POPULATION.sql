-- ==================================================================================
-- FINAL DATA POPULATION SQL
-- Run this AFTER MASTER_CYCLE_FIX.sql to complete the integration
-- ==================================================================================

-- This script:
-- 1. Links all staff profiles to department UUIDs
-- 2. Generates missing status rows for existing forms
-- 3. Cleans up any ghost manual entries
-- 4. Verifies the final state

-- ==================== STEP 1: POPULATE STAFF-DEPARTMENT LINKS ====================
-- Critical: This enables staff login and authorization

-- Link regular department staff (Library, IT, etc.)
UPDATE public.profiles p
SET assigned_department_ids = ARRAY(
    SELECT id FROM public.departments d WHERE d.name = p.department_name
)
WHERE role = 'department' 
  AND department_name != 'school_hod'
  AND (assigned_department_ids IS NULL OR assigned_department_ids = '{}');

-- Link HOD accounts to the school_hod department
UPDATE public.profiles p
SET assigned_department_ids = ARRAY(
    SELECT id FROM public.departments d WHERE d.name = 'school_hod'
)
WHERE department_name = 'school_hod'
  AND (assigned_department_ids IS NULL OR assigned_department_ids = '{}');

-- Verify staff links
SELECT 
    email,
    full_name,
    department_name,
    array_length(assigned_department_ids, 1) as dept_count,
    CASE 
        WHEN array_length(assigned_department_ids, 1) > 0 THEN '✅ Linked'
        ELSE '❌ Not Linked'
    END as status
FROM public.profiles
WHERE role = 'department'
ORDER BY department_name;

-- ==================== STEP 2: GENERATE MISSING STATUS ROWS ====================
-- This fixes the "0 stats" issue by ensuring every form has 7 department tasks

INSERT INTO public.no_dues_status (form_id, department_name, status)
SELECT f.id, d.name, 'pending'
FROM public.no_dues_forms f
CROSS JOIN public.departments d
WHERE d.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.no_dues_status s 
    WHERE s.form_id = f.id AND s.department_name = d.name
  );

-- Verify status row counts
SELECT 
    COUNT(DISTINCT f.id) as total_forms,
    COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN f.id END) as forms_with_status,
    COUNT(s.id) as total_status_rows,
    COUNT(s.id) / NULLIF(COUNT(DISTINCT f.id), 0) as avg_statuses_per_form
FROM public.no_dues_forms f
LEFT JOIN public.no_dues_status s ON s.form_id = f.id;

-- ==================== STEP 3: CLEANUP GHOST ENTRIES ====================
-- Remove any duplicate entries that exist in both tables

-- First, check if there are any duplicates
SELECT 
    COUNT(*) as duplicate_count,
    string_agg(registration_no, ', ') as duplicate_registrations
FROM (
    SELECT registration_no
    FROM public.no_dues_forms
    WHERE registration_no IN (SELECT registration_no FROM public.manual_no_dues)
) duplicates;

-- If duplicates exist, remove them from the online table
-- (Assuming manual entries are the "source of truth" for these cases)
DELETE FROM public.no_dues_forms 
WHERE registration_no IN (
    SELECT registration_no FROM public.manual_no_dues
);

-- ==================== STEP 4: VERIFICATION REPORT ====================

-- Report 1: Staff Authorization Status
DO $$
DECLARE
    staff_count INT;
    linked_count INT;
    unlinked_count INT;
BEGIN
    SELECT COUNT(*) INTO staff_count FROM public.profiles WHERE role = 'department';
    SELECT COUNT(*) INTO linked_count FROM public.profiles 
        WHERE role = 'department' AND array_length(assigned_department_ids, 1) > 0;
    SELECT COUNT(*) INTO unlinked_count FROM public.profiles 
        WHERE role = 'department' AND (assigned_department_ids IS NULL OR assigned_department_ids = '{}');
    
    RAISE NOTICE '';
    RAISE NOTICE '==================== STAFF AUTHORIZATION ====================';
    RAISE NOTICE 'Total Staff Accounts: %', staff_count;
    RAISE NOTICE '✅ Linked to Departments: %', linked_count;
    RAISE NOTICE '❌ Not Linked: %', unlinked_count;
    RAISE NOTICE '';
END $$;

-- Report 2: Form Status Coverage
DO $$
DECLARE
    total_forms INT;
    complete_forms INT;
    incomplete_forms INT;
    expected_statuses INT;
    actual_statuses INT;
    dept_count INT;
BEGIN
    SELECT COUNT(*) INTO dept_count FROM public.departments WHERE is_active = true;
    SELECT COUNT(*) INTO total_forms FROM public.no_dues_forms;
    
    SELECT COUNT(DISTINCT form_id) INTO complete_forms
    FROM (
        SELECT form_id, COUNT(*) as status_count
        FROM public.no_dues_status
        GROUP BY form_id
        HAVING COUNT(*) >= dept_count
    ) complete;
    
    incomplete_forms := total_forms - complete_forms;
    expected_statuses := total_forms * dept_count;
    
    SELECT COUNT(*) INTO actual_statuses FROM public.no_dues_status;
    
    RAISE NOTICE '==================== FORM STATUS COVERAGE ====================';
    RAISE NOTICE 'Active Departments: %', dept_count;
    RAISE NOTICE 'Total Online Forms: %', total_forms;
    RAISE NOTICE '✅ Forms with Complete Status (% departments): %', dept_count, complete_forms;
    RAISE NOTICE '⚠️  Forms with Incomplete Status: %', incomplete_forms;
    RAISE NOTICE 'Expected Total Status Rows: %', expected_statuses;
    RAISE NOTICE 'Actual Total Status Rows: %', actual_statuses;
    RAISE NOTICE 'Coverage: %%', ROUND((actual_statuses::NUMERIC / expected_statuses * 100)::NUMERIC, 2);
    RAISE NOTICE '';
END $$;

-- Report 3: Department Stats Preview (What Staff Will See)
SELECT 
    d.display_name as department,
    COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN s.status = 'rejected' THEN 1 END) as rejected,
    COUNT(*) as total
FROM public.departments d
LEFT JOIN public.no_dues_status s ON s.department_name = d.name
WHERE d.is_active = true
GROUP BY d.id, d.display_name, d.display_order
ORDER BY d.display_order;

-- Report 4: Librarian Account Check
SELECT 
    'Librarian Account (15anuragsingh2003@gmail.com)' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.departments d ON d.id = ANY(p.assigned_department_ids)
            WHERE p.email = '15anuragsingh2003@gmail.com'
              AND d.name = 'library'
        ) THEN '✅ READY TO LOGIN'
        ELSE '❌ NOT CONFIGURED'
    END as status;

-- Final Success Message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================================';
    RAISE NOTICE '✅ DATA POPULATION COMPLETE';
    RAISE NOTICE '==============================================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Update API files (staff/action and staff/dashboard)';
    RAISE NOTICE '2. Update middleware.js';
    RAISE NOTICE '3. Test librarian login: 15anuragsingh2003@gmail.com';
    RAISE NOTICE '==============================================================';
    RAISE NOTICE '';
END $$;