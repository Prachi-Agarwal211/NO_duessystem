-- ============================================
-- FIX ADMIN STATS TO EXCLUDE MANUAL ENTRIES
-- ============================================
-- Run this in Supabase SQL Editor to update the statistics functions
-- Manual entries should NOT appear in admin dashboard stats/counts

-- ============================================
-- STEP 1: DROP EXISTING FUNCTIONS
-- ============================================
-- Must drop first to change return type
DROP FUNCTION IF EXISTS get_form_statistics();
DROP FUNCTION IF EXISTS get_department_workload();

-- ============================================
-- STEP 2: CREATE UPDATED get_form_statistics function
-- ============================================
-- This function provides overall counts for admin dashboard
CREATE OR REPLACE FUNCTION get_form_statistics()
RETURNS TABLE (
  total_requests BIGINT,
  completed_requests BIGINT,
  pending_requests BIGINT,
  in_progress_requests BIGINT,
  rejected_requests BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_requests,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_requests,
    COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT as in_progress_requests,
    COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_requests
  FROM no_dues_forms
  WHERE is_manual_entry = false; -- ✅ EXCLUDE manual entries
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 3: CREATE UPDATED get_department_workload function
-- ============================================
-- This function provides department-wise stats
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
    ns.department_name,
    COUNT(*) FILTER (WHERE ns.status = 'pending')::BIGINT as pending_count,
    COUNT(*) FILTER (WHERE ns.status = 'approved')::BIGINT as approved_count,
    COUNT(*) FILTER (WHERE ns.status = 'rejected')::BIGINT as rejected_count
  FROM no_dues_status ns
  INNER JOIN no_dues_forms nf ON ns.form_id = nf.id
  WHERE nf.is_manual_entry = false  -- ✅ EXCLUDE manual entries
  GROUP BY ns.department_name
  ORDER BY ns.department_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 4: VERIFY FUNCTIONS CREATED SUCCESSFULLY
-- ============================================
-- Test the updated functions
SELECT 'Testing get_form_statistics()' as test;
SELECT * FROM get_form_statistics();

SELECT 'Testing get_department_workload()' as test;
SELECT * FROM get_department_workload();

-- ============================================
-- EXPLANATION
-- ============================================
/*
WHAT CHANGED:
1. get_form_statistics() - Added WHERE clause to exclude manual entries
2. get_department_workload() - Added JOIN condition to exclude manual entries

WHY:
- Manual entries are admin-only workflow (no department status)
- They should appear ONLY in "Manual Entries" tab
- They should NOT affect dashboard stats/counts
- Departments can VIEW manual entries but cannot approve/reject

IMPACT:
- Admin dashboard "Pending" count will no longer include manual entries
- Department stats will be accurate (only online submissions)
- Manual entries visible in dedicated "Manual Entries" tab

TESTING:
After running this script:
1. Go to Admin Dashboard
2. Check "Total Requests" and "Pending" counts
3. Verify manual entries don't appear in main table
4. Check "Manual Entries" tab - should show all manual entries
*/