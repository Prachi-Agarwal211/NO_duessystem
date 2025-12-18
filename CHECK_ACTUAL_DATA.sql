-- ============================================
-- DIAGNOSE WHY STATS ARE SHOWING 0
-- ============================================

-- 1. Check if we have any forms at all
SELECT 
    'Total Forms' as check_type,
    COUNT(*) as count,
    json_agg(json_build_object(
        'id', id,
        'registration_no', registration_no,
        'status', status,
        'created_at', created_at
    )) as sample_data
FROM no_dues_forms;

-- 2. Check if we have any status records
SELECT 
    'Total Status Records' as check_type,
    COUNT(*) as count
FROM no_dues_status;

-- 3. Check status records by department
SELECT 
    department_name,
    status,
    COUNT(*) as count
FROM no_dues_status
GROUP BY department_name, status
ORDER BY department_name, status;

-- 4. Check the librarian's profile and assigned departments
SELECT 
    'Librarian Profile' as check_type,
    id as profile_id,
    email,
    department_name,
    assigned_department_ids,
    role
FROM profiles
WHERE email = '15anuragsingh2003@gmail.com';

-- 5. Check which department IDs exist
SELECT 
    id as department_id,
    name as department_name,
    display_name
FROM departments
ORDER BY display_order;

-- 6. Check if status records exist for library department
SELECT 
    'Library Status Records' as check_type,
    s.id,
    s.department_name,
    s.status,
    s.form_id,
    f.registration_no,
    f.student_name
FROM no_dues_status s
JOIN no_dues_forms f ON f.id = s.form_id
WHERE s.department_name = 'library';

-- 7. Check what the stats API would query for librarian
-- Simulating: assigned_department_ids contains library UUID
SELECT 
    'What Librarian Should See' as check_type,
    d.name as department_name,
    COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN s.status = 'rejected' THEN 1 END) as rejected_count,
    COUNT(*) as total_count
FROM departments d
LEFT JOIN no_dues_status s ON s.department_name = d.name
WHERE d.name IN (
    SELECT name FROM departments 
    WHERE id = ANY(
        (SELECT assigned_department_ids FROM profiles WHERE email = '15anuragsingh2003@gmail.com')
    )
)
GROUP BY d.name;

-- 8. Check if forms have the required school/course/branch data
SELECT 
    'Form Data Completeness' as check_type,
    COUNT(*) as total_forms,
    COUNT(school_id) as forms_with_school,
    COUNT(course_id) as forms_with_course,
    COUNT(branch_id) as forms_with_branch
FROM no_dues_forms;