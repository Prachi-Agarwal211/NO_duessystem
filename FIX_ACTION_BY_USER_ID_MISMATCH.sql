-- ============================================================================
-- CRITICAL FIX: action_by_user_id Stores Wrong UUID
-- ============================================================================
-- Problem: The action API was storing Supabase Auth user.id instead of profiles.id
-- Solution: Update existing records to use the correct profile ID
-- ============================================================================

-- STEP 1: Show the mismatch for verification
SELECT 
    '🔍 IDENTIFYING THE MISMATCH' as step,
    s.id as status_id,
    s.form_id,
    s.department_name,
    s.status,
    s.action_by_user_id as current_wrong_id,
    p.id as correct_profile_id,
    p.email,
    p.full_name,
    CASE 
        WHEN s.action_by_user_id = p.id THEN '✅ Already Correct'
        ELSE '❌ Needs Fix'
    END as fix_needed
FROM no_dues_status s
LEFT JOIN profiles p ON p.id IN (
    SELECT id FROM profiles WHERE id = s.action_by_user_id
)
WHERE s.action_by_user_id IS NOT NULL
ORDER BY s.action_at DESC;

-- STEP 2: Find the correct profile ID for the librarian's action
-- The action_by_user_id currently has an auth user ID
-- We need to find the matching profile by looking up auth.users
WITH auth_to_profile_mapping AS (
    SELECT 
        au.id as auth_user_id,
        p.id as profile_id,
        p.email,
        p.full_name
    FROM auth.users au
    JOIN profiles p ON p.email = au.email
    WHERE au.email = '15anuragsingh2003@gmail.com'
)
SELECT 
    '🔑 AUTH TO PROFILE MAPPING' as step,
    auth_user_id,
    profile_id,
    email,
    full_name
FROM auth_to_profile_mapping;

-- STEP 3: Fix the existing records
-- Update action_by_user_id to use profile.id instead of auth user.id
UPDATE no_dues_status s
SET action_by_user_id = p.id
FROM auth.users au
JOIN profiles p ON p.email = au.email
WHERE s.action_by_user_id = au.id
  AND s.action_by_user_id IS NOT NULL;

-- STEP 4: Verify the fix
SELECT 
    '✅ VERIFICATION AFTER FIX' as step,
    s.id as status_id,
    s.form_id,
    s.department_name,
    s.status,
    s.action_by_user_id as now_correct_profile_id,
    p.email,
    p.full_name,
    p.department_name as user_department
FROM no_dues_status s
JOIN profiles p ON p.id = s.action_by_user_id
WHERE s.action_by_user_id IS NOT NULL
ORDER BY s.action_at DESC;

-- STEP 5: Test the stats query that was failing
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
)
SELECT 
    '📊 STATS QUERY TEST' as step,
    COUNT(*) FILTER (WHERE s.status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE s.status = 'rejected') as rejected_count,
    COUNT(*) as total_actions
FROM no_dues_status s
CROSS JOIN librarian l
WHERE s.action_by_user_id = l.user_id
AND s.department_name IN (SELECT name FROM my_departments);

-- EXPECTED RESULT: Should now show 1 approved, 0 rejected, 1 total

SELECT '🎯 FIX COMPLETE - Stats should now work correctly!' as summary;