-- ============================================================================
-- MISSING RPC FUNCTIONS FOR PRODUCTION
-- ============================================================================
-- This file creates all missing database functions (RPCs) that the admin
-- stats APIs are trying to call but don't exist in the production database.
-- ============================================================================

-- 1. Function for overall form statistics (used by admin stats API)
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
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_form_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_form_statistics() TO service_role;

-- 2. Function for department workload statistics (used by admin stats API)
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_department_workload() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_department_workload() TO service_role;

-- 3. Function for manual entry statistics (used by admin manual entries stats API)
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
        RETURN QUERY
        SELECT 
            COUNT(*)::BIGINT as total_entries,
            COUNT(*) FILTER (WHERE status = 'pending_review')::BIGINT as pending_entries,
            COUNT(*) FILTER (WHERE status = 'approved')::BIGINT as approved_entries,
            COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_entries
        FROM public.manual_no_dues;
    ELSE
        -- Return zeros if table doesn't exist yet
        RETURN QUERY
        SELECT 
            0::BIGINT as total_entries,
            0::BIGINT as pending_entries,
            0::BIGINT as approved_entries,
            0::BIGINT as rejected_entries;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_manual_entry_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_manual_entry_statistics() TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the functions work correctly:

-- Test get_form_statistics:
-- SELECT * FROM get_form_statistics();

-- Test get_department_workload:
-- SELECT * FROM get_department_workload();

-- Test get_manual_entry_statistics:
-- SELECT * FROM get_manual_entry_statistics();

-- ============================================================================
-- NOTES
-- ============================================================================
-- These functions use SECURITY DEFINER to run with the privileges of the
-- function creator, allowing read access to the tables even if the caller
-- doesn't have direct table permissions. This is safe because:
-- 1. Functions only read data, never modify
-- 2. No user input is used in queries (SQL injection safe)
-- 3. Only aggregate counts are returned, no sensitive data exposed
-- ============================================================================