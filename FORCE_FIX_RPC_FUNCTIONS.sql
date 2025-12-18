-- ============================================================================
-- FORCE FIX: Drop and Recreate RPC Functions
-- ============================================================================
-- This script forcefully recreates the RPC functions that are still
-- referencing deleted columns (is_manual_entry, manual_status).
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Force drop ALL versions of these functions
DROP FUNCTION IF EXISTS public.get_form_statistics() CASCADE;
DROP FUNCTION IF EXISTS public.get_form_statistics(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_form_statistics(boolean) CASCADE;

DROP FUNCTION IF EXISTS public.get_department_workload() CASCADE;
DROP FUNCTION IF EXISTS public.get_department_workload(text) CASCADE;

DROP FUNCTION IF EXISTS public.get_manual_entry_statistics() CASCADE;
DROP FUNCTION IF EXISTS public.get_manual_entry_statistics(text) CASCADE;

-- Step 2: Recreate with ONLY no_dues_forms table (no manual entry logic)
CREATE OR REPLACE FUNCTION public.get_form_statistics()
RETURNS TABLE (
    total BIGINT,
    pending BIGINT,
    completed BIGINT,
    rejected BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed,
        COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected
    FROM public.no_dues_forms;
    -- ✅ NO is_manual_entry check - table only has online forms now
END;
$$;

-- Step 3: Department workload from no_dues_status table
CREATE OR REPLACE FUNCTION public.get_department_workload()
RETURNS TABLE (
    department_name TEXT,
    pending_count BIGINT,
    approved_count BIGINT,
    rejected_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.department_name::TEXT,
        COUNT(*) FILTER (WHERE s.status = 'pending')::BIGINT as pending_count,
        COUNT(*) FILTER (WHERE s.status = 'approved')::BIGINT as approved_count,
        COUNT(*) FILTER (WHERE s.status = 'rejected')::BIGINT as rejected_count
    FROM public.no_dues_status s
    GROUP BY s.department_name
    ORDER BY s.department_name;
END;
$$;

-- Step 4: Manual entries from SEPARATE table (if it exists)
CREATE OR REPLACE FUNCTION public.get_manual_entry_statistics()
RETURNS TABLE (
    total_entries BIGINT,
    pending_entries BIGINT,
    approved_entries BIGINT,
    rejected_entries BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if manual_no_dues table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'manual_no_dues'
    ) THEN
        -- Query the SEPARATE manual_no_dues table
        RETURN QUERY
        SELECT 
            COUNT(*)::BIGINT as total_entries,
            COUNT(*) FILTER (WHERE status = 'pending_review')::BIGINT as pending_entries,
            COUNT(*) FILTER (WHERE status = 'approved')::BIGINT as approved_entries,
            COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_entries
        FROM public.manual_no_dues;
        -- ✅ Queries manual_no_dues table, NOT no_dues_forms
    ELSE
        -- Table doesn't exist yet, return zeros
        RETURN QUERY
        SELECT 
            0::BIGINT as total_entries,
            0::BIGINT as pending_entries,
            0::BIGINT as approved_entries,
            0::BIGINT as rejected_entries;
    END IF;
END;
$$;

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_form_statistics() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_department_workload() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_manual_entry_statistics() TO authenticated, service_role, anon;

-- Step 6: Test the functions
SELECT '=== Testing get_form_statistics() ===' as test;
SELECT * FROM get_form_statistics();

SELECT '=== Testing get_department_workload() ===' as test;
SELECT * FROM get_department_workload();

SELECT '=== Testing get_manual_entry_statistics() ===' as test;
SELECT * FROM get_manual_entry_statistics();

-- Step 7: Verify no references to deleted columns
SELECT '=== Checking for problematic function definitions ===' as test;
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND (routine_definition LIKE '%is_manual_entry%' 
       OR routine_definition LIKE '%manual_status%'
       OR routine_definition LIKE '%manual_certificate_url%');

-- Expected: Should return 0 rows after this fix

SELECT '=== DONE: RPC Functions Fixed ===' as status;