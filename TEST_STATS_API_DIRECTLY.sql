-- ============================================================================
-- TEST: Replicate Exact Stats API Query
-- ============================================================================
-- This replicates what the stats API does to see why it returns 0
-- ============================================================================

-- The librarian's UUID
\set LIBRARIAN_ID '37c322bc-d577-431e-8063-c5b634db2376'

-- 1. Get assigned department IDs (what stats API does at line 136)
SELECT 
    'Step 1: Get Assigned Departments' as step,
    id as dept_id,
    name as dept_name,
    display_name
FROM departments
WHERE id = ANY((SELECT assigned_department_ids FROM profiles WHERE id = '37c322bc-d577-431e-8063-c5b634db2376')::uuid[]);

-- 2. Get department names array (what stats API does at line 147)
WITH my_depts AS (
    SELECT 
        id,
        name,
        display_name
    FROM departments
    WHERE id = ANY((SELECT assigned_department_ids FROM profiles WHERE id = '37c322bc-d577-431e-8063-c5b634db2376')::uuid[])
)
SELECT 
    'Step 2: Department Names' as step,
    array_agg(name) as dept_names_array
FROM my_depts;

-- 3. Query personal actions (EXACTLY like stats API line 159-190)
WITH my_depts AS (
    SELECT name
    FROM departments
    WHERE id = ANY((SELECT assigned_department_ids FROM profiles WHERE id = '37c322bc-d577-431e-8063-c5b634db2376')::uuid[])
),
dept_names AS (
    SELECT array_agg(name) as names FROM my_depts
)
SELECT 
    'Step 3: Personal Actions Query' as step,
    s.id,
    s.department_name,
    s.status,
    s.action_by_user_id,
    s.action_at,
    f.school_id,
    f.course_id,
    f.branch_id
FROM no_dues_status s
INNER JOIN no_dues_forms f ON s.form_id = f.id
WHERE s.department_name = ANY((SELECT names FROM dept_names))
AND s.action_by_user_id = '37c322bc-d577-431e-8063-c5b634db2376';

-- 4. Count by status (what stats API does at line 255-257)
WITH my_depts AS (
    SELECT name
    FROM departments
    WHERE id = ANY((SELECT assigned_department_ids FROM profiles WHERE id = '37c322bc-d577-431e-8063-c5b634db2376')::uuid[])
),
dept_names AS (
    SELECT array_agg(name) as names FROM my_depts
),
personal_actions AS (
    SELECT s.*
    FROM no_dues_status s
    INNER JOIN no_dues_forms f ON s.form_id = f.id
    WHERE s.department_name = ANY((SELECT names FROM dept_names))
    AND s.action_by_user_id = '37c322bc-d577-431e-8063-c5b634db2376'
)
SELECT 
    'Step 4: Final Stats (what API returns)' as step,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(*) as total_count
FROM personal_actions;

-- 5. Query pending actions (what stats API does at line 206-238)
WITH my_depts AS (
    SELECT name
    FROM departments
    WHERE id = ANY((SELECT assigned_department_ids FROM profiles WHERE id = '37c322bc-d577-431e-8063-c5b634db2376')::uuid[])
),
dept_names AS (
    SELECT array_agg(name) as names FROM my_depts
)
SELECT 
    'Step 5: Pending Count' as step,
    COUNT(*) as pending_count
FROM no_dues_status s
INNER JOIN no_dues_forms f ON s.form_id = f.id
WHERE s.department_name = ANY((SELECT names FROM dept_names))
AND s.status = 'pending';

-- ============================================================================
-- EXPECTED: All queries should return data showing 1 approved action
-- If Step 4 shows 0, there's a query logic bug in the stats API
-- ============================================================================