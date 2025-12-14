-- ============================================================================
-- FIX STATS API 500 ERROR - Complete Database Function Update
-- ============================================================================
-- This script fixes the database functions to exclude manual entries from stats
-- Run this in Supabase SQL Editor to fix the statistics API
--
-- Issues Fixed:
-- 1. get_form_statistics() now excludes manual entries
-- 2. get_department_workload() now excludes manual entries
-- 3. Both functions now return accurate statistics for online submissions only
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: get_form_statistics() - Exclude Manual Entries
-- ============================================================================

-- Drop existing function first (required when changing implementation)
DROP FUNCTION IF EXISTS get_form_statistics() CASCADE;

-- Recreate with manual entry filter
CREATE FUNCTION get_form_statistics()
RETURNS TABLE (
    total_requests BIGINT,
    completed_requests BIGINT,
    pending_requests BIGINT,
    rejected_requests BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests
    FROM public.no_dues_forms
    WHERE is_manual_entry = false;  -- ✅ CRITICAL FIX: Exclude manual entries
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION 2: get_department_workload() - Exclude Manual Entries
-- ============================================================================

-- Drop existing function first (required when changing implementation)
DROP FUNCTION IF EXISTS get_department_workload() CASCADE;

-- Recreate with manual entry filter
CREATE FUNCTION get_department_workload()
RETURNS TABLE (
    department_name TEXT,
    pending_count BIGINT,
    approved_count BIGINT,
    rejected_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        nds.department_name,
        COUNT(*) FILTER (WHERE nds.status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE nds.status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE nds.status = 'rejected') as rejected_count
    FROM public.no_dues_status nds
    INNER JOIN public.no_dues_forms f ON f.id = nds.form_id
    WHERE f.is_manual_entry = false  -- ✅ CRITICAL FIX: Exclude manual entries
    GROUP BY nds.department_name
    ORDER BY nds.department_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION: Test the Fixed Functions
-- ============================================================================

-- Test 1: Verify get_form_statistics() returns correct data
SELECT 
    'get_form_statistics() Test' as test_name,
    * 
FROM get_form_statistics();

-- Test 2: Verify get_department_workload() returns correct data
SELECT 
    'get_department_workload() Test' as test_name,
    * 
FROM get_department_workload()
LIMIT 5;

-- Test 3: Compare online vs manual entries
SELECT
    'Data Comparison' as test_name,
    COUNT(*) FILTER (WHERE is_manual_entry = false) as online_submissions,
    COUNT(*) FILTER (WHERE is_manual_entry = true) as manual_entries,
    COUNT(*) as total_forms
FROM public.no_dues_forms;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  STATS API FUNCTIONS UPDATED SUCCESSFULLY!            ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ get_form_statistics() - Now excludes manual entries';
    RAISE NOTICE '✅ get_department_workload() - Now excludes manual entries';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Redeploy your Next.js application to Vercel';
    RAISE NOTICE '   2. Clear browser cache (Ctrl+Shift+R)';
    RAISE NOTICE '   3. Test admin dashboard stats';
    RAISE NOTICE '   4. Verify stats API returns 200 status';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- OPTIONAL: Grant execute permissions (if needed)
-- ============================================================================

-- Grant execute to authenticated users (already have via RLS policies)
-- GRANT EXECUTE ON FUNCTION get_form_statistics() TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_department_workload() TO authenticated;

-- Grant execute to service role (for API routes)
GRANT EXECUTE ON FUNCTION get_form_statistics() TO service_role;
GRANT EXECUTE ON FUNCTION get_department_workload() TO service_role;