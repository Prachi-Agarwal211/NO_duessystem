-- ============================================================================
-- DEEP INVESTIGATION: Why Stats Show 0 When Database Has Data
-- ============================================================================

-- STEP 1: Verify librarian account details
SELECT 
    '1️⃣ LIBRARIAN ACCOUNT' as step,
    id as user_id,
    email,
    full_name,
    role,
    department_name,
    assigned_department_ids,
    array_length(assigned_department_ids, 1) as num_assigned_depts
FROM profiles
WHERE email = '15anuragsingh2003@gmail.com';

-- STEP 2: Get Library department ID
SELECT 
    '2️⃣ LIBRARY DEPARTMENT UUID' as step,
    id as library_uuid,
    name,
    display_name
FROM departments
WHERE name = 'library';

-- STEP 3: Check if librarian's assigned_department_ids contains library UUID
WITH librarian AS (
    SELECT id, assigned_department_ids FROM profiles WHERE email = '15anuragsingh2003@gmail.com'
),
library AS (
    SELECT id as lib_id FROM departments WHERE name = 'library'
)
SELECT 
    '3️⃣ AUTHORIZATION STATUS' as step,
    l.assigned_department_ids,
    lib.lib_id,
    CASE 
        WHEN lib.lib_id = ANY(l.assigned_department_ids) THEN '✅ AUTHORIZED'
        WHEN l.assigned_department_ids IS NULL THEN '❌ NULL - NO DEPARTMENTS ASSIGNED'
        WHEN array_length(l.assigned_department_ids, 1) = 0 THEN '❌ EMPTY ARRAY'
        ELSE '❌ LIBRARY UUID NOT IN ASSIGNED LIST'
    END as auth_status
FROM librarian l
CROSS JOIN library lib;

-- STEP 4: Check what departments the API THINKS the user manages
WITH librarian AS (
    SELECT id, assigned_department_ids FROM profiles WHERE email = '15anuragsingh2003@gmail.com'
)
SELECT 
    '4️⃣ DEPARTMENTS USER CAN MANAGE' as step,
    d.id,
    d.name,
    d.display_name
FROM departments d
JOIN librarian l ON d.id = ANY(l.assigned_department_ids);

-- STEP 5: Count actions by this user FOR LIBRARY DEPARTMENT
WITH librarian AS (
    SELECT id FROM profiles WHERE email = '15anuragsingh2003@gmail.com'
)
SELECT 
    '5️⃣ ACTIONS FOR LIBRARY DEPT' as step,
    COUNT(*) FILTER (WHERE s.status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE s.status = 'rejected') as rejected_count,
    COUNT(*) as total_count
FROM no_dues_status s
JOIN librarian l ON s.action_by_user_id = l.id
WHERE s.department_name = 'library';

-- STEP 6: Exact query the STATS API runs (lines 159-190)
WITH librarian AS (
    SELECT 
        id as user_id,
        assigned_department_ids
    FROM profiles 
    WHERE email = '15anuragsingh2003@gmail.com'
),
my_departments AS (
    SELECT d.id, d.name, d.display_name
    FROM departments d
    JOIN librarian l ON d.id = ANY(l.assigned_department_ids)
),
my_dept_names AS (
    SELECT array_agg(name) as names FROM my_departments
),
personal_actions AS (
    SELECT 
        s.status,
        s.department_name,
        s.action_at,
        s.action_by_user_id
    FROM no_dues_status s
    CROSS JOIN librarian l
    CROSS JOIN my_dept_names d
    WHERE s.action_by_user_id = l.user_id
    AND s.department_name = ANY(d.names)
)
SELECT 
    '6️⃣ STATS API EXACT QUERY' as step,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
    COUNT(*) as total,
    (SELECT names FROM my_dept_names) as dept_names_checked
FROM personal_actions;

-- STEP 7: Check if action_by_user_id matches user ID
WITH librarian AS (
    SELECT id FROM profiles WHERE email = '15anuragsingh2003@gmail.com'
)
SELECT 
    '7️⃣ ACTION BY USER ID CHECK' as step,
    s.id as status_id,
    s.form_id,
    s.department_name,
    s.status,
    s.action_by_user_id,
    l.id as expected_user_id,
    CASE 
        WHEN s.action_by_user_id = l.id THEN '✅ MATCH'
        WHEN s.action_by_user_id IS NULL THEN '❌ NULL - NOT SET'
        ELSE '❌ DIFFERENT USER'
    END as match_status,
    s.action_at,
    f.student_name
FROM no_dues_status s
CROSS JOIN librarian l
LEFT JOIN no_dues_forms f ON f.id = s.form_id
WHERE s.department_name = 'library'
AND s.action_at IS NOT NULL
ORDER BY s.action_at DESC;

-- STEP 8: Compare "Today's Activity" query vs Stats query
WITH librarian AS (
    SELECT 
        id as user_id,
        assigned_department_ids
    FROM profiles 
    WHERE email = '15anuragsingh2003@gmail.com'
),
my_departments AS (
    SELECT d.name
    FROM departments d
    JOIN librarian l ON d.id = ANY(l.assigned_department_ids)
),
today_query AS (
    -- This is what "Today's Activity" uses
    SELECT COUNT(*) as count
    FROM no_dues_status s
    CROSS JOIN librarian l
    WHERE s.action_by_user_id = l.user_id
    AND s.department_name IN (SELECT name FROM my_departments)
    AND s.status = 'approved'
),
stats_query AS (
    -- This is what stats cards use
    SELECT COUNT(*) as count
    FROM no_dues_status s
    CROSS JOIN librarian l
    WHERE s.action_by_user_id = l.user_id
    AND s.department_name = ANY(ARRAY(SELECT name FROM my_departments))
),
direct_count AS (
    -- Direct count without department filtering
    SELECT COUNT(*) as count
    FROM no_dues_status s
    CROSS JOIN librarian l
    WHERE s.action_by_user_id = l.user_id
    AND s.status = 'approved'
)
SELECT 
    '8️⃣ QUERY COMPARISON' as step,
    (SELECT count FROM today_query) as today_activity_result,
    (SELECT count FROM stats_query) as stats_cards_result,
    (SELECT count FROM direct_count) as direct_count_result,
    CASE 
        WHEN (SELECT count FROM today_query) != (SELECT count FROM stats_query) 
        THEN '❌ QUERIES RETURN DIFFERENT RESULTS'
        ELSE '✅ QUERIES MATCH'
    END as comparison;

-- STEP 9: Check if there's a data type mismatch
WITH librarian AS (
    SELECT assigned_department_ids FROM profiles WHERE email = '15anuragsingh2003@gmail.com'
)
SELECT 
    '9️⃣ DATA TYPE CHECK' as step,
    pg_typeof(assigned_department_ids) as assigned_depts_type,
    pg_typeof((SELECT id FROM departments WHERE name = 'library')) as dept_id_type,
    assigned_department_ids as actual_value
FROM librarian;

-- STEP 10: Final diagnostic - show EVERYTHING
WITH librarian AS (
    SELECT id, assigned_department_ids FROM profiles WHERE email = '15anuragsingh2003@gmail.com'
)
SELECT 
    '🔟 COMPLETE DIAGNOSTIC' as step,
    'User ID: ' || l.id::text as info_1,
    'Assigned Dept IDs: ' || COALESCE(l.assigned_department_ids::text, 'NULL') as info_2,
    'Library UUID: ' || (SELECT id::text FROM departments WHERE name = 'library') as info_3,
    'Actions by user: ' || (SELECT COUNT(*)::text FROM no_dues_status WHERE action_by_user_id = l.id) as info_4,
    'Library actions: ' || (SELECT COUNT(*)::text FROM no_dues_status WHERE action_by_user_id = l.id AND department_name = 'library') as info_5,
    'Approved: ' || (SELECT COUNT(*)::text FROM no_dues_status WHERE action_by_user_id = l.id AND department_name = 'library' AND status = 'approved') as info_6
FROM librarian l;

-- FINAL: Show the exact problem
SELECT '🎯 DIAGNOSIS COMPLETE - Review results above to find the issue' as summary;