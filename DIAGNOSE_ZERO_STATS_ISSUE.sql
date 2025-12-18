-- ============================================================================
-- DIAGNOSE WHY STATS SHOW ZERO IN DEPARTMENT DASHBOARD
-- ============================================================================
-- This will help us understand exactly what's happening with stats
-- ============================================================================

-- STEP 1: Check if librarian account exists and has correct department assignment
-- ============================================================================
SELECT 
    '1️⃣ LIBRARIAN ACCOUNT CHECK' as step,
    id,
    email,
    full_name,
    role,
    department_name,
    assigned_department_ids
FROM profiles
WHERE email = '15anuragsingh2003@gmail.com';

-- STEP 2: Get the Library department ID
-- ============================================================================
SELECT 
    '2️⃣ LIBRARY DEPARTMENT' as step,
    id as library_id,
    name as department_name,
    display_name
FROM departments
WHERE name = 'library';

-- STEP 3: Check if librarian's assigned_department_ids includes library UUID
-- ============================================================================
SELECT 
    '3️⃣ AUTHORIZATION CHECK' as step,
    p.email,
    p.assigned_department_ids,
    d.id as library_id,
    CASE 
        WHEN d.id = ANY(p.assigned_department_ids) 
        THEN '✅ Library ID is in assigned list'
        ELSE '❌ Library ID is NOT in assigned list'
    END as authorization_status
FROM profiles p
CROSS JOIN (SELECT id FROM departments WHERE name = 'library') d
WHERE p.email = '15anuragsingh2003@gmail.com';

-- STEP 4: Check all forms and their library status
-- ============================================================================
SELECT 
    '4️⃣ FORMS AND LIBRARY STATUS' as step,
    f.id as form_id,
    f.student_name,
    f.registration_no,
    f.status as form_status,
    s.status as library_status,
    s.action_by_user_id,
    s.action_at,
    p.full_name as action_by_name,
    p.email as action_by_email
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON s.form_id = f.id AND s.department_name = 'library'
LEFT JOIN profiles p ON p.id = s.action_by_user_id
ORDER BY f.created_at DESC
LIMIT 10;

-- STEP 5: Count library actions by the librarian user
-- ============================================================================
WITH librarian AS (
    SELECT id FROM profiles WHERE email = '15anuragsingh2003@gmail.com'
)
SELECT 
    '5️⃣ LIBRARIAN ACTIONS COUNT' as step,
    COUNT(*) FILTER (WHERE s.status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE s.status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE s.status = 'rejected') as rejected_count,
    COUNT(*) as total_count
FROM no_dues_status s
WHERE s.department_name = 'library'
AND s.action_by_user_id = (SELECT id FROM librarian);

-- STEP 6: Show EXACT query that stats API would run
-- ============================================================================
WITH librarian AS (
    SELECT 
        id as user_id,
        assigned_department_ids
    FROM profiles 
    WHERE email = '15anuragsingh2003@gmail.com'
),
my_departments AS (
    SELECT d.id, d.name, d.display_name
    FROM departments d, librarian l
    WHERE d.id = ANY(l.assigned_department_ids)
),
my_dept_names AS (
    SELECT array_agg(name) as names FROM my_departments
)
SELECT 
    '6️⃣ STATS API QUERY SIMULATION' as step,
    COUNT(*) FILTER (WHERE s.status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE s.status = 'rejected') as rejected_count,
    COUNT(*) as total_actions_count
FROM no_dues_status s, librarian l, my_dept_names d
WHERE s.department_name = ANY(d.names)
AND s.action_by_user_id = l.user_id;

-- STEP 7: Check if there are ANY actions with action_by_user_id set
-- ============================================================================
SELECT 
    '7️⃣ ALL ACTIONS WITH USER IDs' as step,
    s.department_name,
    s.status,
    s.action_by_user_id,
    s.action_at,
    p.full_name as action_by,
    p.email,
    f.student_name
FROM no_dues_status s
LEFT JOIN profiles p ON p.id = s.action_by_user_id
LEFT JOIN no_dues_forms f ON f.id = s.form_id
WHERE s.action_at IS NOT NULL
ORDER BY s.action_at DESC
LIMIT 20;

-- STEP 8: Debug - Show what the frontend would receive
-- ============================================================================
WITH librarian AS (
    SELECT 
        id as user_id,
        assigned_department_ids,
        email
    FROM profiles 
    WHERE email = '15anuragsingh2003@gmail.com'
),
my_departments AS (
    SELECT d.id, d.name, d.display_name
    FROM departments d, librarian l
    WHERE d.id = ANY(l.assigned_department_ids)
),
personal_actions AS (
    SELECT 
        s.status,
        s.department_name,
        s.action_at
    FROM no_dues_status s, librarian l
    WHERE s.action_by_user_id = l.user_id
    AND s.department_name IN (SELECT name FROM my_departments)
),
pending_items AS (
    SELECT COUNT(*) as count
    FROM no_dues_status s
    WHERE s.status = 'pending'
    AND s.department_name IN (SELECT name FROM my_departments)
)
SELECT 
    '8️⃣ FINAL STATS OBJECT' as step,
    (SELECT COUNT(*) FROM personal_actions WHERE status = 'approved') as approved,
    (SELECT COUNT(*) FROM personal_actions WHERE status = 'rejected') as rejected,
    (SELECT COUNT(*) FROM personal_actions) as total,
    (SELECT count FROM pending_items) as pending;

-- STEP 9: Check if the problem is NULL assigned_department_ids
-- ============================================================================
SELECT 
    '9️⃣ NULL CHECK' as step,
    email,
    assigned_department_ids,
    CASE 
        WHEN assigned_department_ids IS NULL THEN '❌ NULL - THIS IS THE PROBLEM!'
        WHEN cardinality(assigned_department_ids) = 0 THEN '❌ EMPTY ARRAY - THIS IS THE PROBLEM!'
        ELSE '✅ Has assigned departments'
    END as status
FROM profiles
WHERE email = '15anuragsingh2003@gmail.com';

-- FINAL SUMMARY
-- ============================================================================
SELECT '🎯 DIAGNOSIS COMPLETE - Check results above to identify the issue' as summary;