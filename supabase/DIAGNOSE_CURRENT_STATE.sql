-- ============================================================================
-- DIAGNOSE CURRENT AUTO-APPROVAL STATE
-- ============================================================================
-- Run this to see exactly what's happening with your forms
-- ============================================================================

-- 1. Check most recent form submission
SELECT 
    'Most Recent Form' as check_type,
    id,
    registration_no,
    student_name,
    status as form_status,
    created_at,
    updated_at
FROM no_dues_forms
ORDER BY created_at DESC
LIMIT 1;

-- 2. Check department statuses for the most recent form
WITH latest_form AS (
    SELECT id FROM no_dues_forms ORDER BY created_at DESC LIMIT 1
)
SELECT 
    'Department Statuses' as check_type,
    department_name,
    status,
    action_at,
    created_at
FROM no_dues_status
WHERE form_id = (SELECT id FROM latest_form)
ORDER BY department_name;

-- 3. Count department statuses by type for most recent form
WITH latest_form AS (
    SELECT id FROM no_dues_forms ORDER BY created_at DESC LIMIT 1
)
SELECT 
    'Status Summary' as check_type,
    status,
    COUNT(*) as count
FROM no_dues_status
WHERE form_id = (SELECT id FROM latest_form)
GROUP BY status
ORDER BY status;

-- 4. Check if any forms have mismatched status
-- (form status = 'completed' but not all departments approved)
SELECT 
    'Mismatched Forms' as check_type,
    f.id,
    f.registration_no,
    f.status as form_status,
    COUNT(*) FILTER (WHERE ds.status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE ds.status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE ds.status = 'rejected') as rejected_count,
    COUNT(*) as total_departments
FROM no_dues_forms f
LEFT JOIN no_dues_status ds ON f.id = ds.form_id
WHERE f.created_at > NOW() - INTERVAL '7 days'
GROUP BY f.id, f.registration_no, f.status
HAVING 
    (f.status = 'completed' AND COUNT(*) FILTER (WHERE ds.status = 'approved') < 12)
    OR (f.status = 'pending' AND COUNT(*) FILTER (WHERE ds.status = 'approved') = 12)
ORDER BY f.created_at DESC;

-- 5. Check for any active triggers
SELECT 
    'Active Triggers' as check_type,
    trigger_name,
    event_manipulation as event,
    event_object_table as table_name,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('no_dues_forms', 'no_dues_status')
ORDER BY event_object_table, trigger_name;

-- 6. Check if create_department_statuses function exists
SELECT 
    'Functions' as check_type,
    routine_name as function_name,
    routine_type as type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%status%'
ORDER BY routine_name;