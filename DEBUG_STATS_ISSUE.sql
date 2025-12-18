-- ============================================================================
-- DEBUG: Why Staff Stats Show Zero
-- ============================================================================
-- Run these queries to diagnose why stats are showing 0
-- ============================================================================

-- 1. Check the librarian's profile and assigned departments
SELECT 
    'Librarian Profile' as check_type,
    id,
    email,
    full_name,
    department_name,
    assigned_department_ids
FROM profiles
WHERE email = '15anuragsingh2003@gmail.com';

-- 2. Check if no_dues_status has action_by_user_id populated
SELECT 
    'Status Records for Library' as check_type,
    id,
    form_id,
    department_name,
    status,
    action_by_user_id,
    action_at,
    rejection_reason
FROM no_dues_status
WHERE department_name = 'library'
ORDER BY action_at DESC NULLS LAST
LIMIT 10;

-- 3. Count stats manually (what stats API SHOULD return)
SELECT 
    'Manual Stats Count' as check_type,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(*) as total_actions
FROM no_dues_status
WHERE department_name = 'library'
AND action_by_user_id = (
    SELECT id FROM profiles WHERE email = '15anuragsingh2003@gmail.com'
);

-- 4. Check if action_by_user_id is NULL (the problem!)
SELECT 
    'Actions with NULL user_id' as check_type,
    COUNT(*) as count_with_null_user_id,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_with_null,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_with_null
FROM no_dues_status
WHERE department_name = 'library'
AND action_by_user_id IS NULL
AND status IN ('approved', 'rejected');

-- 5. Check ALL library actions regardless of user
SELECT 
    'All Library Actions' as check_type,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM no_dues_status
WHERE department_name = 'library';

-- ============================================================================
-- EXPECTED RESULTS:
-- - Query 1: Should show librarian's UUID and assigned_department_ids array
-- - Query 2: Should show recent actions with action_by_user_id populated
-- - Query 3: Should show correct counts for THIS user's actions
-- - Query 4: If count > 0, action_by_user_id is NOT being set (BUG!)
-- - Query 5: Shows total department stats (not filtered by user)
-- ============================================================================