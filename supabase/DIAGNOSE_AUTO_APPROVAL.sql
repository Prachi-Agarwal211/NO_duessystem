-- ============================================================================
-- DIAGNOSTIC SCRIPT FOR AUTO-APPROVAL BUG
-- ============================================================================
-- Run this to diagnose what's happening with form submissions
-- ============================================================================

-- 1. CHECK CURRENT TRIGGER CONFIGURATION
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_form_status';

-- Expected output: Should show ONLY "UPDATE", NOT "INSERT"
-- If it shows "INSERT" or "INSERT, UPDATE", the trigger fix didn't apply

-- ============================================================================

-- 2. CHECK IF THERE ARE MULTIPLE TRIGGERS
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('no_dues_forms', 'no_dues_status')
ORDER BY trigger_name;

-- This shows ALL triggers on these tables

-- ============================================================================

-- 3. TEST: Check a recently submitted form
SELECT 
    f.registration_no,
    f.student_name,
    f.status as form_status,
    f.created_at,
    COUNT(s.id) as total_departments,
    COUNT(s.id) FILTER (WHERE s.status = 'approved') as approved_count,
    COUNT(s.id) FILTER (WHERE s.status = 'pending') as pending_count
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON s.form_id = f.id
WHERE f.created_at > NOW() - INTERVAL '1 hour'
GROUP BY f.id, f.registration_no, f.student_name, f.status, f.created_at
ORDER BY f.created_at DESC
LIMIT 5;

-- This shows recent forms and their department status counts
-- If form_status='completed' but pending_count > 0, that's the bug!

-- ============================================================================

-- 4. CHECK FUNCTION DEFINITION
SELECT pg_get_functiondef('update_form_status_on_department_action'::regproc);

-- This shows the actual trigger function code

-- ============================================================================
-- ANALYSIS:
-- If trigger still shows "INSERT" in step 1, re-run the fix SQL
-- If there are multiple triggers on same event, we need to drop all and recreate
-- If form shows 'completed' but has pending departments, trigger is still buggy
-- ============================================================================