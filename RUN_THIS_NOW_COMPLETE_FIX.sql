-- ============================================================================
-- 🔴 CRITICAL: RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- ============================================================================
-- This fixes BOTH staff and admin stats showing 0
-- Run all sections together in one go
-- ============================================================================

-- ============================================
-- SECTION 1: Fix Staff Action Tracking (ID Mismatch)
-- ============================================

SELECT '🔧 SECTION 1: Fixing Staff Action User IDs' as status;

-- Show current problem
SELECT 
    '❌ BEFORE FIX - ID Mismatch' as step,
    s.id as status_id,
    s.department_name,
    s.status,
    s.action_by_user_id as current_wrong_id,
    'This ID does not match any profile.id' as problem
FROM no_dues_status s
WHERE s.action_by_user_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = s.action_by_user_id
)
LIMIT 5;

-- Fix: Map auth user IDs to profile IDs
UPDATE no_dues_status s
SET action_by_user_id = p.id
FROM auth.users au
JOIN profiles p ON p.email = au.email
WHERE s.action_by_user_id = au.id
  AND s.action_by_user_id IS NOT NULL
  AND s.action_by_user_id != p.id;

-- Verify the fix
SELECT 
    '✅ AFTER FIX - Verification' as step,
    COUNT(*) as fixed_records,
    'These records now have correct profile IDs' as status
FROM no_dues_status s
JOIN profiles p ON p.id = s.action_by_user_id
WHERE s.action_by_user_id IS NOT NULL;

-- Test staff stats query (for librarian)
WITH librarian AS (
    SELECT id FROM profiles WHERE email = '15anuragsingh2003@gmail.com'
)
SELECT 
    '📊 STAFF STATS TEST (Librarian)' as step,
    COUNT(*) FILTER (WHERE s.status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE s.status = 'rejected') as rejected_count,
    COUNT(*) as total_actions,
    'Expected: approved=1, rejected=0, total=1' as expected
FROM no_dues_status s
CROSS JOIN librarian l
WHERE s.action_by_user_id = l.id
AND s.department_name = 'library';

-- ============================================
-- SECTION 2: Fix Admin Stats (RPC Functions)
-- ============================================

SELECT '🔧 SECTION 2: Recreating Admin Stats Functions' as status;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_form_statistics();
DROP FUNCTION IF EXISTS get_department_workload();

-- Create get_form_statistics function
CREATE OR REPLACE FUNCTION get_form_statistics()
RETURNS TABLE (
    total BIGINT,
    pending BIGINT,
    completed BIGINT,
    rejected BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed,
        COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected
    FROM no_dues_forms;
END;
$$ LANGUAGE plpgsql STABLE;

SELECT '✅ Created: get_form_statistics()' as status;

-- Create get_department_workload function
CREATE OR REPLACE FUNCTION get_department_workload()
RETURNS TABLE (
    department_name TEXT,
    pending_count BIGINT,
    approved_count BIGINT,
    rejected_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nds.department_name::TEXT,
        COUNT(*) FILTER (WHERE nds.status = 'pending')::BIGINT as pending_count,
        COUNT(*) FILTER (WHERE nds.status = 'approved')::BIGINT as approved_count,
        COUNT(*) FILTER (WHERE nds.status = 'rejected')::BIGINT as rejected_count
    FROM no_dues_status nds
    GROUP BY nds.department_name
    ORDER BY nds.department_name;
END;
$$ LANGUAGE plpgsql STABLE;

SELECT '✅ Created: get_department_workload()' as status;

-- Test admin stats functions
SELECT '📊 ADMIN STATS TEST - Overall' as step, * FROM get_form_statistics();

SELECT '📊 ADMIN STATS TEST - Library Department' as step, * 
FROM get_department_workload() 
WHERE department_name = 'library';

-- ============================================
-- SECTION 3: Final Verification
-- ============================================

SELECT '🎯 FINAL VERIFICATION' as status;

-- Check 1: Profile ID mapping is correct
SELECT 
    '✅ Check 1: Action User ID Mapping' as check_name,
    COUNT(*) as records_with_correct_profile_id,
    string_agg(DISTINCT p.email, ', ') as staff_members
FROM no_dues_status s
JOIN profiles p ON p.id = s.action_by_user_id
WHERE s.action_by_user_id IS NOT NULL;

-- Check 2: RPC functions work
SELECT 
    '✅ Check 2: get_form_statistics() works' as check_name,
    total, pending, completed, rejected
FROM get_form_statistics();

-- Check 3: Department workload
SELECT 
    '✅ Check 3: get_department_workload() works' as check_name,
    COUNT(*) as departments_with_data
FROM get_department_workload();

-- Check 4: Specific librarian stats
SELECT 
    '✅ Check 4: Librarian Personal Stats' as check_name,
    COUNT(*) FILTER (WHERE s.status = 'approved') as my_approved,
    COUNT(*) FILTER (WHERE s.status = 'rejected') as my_rejected,
    COUNT(*) as my_total
FROM no_dues_status s
WHERE s.action_by_user_id = (
    SELECT id FROM profiles WHERE email = '15anuragsingh2003@gmail.com'
)
AND s.department_name = 'library';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 
    '✅✅✅ DATABASE FIX COMPLETE! ✅✅✅' as status,
    'Next Steps:' as instruction_1,
    '1. Deploy code: git push origin main' as instruction_2,
    '2. Wait 2 minutes for Vercel' as instruction_3,
    '3. Hard refresh: Ctrl+Shift+R' as instruction_4,
    '4. Stats should now show correct numbers!' as instruction_5;