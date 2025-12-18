-- ============================================================================
-- OPTIMIZATION DEPLOYMENT VERIFICATION SCRIPT
-- ============================================================================
-- Run this script AFTER deploying the performance optimization to verify
-- that all changes were applied correctly.
--
-- Expected Output: All checks should show ✅ PASS
-- ============================================================================

DO $$
DECLARE
    -- Counters
    total_forms INTEGER;
    total_statuses INTEGER;
    expected_statuses INTEGER;
    orphaned_statuses INTEGER;
    missing_statuses INTEGER;
    total_departments INTEGER;
    staff_without_depts INTEGER;
    
    -- Index checks
    idx_dept_status BOOLEAN;
    idx_form_id BOOLEAN;
    idx_forms_status BOOLEAN;
    idx_student_search BOOLEAN;
    idx_pending BOOLEAN;
    idx_action_history BOOLEAN;
    
    -- Function checks
    func_stats_exists BOOLEAN;
    func_workload_exists BOOLEAN;
    
    -- Test data
    test_total BIGINT;
    test_pending BIGINT;
    test_approved BIGINT;
    test_rejected BIGINT;
    
    -- Pass/Fail tracking
    total_checks INTEGER := 0;
    passed_checks INTEGER := 0;
    
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║   PERFORMANCE OPTIMIZATION DEPLOYMENT VERIFICATION             ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    -- ========================================================================
    -- CHECK 1: RPC FUNCTIONS EXIST AND RETURN DATA
    -- ========================================================================
    RAISE NOTICE '📋 CHECK 1: RPC Functions';
    RAISE NOTICE '─────────────────────────────────────────────────────────────────';
    
    total_checks := total_checks + 2;
    
    -- Check get_form_statistics exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'get_form_statistics'
    ) INTO func_stats_exists;
    
    IF func_stats_exists THEN
        RAISE NOTICE '✅ PASS: get_form_statistics() exists';
        passed_checks := passed_checks + 1;
    ELSE
        RAISE WARNING '❌ FAIL: get_form_statistics() not found';
    END IF;
    
    -- Check get_department_workload exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'get_department_workload'
    ) INTO func_workload_exists;
    
    IF func_workload_exists THEN
        RAISE NOTICE '✅ PASS: get_department_workload() exists';
        passed_checks := passed_checks + 1;
    ELSE
        RAISE WARNING '❌ FAIL: get_department_workload() not found';
    END IF;
    
    -- Test function output
    IF func_stats_exists THEN
        SELECT total_applications, pending_applications, approved_applications, rejected_applications
        INTO test_total, test_pending, test_approved, test_rejected
        FROM get_form_statistics();
        
        RAISE NOTICE '   → Function output: Total=%, Pending=%, Approved=%, Rejected=%', 
            test_total, test_pending, test_approved, test_rejected;
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================================================
    -- CHECK 2: DATABASE INDEXES
    -- ========================================================================
    RAISE NOTICE '🔍 CHECK 2: Performance Indexes';
    RAISE NOTICE '─────────────────────────────────────────────────────────────────';
    
    total_checks := total_checks + 6;
    
    -- Check each index
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_no_dues_status_dept_status'
    ) INTO idx_dept_status;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_no_dues_status_form_id'
    ) INTO idx_form_id;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_no_dues_forms_status'
    ) INTO idx_forms_status;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_no_dues_forms_student_search'
    ) INTO idx_student_search;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_no_dues_status_pending'
    ) INTO idx_pending;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_no_dues_status_action_history'
    ) INTO idx_action_history;
    
    -- Report results
    IF idx_dept_status THEN
        RAISE NOTICE '✅ PASS: idx_no_dues_status_dept_status';
        passed_checks := passed_checks + 1;
    ELSE
        RAISE WARNING '❌ FAIL: idx_no_dues_status_dept_status missing';
    END IF;
    
    IF idx_form_id THEN
        RAISE NOTICE '✅ PASS: idx_no_dues_status_form_id';
        passed_checks := passed_checks + 1;
    ELSE
        RAISE WARNING '❌ FAIL: idx_no_dues_status_form_id missing';
    END IF;
    
    IF idx_forms_status THEN
        RAISE NOTICE '✅ PASS: idx_no_dues_forms_status';
        passed_checks := passed_checks + 1;
    ELSE
        RAISE WARNING '❌ FAIL: idx_no_dues_forms_status missing';
    END IF;
    
    IF idx_student_search THEN
        RAISE NOTICE '✅ PASS: idx_no_dues_forms_student_search';
        passed_checks := passed_checks + 1;
    ELSE
        RAISE WARNING '❌ FAIL: idx_no_dues_forms_student_search missing';
    END IF;
    
    IF idx_pending THEN
        RAISE NOTICE '✅ PASS: idx_no_dues_status_pending';
        passed_checks := passed_checks + 1;
    ELSE
        RAISE WARNING '❌ FAIL: idx_no_dues_status_pending missing';
    END IF;
    
    IF idx_action_history THEN
        RAISE NOTICE '✅ PASS: idx_no_dues_status_action_history';
        passed_checks := passed_checks + 1;
    ELSE
        RAISE WARNING '❌ FAIL: idx_no_dues_status_action_history missing';
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================================================
    -- CHECK 3: DATA INTEGRITY
    -- ========================================================================
    RAISE NOTICE '🗄️  CHECK 3: Data Integrity';
    RAISE NOTICE '─────────────────────────────────────────────────────────────────';
    
    total_checks := total_checks + 3;
    
    -- Get counts
    SELECT COUNT(*) INTO total_forms FROM no_dues_forms;
    SELECT COUNT(*) INTO total_statuses FROM no_dues_status;
    SELECT COUNT(*) INTO total_departments FROM departments;
    expected_statuses := total_forms * total_departments;
    
    -- Count orphaned statuses (status exists but form doesn't)
    SELECT COUNT(*) INTO orphaned_statuses
    FROM no_dues_status nds 
    WHERE NOT EXISTS (
        SELECT 1 FROM no_dues_forms ndf WHERE ndf.id = nds.form_id
    );
    
    -- Count missing statuses (form exists but missing some department statuses)
    SELECT COUNT(*) INTO missing_statuses
    FROM no_dues_forms f
    CROSS JOIN departments d
    WHERE NOT EXISTS (
        SELECT 1 FROM no_dues_status s 
        WHERE s.form_id = f.id AND s.department_name = d.name
    );
    
    RAISE NOTICE '   Forms: %', total_forms;
    RAISE NOTICE '   Departments: %', total_departments;
    RAISE NOTICE '   Status Rows: %', total_statuses;
    RAISE NOTICE '   Expected: %', expected_statuses;
    RAISE NOTICE '   Orphaned: %', orphaned_statuses;
    RAISE NOTICE '   Missing: %', missing_statuses;
    
    -- Check 3a: No orphaned statuses
    IF orphaned_statuses = 0 THEN
        RAISE NOTICE '✅ PASS: No orphaned status records';
        passed_checks := passed_checks + 1;
    ELSE
        RAISE WARNING '❌ FAIL: Found % orphaned status records', orphaned_statuses;
    END IF;
    
    -- Check 3b: No missing statuses
    IF missing_statuses = 0 THEN
        RAISE NOTICE '✅ PASS: All forms have complete department statuses';
        passed_checks := passed_checks + 1;
    ELSE
        RAISE WARNING '❌ FAIL: Found % missing status records', missing_statuses;
    END IF;
    
    -- Check 3c: Total matches expected (allow extra statuses, just no missing ones)
    IF total_statuses >= expected_statuses THEN
        RAISE NOTICE '✅ PASS: Status count is valid (actual >= expected)';
        passed_checks := passed_checks + 1;
    ELSE
        RAISE WARNING '❌ FAIL: Status count too low (% < %)', total_statuses, expected_statuses;
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================================================
    -- CHECK 4: STAFF AUTHORIZATION
    -- ========================================================================
    RAISE NOTICE '👥 CHECK 4: Staff Authorization';
    RAISE NOTICE '─────────────────────────────────────────────────────────────────';
    
    total_checks := total_checks + 1;
    
    -- Count staff without department mappings
    SELECT COUNT(*) INTO staff_without_depts
    FROM profiles
    WHERE role = 'department' 
      AND (assigned_department_ids IS NULL OR assigned_department_ids = '{}');
    
    IF staff_without_depts = 0 THEN
        RAISE NOTICE '✅ PASS: All staff have department mappings';
        passed_checks := passed_checks + 1;
    ELSE
        RAISE WARNING '❌ FAIL: % staff members without department mappings', staff_without_depts;
        
        -- Show which staff are missing mappings
        RAISE NOTICE '   Missing mappings:';
        FOR rec IN 
            SELECT full_name, department_name
            FROM profiles
            WHERE role = 'department' 
              AND (assigned_department_ids IS NULL OR assigned_department_ids = '{}')
            LIMIT 5
        LOOP
            RAISE NOTICE '     - % (%)', rec.full_name, rec.department_name;
        END LOOP;
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================================================
    -- FINAL SUMMARY
    -- ========================================================================
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║   VERIFICATION SUMMARY                                         ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '   Total Checks: %', total_checks;
    RAISE NOTICE '   Passed: %', passed_checks;
    RAISE NOTICE '   Failed: %', total_checks - passed_checks;
    RAISE NOTICE '';
    
    IF passed_checks = total_checks THEN
        RAISE NOTICE '🎉 ═══════════════════════════════════════════════════════════';
        RAISE NOTICE '🎉  ALL CHECKS PASSED - DEPLOYMENT SUCCESSFUL!';
        RAISE NOTICE '🎉 ═══════════════════════════════════════════════════════════';
    ELSE
        RAISE WARNING '⚠️  ═══════════════════════════════════════════════════════════';
        RAISE WARNING '⚠️   SOME CHECKS FAILED - REVIEW ISSUES ABOVE';
        RAISE WARNING '⚠️  ═══════════════════════════════════════════════════════════';
    END IF;
    
    RAISE NOTICE '';
    
END $$;