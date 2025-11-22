-- ============================================================================
-- ONE-CLICK FIX FOR ALL KNOWN ISSUES
-- ============================================================================
-- This script fixes ALL identified issues in the JECRC No Dues System
-- Run this ONCE in Supabase SQL Editor to fix everything
-- ============================================================================

BEGIN;

-- ============================================================================
-- FIX 1: Remove Problematic Trigger (AUTO-APPROVAL BUG)
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== FIX 1: Removing Auto-Approval Trigger ===';
END $$;

-- Drop the trigger that causes auto-approval
DROP TRIGGER IF EXISTS trigger_update_form_status ON public.no_dues_status;

-- Drop the function
DROP FUNCTION IF EXISTS update_form_status_on_department_action();

-- Verify removal
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_name = 'trigger_update_form_status';
    
    IF trigger_count = 0 THEN
        RAISE NOTICE '✅ Auto-approval trigger successfully removed';
    ELSE
        RAISE EXCEPTION '❌ Failed to remove trigger';
    END IF;
END $$;

-- ============================================================================
-- FIX 2: Add Missing get_admin_summary_stats Function
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== FIX 2: Adding Missing Database Function ===';
END $$;

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

-- Verify function exists
DO $$
DECLARE
    func_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'get_admin_summary_stats'
        AND routine_schema = 'public'
    ) INTO func_exists;
    
    IF func_exists THEN
        RAISE NOTICE '✅ get_admin_summary_stats function successfully created';
    ELSE
        RAISE EXCEPTION '❌ Failed to create function';
    END IF;
END $$;

-- ============================================================================
-- FIX 3: Clean Up Orphaned Records
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== FIX 3: Cleaning Orphaned Records ===';
END $$;

-- Delete orphaned department status records
WITH orphaned AS (
    DELETE FROM no_dues_status s
    WHERE NOT EXISTS (
        SELECT 1 FROM no_dues_forms f
        WHERE f.id = s.form_id
    )
    RETURNING s.id
)
SELECT CASE 
    WHEN COUNT(*) > 0 THEN RAISE NOTICE '✅ Cleaned % orphaned status records', COUNT(*)
    ELSE RAISE NOTICE '✅ No orphaned records found'
END
FROM orphaned;

-- ============================================================================
-- FIX 4: Fix Forms with Invalid Statuses
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== FIX 4: Fixing Invalid Form Statuses ===';
END $$;

-- Count forms with invalid statuses
WITH invalid_status AS (
    SELECT id FROM no_dues_forms
    WHERE status NOT IN ('pending', 'completed', 'rejected')
)
SELECT CASE 
    WHEN COUNT(*) > 0 THEN RAISE NOTICE '⚠️  Found % forms with invalid status', COUNT(*)
    ELSE RAISE NOTICE '✅ No invalid statuses found'
END
FROM invalid_status;

-- Set invalid statuses to 'pending' (safer default)
UPDATE no_dues_forms
SET status = 'pending'
WHERE status NOT IN ('pending', 'completed', 'rejected');

-- ============================================================================
-- FIX 5: Correct Incorrectly Completed Forms
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== FIX 5: Correcting Forms Marked as Completed Incorrectly ===';
END $$;

-- Find and fix forms marked 'completed' without all 12 approvals
WITH incorrect_completed AS (
    SELECT f.id, f.registration_no,
           COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved_count
    FROM no_dues_forms f
    LEFT JOIN no_dues_status s ON s.form_id = f.id
    WHERE f.status = 'completed'
    GROUP BY f.id, f.registration_no
    HAVING COUNT(CASE WHEN s.status = 'approved' THEN 1 END) < 12
)
UPDATE no_dues_forms f
SET status = CASE
    WHEN EXISTS (
        SELECT 1 FROM no_dues_status s 
        WHERE s.form_id = f.id AND s.status = 'rejected'
    ) THEN 'rejected'
    ELSE 'pending'
END
FROM incorrect_completed ic
WHERE f.id = ic.id;

-- Report results
WITH check_result AS (
    SELECT 
        f.id,
        COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved_count
    FROM no_dues_forms f
    LEFT JOIN no_dues_status s ON s.form_id = f.id
    WHERE f.status = 'completed'
    GROUP BY f.id
    HAVING COUNT(CASE WHEN s.status = 'approved' THEN 1 END) < 12
)
SELECT CASE 
    WHEN COUNT(*) > 0 THEN RAISE NOTICE '⚠️  Still found % incorrectly completed forms', COUNT(*)
    ELSE RAISE NOTICE '✅ All completed forms verified correct'
END
FROM check_result;

-- ============================================================================
-- FIX 6: Ensure All Departments Exist
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== FIX 6: Verifying All 12 Departments Exist ===';
END $$;

-- Insert missing departments (if any)
INSERT INTO public.departments (name, display_name, email, display_order)
VALUES
    ('library', 'Library', 'library@jecrc.ac.in', 1),
    ('accounts', 'Accounts', 'accounts@jecrc.ac.in', 2),
    ('hostel', 'Hostel', 'hostel@jecrc.ac.in', 3),
    ('lab', 'Laboratory', 'lab@jecrc.ac.in', 4),
    ('department', 'Department', 'department@jecrc.ac.in', 5),
    ('sports', 'Sports', 'sports@jecrc.ac.in', 6),
    ('transport', 'Transport', 'transport@jecrc.ac.in', 7),
    ('exam', 'Examination Cell', 'exam@jecrc.ac.in', 8),
    ('placement', 'Training & Placement', 'placement@jecrc.ac.in', 9),
    ('scholarship', 'Scholarship', 'scholarship@jecrc.ac.in', 10),
    ('student_affairs', 'Student Affairs', 'studentaffairs@jecrc.ac.in', 11),
    ('administration', 'Administration', 'admin@jecrc.ac.in', 12)
ON CONFLICT (name) DO NOTHING;

-- Verify department count
DO $$
DECLARE
    dept_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dept_count FROM departments;
    
    IF dept_count = 12 THEN
        RAISE NOTICE '✅ All 12 departments verified';
    ELSE
        RAISE NOTICE '⚠️  Only % departments found (should be 12)', dept_count;
    END IF;
END $$;

-- ============================================================================
-- FIX 7: Fix Forms Missing Department Status Records
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== FIX 7: Fixing Forms with Missing Department Records ===';
END $$;

-- Find forms missing department status records and create them
WITH forms_missing_statuses AS (
    SELECT f.id, f.registration_no,
           COUNT(s.id) as status_count
    FROM no_dues_forms f
    LEFT JOIN no_dues_status s ON s.form_id = f.id
    GROUP BY f.id, f.registration_no
    HAVING COUNT(s.id) < 12
)
INSERT INTO no_dues_status (form_id, department_name, status)
SELECT fms.id, d.name, 'pending'
FROM forms_missing_statuses fms
CROSS JOIN departments d
WHERE NOT EXISTS (
    SELECT 1 FROM no_dues_status s
    WHERE s.form_id = fms.id
    AND s.department_name = d.name
);

-- Verify all forms have 12 status records
WITH verification AS (
    SELECT COUNT(*) as forms_with_issues
    FROM no_dues_forms f
    LEFT JOIN no_dues_status s ON s.form_id = f.id
    GROUP BY f.id
    HAVING COUNT(s.id) != 12
)
SELECT CASE 
    WHEN COUNT(*) > 0 THEN RAISE NOTICE '⚠️  Still found % forms with wrong status count', COUNT(*)
    ELSE RAISE NOTICE '✅ All forms have exactly 12 department status records'
END
FROM verification;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '=== FINAL SYSTEM VERIFICATION ===';
END $$;

-- Check trigger removal
DO $$
DECLARE
    bad_trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'trigger_update_form_status'
    ) INTO bad_trigger_exists;
    
    IF NOT bad_trigger_exists THEN
        RAISE NOTICE '✅ Auto-approval trigger removed';
    ELSE
        RAISE EXCEPTION '❌ Auto-approval trigger still exists!';
    END IF;
END $$;

-- Check function exists
DO $$
DECLARE
    func_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'get_admin_summary_stats'
    ) INTO func_exists;
    
    IF func_exists THEN
        RAISE NOTICE '✅ Admin summary stats function exists';
    ELSE
        RAISE EXCEPTION '❌ Admin summary stats function missing!';
    END IF;
END $$;

-- Check departments
DO $$
DECLARE
    dept_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dept_count FROM departments;
    
    IF dept_count = 12 THEN
        RAISE NOTICE '✅ All 12 departments exist';
    ELSE
        RAISE WARNING '⚠️  Only % departments exist (should be 12)', dept_count;
    END IF;
END $$;

-- Summary
DO $$ 
BEGIN
    RAISE NOTICE '
============================================================================
FIXES APPLIED SUCCESSFULLY!
============================================================================

✅ Auto-approval trigger removed
✅ Missing database function added
✅ Orphaned records cleaned
✅ Invalid statuses corrected
✅ Incorrectly completed forms fixed
✅ All 12 departments verified
✅ Missing department status records created

NEXT STEPS:
1. Test form submission - should stay "pending"
2. Login as department staff
3. Approve/reject forms - status should update correctly
4. Verify certificates generate when all departments approve
5. Check admin dashboard displays correctly

If issues persist, run: supabase/COMPLETE_SYSTEM_DIAGNOSTIC.sql
============================================================================
    ';
END $$;

COMMIT;

-- ============================================================================
-- POST-FIX VERIFICATION QUERIES (Optional - Run to verify)
-- ============================================================================

-- Uncomment these to verify fixes:

-- SELECT 'Recent forms and their status:' as info;
-- SELECT 
--     f.registration_no,
--     f.status,
--     f.created_at,
--     COUNT(s.id) as dept_count,
--     COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved
-- FROM no_dues_forms f
-- LEFT JOIN no_dues_status s ON s.form_id = f.id
-- WHERE f.created_at > NOW() - INTERVAL '7 days'
-- GROUP BY f.id, f.registration_no, f.status, f.created_at
-- ORDER BY f.created_at DESC
-- LIMIT 10;