-- ============================================================================
-- Add missing get_admin_summary_stats() function
-- ============================================================================
-- This function was referenced in the admin dashboard API but was missing
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop if exists
DROP FUNCTION IF EXISTS get_admin_summary_stats();

-- Create the function
CREATE OR REPLACE FUNCTION get_admin_summary_stats()
RETURNS TABLE (
    total_requests BIGINT,
    completed_requests BIGINT,
    pending_requests BIGINT,
    rejected_requests BIGINT,
    completion_rate NUMERIC,
    avg_response_time_hours NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'rejected') as rejected
        FROM public.no_dues_forms
    ),
    response_times AS (
        SELECT
            AVG(
                EXTRACT(EPOCH FROM (action_at - created_at)) / 3600
            ) as avg_hours
        FROM public.no_dues_status
        WHERE action_at IS NOT NULL
    )
    SELECT
        stats.total as total_requests,
        stats.completed as completed_requests,
        stats.pending as pending_requests,
        stats.rejected as rejected_requests,
        CASE 
            WHEN stats.total > 0 
            THEN ROUND((stats.completed::NUMERIC / stats.total::NUMERIC) * 100, 2)
            ELSE 0 
        END as completion_rate,
        COALESCE(response_times.avg_hours, 0) as avg_response_time_hours
    FROM stats, response_times;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT * FROM get_admin_summary_stats();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Expected output: One row with summary statistics
-- total_requests | completed_requests | pending_requests | rejected_requests | completion_rate | avg_response_time_hours
-- ============================================================================