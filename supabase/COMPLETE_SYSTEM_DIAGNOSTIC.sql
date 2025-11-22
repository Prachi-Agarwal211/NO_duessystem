-- ============================================================================
-- COMPLETE SYSTEM DIAGNOSTIC
-- ============================================================================
-- This script checks for ALL potential issues in the JECRC No Dues System
-- Run this in Supabase SQL Editor to diagnose any remaining problems
-- ============================================================================

-- ============================================================================
-- SECTION 1: CHECK TRIGGERS (Auto-Approval Bug)
-- ============================================================================

SELECT '=== SECTION 1: TRIGGER CHECK ===' as section;

-- Check all active triggers
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- EXPECTED RESULT:
-- Should see ONLY:
-- 1. trigger_create_department_statuses (on no_dues_forms, AFTER INSERT)
-- 2. update_forms_updated_at (on no_dues_forms, BEFORE UPDATE)
-- 3. update_profiles_updated_at (on profiles, BEFORE UPDATE)
-- 
-- Should NOT see:
-- - trigger_update_form_status (this causes auto-approval bug!)

SELECT '--- If you see trigger_update_form_status above, YOU MUST RUN: supabase/REMOVE_TRIGGERS.sql ---' as warning;

-- ============================================================================
-- SECTION 2: CHECK FUNCTIONS
-- ============================================================================

SELECT '=== SECTION 2: DATABASE FUNCTIONS CHECK ===' as section;

-- List all custom functions
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name NOT LIKE 'pg_%'
ORDER BY routine_name;

-- EXPECTED FUNCTIONS:
-- 1. create_department_statuses (SAFE - creates initial status records)
-- 2. get_admin_summary_stats (NEEDED - for admin dashboard)
-- 3. get_department_workload (NEEDED - for statistics)
-- 4. get_form_statistics (NEEDED - for dashboard)
-- 5. update_updated_at_column (SAFE - updates timestamps)
--
-- Should NOT see:
-- - update_form_status_on_department_action (removed - caused auto-approval)

SELECT '--- If get_admin_summary_stats is missing, run: supabase/ADD_ADMIN_SUMMARY_STATS_FUNCTION.sql ---' as note;

-- ============================================================================
-- SECTION 3: CHECK FORM STATUS INTEGRITY
-- ============================================================================

SELECT '=== SECTION 3: FORM STATUS INTEGRITY ===' as section;

-- Check for any forms with invalid statuses
SELECT 
    id,
    registration_no,
    status,
    created_at
FROM no_dues_forms
WHERE status NOT IN ('pending', 'completed', 'rejected')
ORDER BY created_at DESC;

-- EXPECTED: Should return 0 rows (no invalid statuses)

-- Check forms that might be incorrectly marked as completed
SELECT 
    f.id,
    f.registration_no,
    f.student_name,
    f.status as form_status,
    COUNT(s.id) as total_depts,
    COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN s.status = 'rejected' THEN 1 END) as rejected_count,
    f.created_at
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON s.form_id = f.id
WHERE f.status = 'completed'
GROUP BY f.id, f.registration_no, f.student_name, f.status, f.created_at
HAVING COUNT(CASE WHEN s.status = 'approved' THEN 1 END) < 12
ORDER BY f.created_at DESC
LIMIT 10;

-- EXPECTED: Should return 0 rows
-- If rows returned: Forms marked 'completed' without all 12 approvals (AUTO-APPROVAL BUG!)

SELECT '--- If forms show completed without 12 approvals, the trigger is still active! ---' as critical_warning;

-- ============================================================================
-- SECTION 4: CHECK DEPARTMENT STATUS RECORDS
-- ============================================================================

SELECT '=== SECTION 4: DEPARTMENT STATUS RECORDS ===' as section;

-- Check if all forms have exactly 12 department status records
SELECT 
    f.id as form_id,
    f.registration_no,
    f.status as form_status,
    COUNT(s.id) as department_count,
    f.created_at
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON s.form_id = f.id
GROUP BY f.id, f.registration_no, f.status, f.created_at
HAVING COUNT(s.id) != 12
ORDER BY f.created_at DESC;

-- EXPECTED: Should return 0 rows (all forms should have exactly 12 department records)
-- If rows returned: Some forms missing department status records (orphaned data)

-- ============================================================================
-- SECTION 5: CHECK ORPHANED RECORDS
-- ============================================================================

SELECT '=== SECTION 5: ORPHANED RECORDS CHECK ===' as section;

-- Find department status records with no corresponding form (orphaned)
SELECT 
    s.id as status_id,
    s.form_id,
    s.department_name,
    s.status,
    s.created_at
FROM no_dues_status s
LEFT JOIN no_dues_forms f ON f.id = s.form_id
WHERE f.id IS NULL
ORDER BY s.created_at DESC;

-- EXPECTED: Should return 0 rows
-- If rows returned: Orphaned status records exist (can cause 404 errors)

-- ============================================================================
-- SECTION 6: CHECK CERTIFICATE GENERATION
-- ============================================================================

SELECT '=== SECTION 6: CERTIFICATE STATUS ===' as section;

-- Check completed forms without certificates
SELECT 
    f.id,
    f.registration_no,
    f.student_name,
    f.status,
    f.certificate_url,
    COUNT(s.id) as dept_count,
    COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved_count,
    f.created_at
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON s.form_id = f.id
WHERE f.status = 'completed'
AND f.certificate_url IS NULL
GROUP BY f.id, f.registration_no, f.student_name, f.status, f.certificate_url, f.created_at
ORDER BY f.created_at DESC
LIMIT 10;

-- EXPECTED: Could have rows if certificates failed to generate
-- These forms need manual certificate generation

-- ============================================================================
-- SECTION 7: CHECK DEPARTMENT COMPLETENESS
-- ============================================================================

SELECT '=== SECTION 7: DEPARTMENT COMPLETENESS ===' as section;

-- Verify all 12 departments exist
SELECT 
    name,
    display_name,
    email,
    display_order
FROM departments
ORDER BY display_order;

-- EXPECTED: Should return exactly 12 rows
-- If not 12: Some departments are missing from the system

SELECT 
    CASE 
        WHEN COUNT(*) = 12 THEN '✅ All 12 departments exist'
        ELSE '❌ ONLY ' || COUNT(*) || ' departments found - SHOULD BE 12!'
    END as department_check
FROM departments;

-- ============================================================================
-- SECTION 8: CHECK RECENT FORM SUBMISSIONS
-- ============================================================================

SELECT '=== SECTION 8: RECENT FORM SUBMISSIONS (Last 24 Hours) ===' as section;

-- Check recent forms and their immediate status
SELECT 
    f.id,
    f.registration_no,
    f.student_name,
    f.status as form_status,
    f.created_at as submitted_at,
    EXTRACT(EPOCH FROM (NOW() - f.created_at)) / 60 as minutes_ago,
    COUNT(s.id) as dept_records_created,
    COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as already_approved,
    COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as still_pending
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON s.form_id = f.id
WHERE f.created_at > NOW() - INTERVAL '24 hours'
GROUP BY f.id, f.registration_no, f.student_name, f.status, f.created_at
ORDER BY f.created_at DESC;

-- CRITICAL CHECK: If a form shows status='completed' within seconds of submission
-- AND already_approved < 12, then AUTO-APPROVAL BUG is still active!

-- ============================================================================
-- SECTION 9: CHECK USER PROFILES
-- ============================================================================

SELECT '=== SECTION 9: USER PROFILES ===' as section;

-- Count users by role
SELECT 
    role,
    COUNT(*) as user_count,
    array_agg(DISTINCT department_name) as departments
FROM profiles
GROUP BY role
ORDER BY role;

-- EXPECTED:
-- admin: At least 1 user, department_name should be null
-- department: Multiple users, each with a department_name

-- Check for users with invalid roles or missing departments
SELECT 
    id,
    email,
    full_name,
    role,
    department_name,
    created_at
FROM profiles
WHERE (role = 'department' AND department_name IS NULL)
   OR (role = 'admin' AND department_name IS NOT NULL)
   OR role NOT IN ('admin', 'department')
ORDER BY created_at DESC;

-- EXPECTED: Should return 0 rows (all users properly configured)

-- ============================================================================
-- SECTION 10: PERFORMANCE CHECK
-- ============================================================================

SELECT '=== SECTION 10: PERFORMANCE METRICS ===' as section;

-- Count total records
SELECT 
    'Total Forms' as metric,
    COUNT(*) as count
FROM no_dues_forms
UNION ALL
SELECT 
    'Total Status Records' as metric,
    COUNT(*) as count
FROM no_dues_status
UNION ALL
SELECT 
    'Total Departments' as metric,
    COUNT(*) as count
FROM departments
UNION ALL
SELECT 
    'Total Users' as metric,
    COUNT(*) as count
FROM profiles;

-- Average response times by department
SELECT 
    department_name,
    COUNT(*) as processed_requests,
    ROUND(AVG(EXTRACT(EPOCH FROM (action_at - created_at)) / 3600)::NUMERIC, 2) as avg_hours_to_respond,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
FROM no_dues_status
WHERE action_at IS NOT NULL
GROUP BY department_name
ORDER BY avg_hours_to_respond;

-- ============================================================================
-- SUMMARY AND ACTION ITEMS
-- ============================================================================

SELECT '=== DIAGNOSTIC COMPLETE - REVIEW RESULTS ABOVE ===' as summary;

SELECT '
ACTION ITEMS IF ISSUES FOUND:

1. AUTO-APPROVAL BUG STILL ACTIVE:
   → Run: supabase/REMOVE_TRIGGERS.sql
   → Verify trigger_update_form_status is gone

2. MISSING DATABASE FUNCTION:
   → Run: supabase/ADD_ADMIN_SUMMARY_STATS_FUNCTION.sql
   → Verify get_admin_summary_stats exists

3. ORPHANED RECORDS FOUND:
   → Run: supabase/CLEANUP_ORPHANED_RECORDS.sql
   → This fixes 404 errors in dashboard

4. INVALID STATUSES OR DATA:
   → Review the specific issues above
   → May need manual data correction

5. MISSING DEPARTMENTS:
   → Run the departments INSERT from MASTER_SCHEMA.sql
   → Ensure all 12 departments exist

6. CERTIFICATES NOT GENERATING:
   → Check if certificate_url is NULL for completed forms
   → May need to manually trigger certificate generation

GOOD INDICATORS (No Action Needed):
✅ Only 3 triggers exist (no trigger_update_form_status)
✅ All functions present including get_admin_summary_stats
✅ All forms have exactly 12 department status records
✅ No orphaned records
✅ Forms stay pending until manually approved
✅ 12 departments exist in database
✅ Certificates generate when forms complete
' as action_items;

-- ============================================================================
-- END OF DIAGNOSTIC
-- ============================================================================