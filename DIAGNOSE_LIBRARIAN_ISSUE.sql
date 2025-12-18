-- ============================================================================
-- DIAGNOSTIC: Why Librarian Can't See or Reject Forms
-- ============================================================================
-- Issue: Librarian logs in, sees 0 applications, clicks reject but nothing happens
-- Form vanishes after attempted rejection
-- ============================================================================

-- ============================================================================
-- STEP 1: Check if the form exists and its status
-- ============================================================================
SELECT 
    id,
    registration_no,
    student_name,
    status,
    created_at,
    'Form exists in no_dues_forms' as note
FROM no_dues_forms
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 2: Check if status rows were created for this form
-- ============================================================================
-- This should show 7 rows (one for each department) for the most recent form
WITH latest_form AS (
    SELECT id FROM no_dues_forms ORDER BY created_at DESC LIMIT 1
)
SELECT 
    ns.form_id,
    ns.department_name,
    ns.status,
    ns.action_at,
    d.display_name as dept_display_name,
    'Status row for department' as note
FROM no_dues_status ns
JOIN departments d ON d.name = ns.department_name
WHERE ns.form_id = (SELECT id FROM latest_form)
ORDER BY d.display_order;

-- Expected: 7 rows (school_hod, library, it_department, hostel, alumni_association, accounts_department, registrar)
-- If less than 7 rows: TRIGGER FAILED TO CREATE STATUS ROWS!

-- ============================================================================
-- STEP 3: Check librarian profile and department assignment
-- ============================================================================
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.department_name,
    p.assigned_department_ids,
    'Librarian profile' as note
FROM profiles p
WHERE p.email = '15anuragsingh2003@gmail.com';

-- Expected: assigned_department_ids should contain Library department UUID

-- ============================================================================
-- STEP 4: Check if Library department exists and get its UUID
-- ============================================================================
SELECT 
    id as department_uuid,
    name as department_name,
    display_name,
    email,
    is_active,
    'Library department info' as note
FROM departments
WHERE name = 'library';

-- Expected: Should return exactly 1 row with UUID

-- ============================================================================
-- STEP 5: Check if librarian's assigned_department_ids includes library UUID
-- ============================================================================
SELECT 
    p.email,
    p.assigned_department_ids,
    d.id as library_uuid,
    d.name as library_name,
    CASE 
        WHEN p.assigned_department_ids @> ARRAY[d.id] THEN '✅ YES - Librarian IS assigned to Library'
        ELSE '❌ NO - Librarian NOT assigned to Library'
    END as assignment_status
FROM profiles p
CROSS JOIN departments d
WHERE p.email = '15anuragsingh2003@gmail.com'
AND d.name = 'library';

-- ============================================================================
-- STEP 6: Check triggers - are they active?
-- ============================================================================
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as is_enabled,
    c.relname as table_name,
    p.proname as function_name,
    'Trigger status' as note
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN ('no_dues_forms', 'no_dues_status')
AND t.tgname NOT LIKE 'RI_%' -- Exclude referential integrity triggers
ORDER BY c.relname, t.tgname;

-- Expected triggers:
-- on_form_submit -> create_department_statuses (creates 7 status rows)
-- trigger_update_convocation_status -> update_convocation_status
-- on_department_action -> update_form_status_on_department_action
-- on_status_change -> update_global_status

-- ============================================================================
-- STEP 7: Test if trigger would fire correctly NOW
-- ============================================================================
-- This shows what the trigger SHOULD create for the latest form
WITH latest_form AS (
    SELECT id FROM no_dues_forms ORDER BY created_at DESC LIMIT 1
)
SELECT 
    (SELECT id FROM latest_form) as form_id,
    d.name as department_name,
    'pending' as expected_status,
    'These rows should have been created by trigger' as note
FROM departments d
WHERE d.is_active = true
ORDER BY d.display_order;

-- ============================================================================
-- QUICK FIX: If status rows are missing, create them manually
-- ============================================================================
-- Run this ONLY if Step 2 shows less than 7 rows:

/*
WITH latest_form AS (
    SELECT id FROM no_dues_forms ORDER BY created_at DESC LIMIT 1
)
INSERT INTO no_dues_status (form_id, department_name, status)
SELECT 
    (SELECT id FROM latest_form),
    d.name,
    'pending'
FROM departments d
WHERE d.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM no_dues_status ns
    WHERE ns.form_id = (SELECT id FROM latest_form)
    AND ns.department_name = d.name
);

-- Verify the fix worked:
SELECT COUNT(*) as status_rows_created, 'Should be 7' as expected
FROM no_dues_status
WHERE form_id = (SELECT id FROM no_dues_forms ORDER BY created_at DESC LIMIT 1);
*/

-- ============================================================================
-- STEP 8: Check what the dashboard API would query
-- ============================================================================
-- This simulates what the dashboard API sees for the librarian
WITH librarian AS (
    SELECT assigned_department_ids FROM profiles WHERE email = '15anuragsingh2003@gmail.com'
),
library_dept AS (
    SELECT id, name FROM departments WHERE name = 'library'
),
dept_names AS (
    SELECT d.name
    FROM departments d
    WHERE d.id = ANY((SELECT assigned_department_ids FROM librarian))
)
SELECT 
    ns.id as status_id,
    ns.form_id,
    ns.department_name,
    ns.status,
    f.student_name,
    f.registration_no,
    'What librarian dashboard should show' as note
FROM no_dues_status ns
INNER JOIN no_dues_forms f ON f.id = ns.form_id
WHERE ns.department_name IN (SELECT name FROM dept_names)
AND ns.status = 'pending'
ORDER BY f.created_at DESC;

-- Expected: Should show pending applications for library department