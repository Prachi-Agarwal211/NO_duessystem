-- ============================================================================
-- FIX ADMIN DASHBOARD STATISTICS FUNCTIONS
-- ============================================================================
-- ISSUE: get_form_statistics() was checking for 'approved' status which doesn't exist
-- Online forms use: pending → completed (after all 7 depts approve)
-- Manual entries use: pending + manual_status (pending_review/approved/rejected)
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_form_statistics();

-- Recreate with correct status values
CREATE OR REPLACE FUNCTION get_form_statistics()
RETURNS TABLE (
    total_forms BIGINT,
    pending_forms BIGINT,
    completed_forms BIGINT,
    rejected_forms BIGINT,
    forms_today BIGINT,
    forms_this_week BIGINT,
    forms_this_month BIGINT,
    -- Additional useful stats
    total_requests BIGINT,
    pending_requests BIGINT,
    completed_requests BIGINT,
    rejected_requests BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_forms,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_forms,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_forms,
        COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_forms,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::BIGINT as forms_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as forms_this_week,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::BIGINT as forms_this_month,
        -- Aliases for consistency with frontend expectations
        COUNT(*)::BIGINT as total_requests,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_requests,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_requests,
        COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_requests
    FROM public.no_dues_forms
    WHERE is_manual_entry = false; -- ✅ CRITICAL: Exclude manual entries
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- VERIFY MANUAL ENTRY STATISTICS FUNCTION (Should already be correct)
-- ============================================================================

-- This function should already exist and be correct, but let's verify:
DROP FUNCTION IF EXISTS get_manual_entry_statistics();

CREATE OR REPLACE FUNCTION get_manual_entry_statistics()
RETURNS TABLE (
    total_entries BIGINT,
    pending_entries BIGINT,
    approved_entries BIGINT,
    rejected_entries BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_entries,
        COUNT(*) FILTER (WHERE manual_status = 'pending_review' OR manual_status = 'info_requested')::BIGINT as pending_entries,
        COUNT(*) FILTER (WHERE manual_status = 'approved')::BIGINT as approved_entries,
        COUNT(*) FILTER (WHERE manual_status = 'rejected')::BIGINT as rejected_entries
    FROM public.no_dues_forms
    WHERE is_manual_entry = true; -- ✅ CRITICAL: Only manual entries
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TEST QUERIES TO VERIFY FIXES
-- ============================================================================

-- Test 1: Check online forms stats
SELECT * FROM get_form_statistics();

-- Test 2: Check manual entries stats
SELECT * FROM get_manual_entry_statistics();

-- Test 3: Verify data separation
SELECT 
    is_manual_entry,
    status,
    manual_status,
    COUNT(*) as count
FROM no_dues_forms
GROUP BY is_manual_entry, status, manual_status
ORDER BY is_manual_entry, status, manual_status;

-- Test 4: Check if any forms have 'approved' status (should be ZERO)
SELECT COUNT(*) as forms_with_approved_status
FROM no_dues_forms
WHERE status = 'approved';

-- Expected result: 0 (because 'approved' doesn't exist in online forms)

-- ============================================================================
-- EXPLANATION OF THE FIX
-- ============================================================================

/*
BEFORE (BROKEN):
- get_form_statistics() was checking: COUNT(*) FILTER (WHERE status = 'approved')
- But online forms NEVER have status='approved'
- Online forms go: pending → completed (when all 7 depts approve)
- This caused: approved_forms always returned 0, making percentages NaN

AFTER (FIXED):
- Removed the 'approved_forms' field entirely
- Only count: pending, completed, rejected (the actual statuses)
- Added aliases for consistency: total_requests, pending_requests, etc.
- Frontend now shows correct counts without NaN percentages

MANUAL ENTRIES:
- Separate workflow with manual_status field
- Status values: pending_review, approved, rejected
- Fetched via separate API: /api/admin/manual-entries-stats
- Uses get_manual_entry_statistics() function (already correct)

RESULT:
- Online forms dashboard stats: Shows pending/completed/rejected correctly
- Manual entries card: Shows pending/approved/rejected correctly
- No more NaN% in admin dashboard
*/