-- ============================================================================
-- FIX ADMIN STATS: RPC Functions Returning Wrong Data
-- ============================================================================
-- Problem: Admin stats cards show 0 even though applications exist
-- Cause: RPC functions may not exist or are returning wrong data
-- ============================================================================

-- STEP 1: Check if RPC functions exist
SELECT 
    '🔍 CHECKING RPC FUNCTIONS' as step,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_form_statistics', 'get_department_workload');

-- STEP 2: Drop and recreate get_form_statistics function
DROP FUNCTION IF EXISTS get_form_statistics();

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

-- STEP 3: Drop and recreate get_department_workload function
DROP FUNCTION IF EXISTS get_department_workload();

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

-- STEP 4: Test the functions
SELECT '📊 TESTING get_form_statistics()' as step;
SELECT * FROM get_form_statistics();

SELECT '📊 TESTING get_department_workload()' as step;
SELECT * FROM get_department_workload();

-- STEP 5: Verify actual data exists
SELECT 
    '✅ VERIFYING DATA EXISTS' as step,
    (SELECT COUNT(*) FROM no_dues_forms) as total_forms,
    (SELECT COUNT(*) FROM no_dues_status) as total_statuses,
    (SELECT COUNT(*) FROM no_dues_status WHERE status = 'approved') as approved_count,
    (SELECT COUNT(*) FROM no_dues_status WHERE status = 'pending') as pending_count;

SELECT '🎯 FIX COMPLETE - Admin stats should now work!' as summary;