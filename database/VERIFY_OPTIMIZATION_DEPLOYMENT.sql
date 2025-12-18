-- =====================================================
-- VERIFICATION SCRIPT FOR PERFORMANCE OPTIMIZATION
-- =====================================================
-- Purpose: Verify all optimization changes are properly deployed
-- Run this AFTER applying the performance migration
-- =====================================================

-- =====================================================
-- 1. VERIFY RPC FUNCTIONS EXIST AND ARE CORRECT
-- =====================================================
SELECT 
    'RPC Functions Check' as test_category,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'get_form_statistics' 
            AND pronargs = 0
        ) THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as get_form_statistics_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'get_department_workload' 
            AND pronargs = 0
        ) THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as get_department_workload_status;

-- =====================================================
-- 2. TEST RPC FUNCTIONS RETURN DATA
-- =====================================================
SELECT 
    'RPC Function Data Test' as test_category,
    'Admin Stats' as function_name,
    (SELECT COUNT(*) FROM get_form_statistics()) as should_be_1,
    CASE 
        WHEN (SELECT COUNT(*) FROM get_form_statistics()) = 1 THEN '✅ PASS'
        ELSE '❌ FAIL - Should return exactly 1 row'
    END as status;

SELECT 
    'RPC Function Data Test' as test_category,
    'Department Workload' as function_name,
    (SELECT COUNT(*) FROM get_department_workload()) as department_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM get_department_workload()) > 0 THEN '✅ PASS'
        ELSE '⚠️ WARNING - No departments returned (may be expected if no data)'
    END as status;

-- =====================================================
-- 3. VERIFY INDEXES EXIST
-- =====================================================
SELECT 
    'Index Verification' as test_category,
    indexname,
    CASE 
        WHEN indexname = 'idx_no_dues_status_dept_status' THEN '✅ PASS'
        WHEN indexname = 'idx_no_dues_status_form_id' THEN '✅ PASS'
        WHEN indexname = 'idx_no_dues_forms_status' THEN '✅ PASS'
        WHEN indexname = 'idx_no_dues_forms_student_search' THEN '✅ PASS'
        WHEN indexname = 'idx_no_dues_status_action_at' THEN '✅ PASS'
        WHEN indexname = 'idx_profiles_department' THEN '✅ PASS'
        ELSE '❓ UNKNOWN'
    END as status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_no_dues%'
ORDER BY indexname;

-- =====================================================
-- 4. CHECK FOR MISSING INDEXES
-- =====================================================
WITH required_indexes AS (
    SELECT unnest(ARRAY[
        'idx_no_dues_status_dept_status',
        'idx_no_dues_status_form_id',
        'idx_no_dues_forms_status',
        'idx_no_dues_forms_student_search',
        'idx_no_dues_status_action_at',
        'idx_profiles_department'
    ]) as index_name
),
existing_indexes AS (
    SELECT indexname FROM pg_indexes 
    WHERE schemaname = 'public'
)
SELECT 
    'Missing Indexes Check' as test_category,
    r.index_name,
    CASE 
        WHEN e.indexname IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM required_indexes r
LEFT JOIN existing_indexes e ON r.index_name = e.indexname
ORDER BY r.index_name;

-- =====================================================
-- 5. VERIFY DATA INTEGRITY (All forms have 7 status rows)
-- =====================================================
SELECT 
    'Data Integrity Check' as test_category,
    'Forms with incomplete status rows' as issue,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS - All forms have complete status rows'
        ELSE '❌ FAIL - Some forms missing status rows'
    END as status
FROM (
    SELECT 
        f.id,
        f.registration_no,
        COUNT(s.id) as status_count
    FROM public.no_dues_forms f
    LEFT JOIN public.no_dues_status s ON f.id = s.form_id
    GROUP BY f.id, f.registration_no
    HAVING COUNT(s.id) != 7
) incomplete_forms;

-- =====================================================
-- 6. VERIFY STAFF PROFILES HAVE DEPARTMENT ASSIGNMENTS
-- =====================================================
SELECT 
    'Profile Mapping Check' as test_category,
    COUNT(*) as staff_without_departments,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS - All staff have departments assigned'
        ELSE '⚠️ WARNING - Some staff missing department assignments'
    END as status
FROM public.profiles
WHERE role = 'department'
  AND (assigned_department_ids IS NULL OR assigned_department_ids = '{}')
  AND department_name IS NOT NULL;

-- =====================================================
-- 7. PERFORMANCE BASELINE TEST
-- =====================================================
-- Test query performance for common dashboard queries
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM public.no_dues_status
WHERE department_name = 'library' AND status = 'pending';

-- =====================================================
-- 8. SAMPLE DATA CHECKS
-- =====================================================
SELECT 
    'Sample Data Check' as test_category,
    'Total Forms' as metric,
    COUNT(*) as value
FROM public.no_dues_forms;

SELECT 
    'Sample Data Check' as test_category,
    'Total Status Records' as metric,
    COUNT(*) as value
FROM public.no_dues_status;

SELECT 
    'Sample Data Check' as test_category,
    'Status Distribution' as metric,
    status,
    COUNT(*) as count
FROM public.no_dues_status
GROUP BY status
ORDER BY status;

-- =====================================================
-- 9. VERIFY FUNCTION RETURNS MATCH ACTUAL DATA
-- =====================================================
WITH rpc_data AS (
    SELECT 
        total_applications,
        pending_applications,
        approved_applications,
        rejected_applications
    FROM get_form_statistics()
),
actual_data AS (
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'completed') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
    FROM public.no_dues_forms
)
SELECT 
    'Data Accuracy Check' as test_category,
    CASE 
        WHEN r.total_applications = a.total 
         AND r.pending_applications = a.pending
         AND r.approved_applications = a.approved
         AND r.rejected_applications = a.rejected
        THEN '✅ PASS - RPC data matches actual data'
        ELSE '❌ FAIL - Data mismatch detected'
    END as status,
    jsonb_build_object(
        'rpc_total', r.total_applications,
        'actual_total', a.total,
        'rpc_pending', r.pending_applications,
        'actual_pending', a.pending,
        'rpc_approved', r.approved_applications,
        'actual_approved', a.approved,
        'rpc_rejected', r.rejected_applications,
        'actual_rejected', a.rejected
    ) as comparison
FROM rpc_data r, actual_data a;

-- =====================================================
-- 10. FINAL SUMMARY
-- =====================================================
SELECT 
    '========================================' as separator,
    'OPTIMIZATION VERIFICATION SUMMARY' as title,
    '========================================' as separator2;

SELECT 
    'Total Forms in System' as metric,
    (SELECT COUNT(*) FROM public.no_dues_forms) as value;

SELECT 
    'Total Status Records' as metric,
    (SELECT COUNT(*) FROM public.no_dues_status) as value;

SELECT 
    'Performance Indexes Created' as metric,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_no_dues%') as value;

SELECT 
    'RPC Functions Available' as metric,
    (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('get_form_statistics', 'get_department_workload')) as value;

-- =====================================================
-- INSTRUCTIONS
-- =====================================================
/*
HOW TO USE THIS VERIFICATION SCRIPT:

1. Run in Supabase SQL Editor after deploying the performance migration
2. Check all test results:
   - ✅ PASS = Everything is working correctly
   - ⚠️ WARNING = Review but may be expected
   - ❌ FAIL = Action required, something is broken

3. If any FAIL results appear:
   - Re-run the PERFORMANCE_AND_STATS_OPTIMIZATION.sql migration
   - Check for error messages in the Supabase logs
   - Verify you have proper permissions

4. Expected Results:
   - All RPC functions should return ✅ PASS
   - All 6 indexes should exist
   - All forms should have exactly 7 status rows
   - All staff should have department assignments
   - RPC data should match actual data

5. Performance Baseline:
   - Check the EXPLAIN ANALYZE output
   - Query should use "Index Scan" not "Seq Scan"
   - Execution time should be < 50ms for typical queries
*/