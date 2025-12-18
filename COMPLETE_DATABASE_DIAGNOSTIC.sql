-- ============================================================================
-- JECRC NO DUES SYSTEM - COMPLETE DATABASE DIAGNOSTIC SCRIPT
-- ============================================================================
-- PURPOSE: Analyze EVERY aspect of the database to understand current state
-- RUN THIS: Copy entire script to Supabase SQL Editor and execute
-- TIME: ~30 seconds to complete all checks
-- ============================================================================

-- Set better display options
\x on
SET client_min_messages TO NOTICE;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  JECRC NO DUES SYSTEM - DATABASE DIAGNOSTIC REPORT               ║';
    RAISE NOTICE '║  Generated: %                                        ║', NOW();
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 1: TABLE EXISTENCE & STRUCTURE CHECK
-- ============================================================================

DO $$
DECLARE
    table_record RECORD;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    required_tables TEXT[] := ARRAY[
        'profiles', 'departments', 'config_schools', 'config_courses', 
        'config_branches', 'no_dues_forms', 'no_dues_status', 
        'email_queue', 'support_tickets', 'audit_log'
    ];
    tbl TEXT;
BEGIN
    RAISE NOTICE '1️⃣  TABLE EXISTENCE CHECK';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    FOREACH tbl IN ARRAY required_tables LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                      WHERE table_schema = 'public' AND table_name = tbl) THEN
            missing_tables := array_append(missing_tables, tbl);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '❌ MISSING TABLES: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ All required tables exist';
    END IF;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 2: COLUMN STRUCTURE ANALYSIS
-- ============================================================================

-- Check no_dues_forms columns (CRITICAL)
DO $$
DECLARE
    has_manual_entry BOOLEAN;
    has_manual_status BOOLEAN;
    has_manual_certificate_url BOOLEAN;
    has_assigned_dept_ids BOOLEAN;
BEGIN
    RAISE NOTICE '2️⃣  COLUMN STRUCTURE ANALYSIS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Check no_dues_forms for manual entry columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' AND column_name = 'is_manual_entry'
    ) INTO has_manual_entry;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' AND column_name = 'manual_status'
    ) INTO has_manual_status;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' AND column_name = 'manual_certificate_url'
    ) INTO has_manual_certificate_url;
    
    RAISE NOTICE '📋 no_dues_forms Table:';
    RAISE NOTICE '   - is_manual_entry column: %', CASE WHEN has_manual_entry THEN '❌ PRESENT (SHOULD BE REMOVED)' ELSE '✅ Removed' END;
    RAISE NOTICE '   - manual_status column: %', CASE WHEN has_manual_status THEN '❌ PRESENT (SHOULD BE REMOVED)' ELSE '✅ Removed' END;
    RAISE NOTICE '   - manual_certificate_url column: %', CASE WHEN has_manual_certificate_url THEN '❌ PRESENT (SHOULD BE REMOVED)' ELSE '✅ Removed' END;
    
    -- Check profiles for assigned_department_ids
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'assigned_department_ids'
    ) INTO has_assigned_dept_ids;
    
    RAISE NOTICE '';
    RAISE NOTICE '👤 profiles Table:';
    RAISE NOTICE '   - assigned_department_ids column: %', CASE WHEN has_assigned_dept_ids THEN '✅ Present' ELSE '❌ MISSING (REQUIRED!)' END;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 3: DATA ANALYSIS
-- ============================================================================

-- Count all records
SELECT 
    '3️⃣  DATA COUNTS' as section,
    '═══════════════════════════════════════════════════════════════' as separator;

SELECT 
    '📊 Core Data:' as category,
    (SELECT COUNT(*) FROM public.config_schools) as schools,
    (SELECT COUNT(*) FROM public.config_courses) as courses,
    (SELECT COUNT(*) FROM public.config_branches) as branches,
    (SELECT COUNT(*) FROM public.departments WHERE is_active = true) as active_departments;

SELECT 
    '👥 User Data:' as category,
    (SELECT COUNT(*) FROM public.profiles) as total_profiles,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') as admins,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'department') as staff;

SELECT 
    '📝 Application Data:' as category,
    (SELECT COUNT(*) FROM public.no_dues_forms) as total_forms,
    (SELECT COUNT(*) FROM public.no_dues_forms WHERE status = 'pending') as pending,
    (SELECT COUNT(*) FROM public.no_dues_forms WHERE status = 'completed') as completed,
    (SELECT COUNT(*) FROM public.no_dues_forms WHERE status = 'rejected') as rejected;

-- ============================================================================
-- SECTION 4: TRIGGER ANALYSIS
-- ============================================================================

SELECT 
    '' as blank,
    '4️⃣  TRIGGER ANALYSIS' as section,
    '═══════════════════════════════════════════════════════════════' as separator;

SELECT 
    '🔧 Active Triggers:' as info,
    COUNT(*) as total_triggers
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- List all triggers with their tables
SELECT 
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- Check for old triggers referencing is_manual_entry
DO $$
DECLARE
    trigger_rec RECORD;
    bad_triggers TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  TRIGGER INTEGRITY CHECK:';
    
    FOR trigger_rec IN 
        SELECT c.relname as table_name, t.tgname as trigger_name, 
               pg_get_triggerdef(t.oid) as definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND NOT t.tgisinternal
    LOOP
        IF trigger_rec.definition LIKE '%is_manual_entry%' THEN
            bad_triggers := array_append(bad_triggers, 
                trigger_rec.table_name || '.' || trigger_rec.trigger_name);
        END IF;
    END LOOP;
    
    IF array_length(bad_triggers, 1) > 0 THEN
        RAISE NOTICE '   ❌ FOUND % TRIGGERS REFERENCING is_manual_entry:', array_length(bad_triggers, 1);
        RAISE NOTICE '      %', array_to_string(bad_triggers, ', ');
        RAISE NOTICE '      🔥 CRITICAL: These will cause INSERT failures!';
    ELSE
        RAISE NOTICE '   ✅ No triggers reference is_manual_entry';
    END IF;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 5: PROFILE & DEPARTMENT LINKAGE
-- ============================================================================

SELECT 
    '' as blank,
    '5️⃣  PROFILE & DEPARTMENT LINKAGE ANALYSIS' as section,
    '═══════════════════════════════════════════════════════════════' as separator;

-- Show all staff profiles with their department assignments
SELECT 
    p.email,
    p.full_name,
    p.role,
    p.department_name as dept_name_string,
    p.assigned_department_ids as dept_uuid_array,
    CASE 
        WHEN p.assigned_department_ids IS NULL THEN '❌ NO UUID ASSIGNMENT'
        WHEN array_length(p.assigned_department_ids, 1) = 0 THEN '❌ EMPTY ARRAY'
        ELSE '✅ Has ' || array_length(p.assigned_department_ids, 1)::TEXT || ' dept(s)'
    END as assignment_status
FROM public.profiles p
WHERE p.role = 'department'
ORDER BY p.email;

-- Check if department UUIDs are valid
DO $$
DECLARE
    profile_rec RECORD;
    dept_uuid UUID;
    dept_name TEXT;
    invalid_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 UUID VALIDITY CHECK:';
    
    FOR profile_rec IN 
        SELECT id, email, full_name, assigned_department_ids 
        FROM public.profiles 
        WHERE role = 'department' AND assigned_department_ids IS NOT NULL
    LOOP
        FOREACH dept_uuid IN ARRAY profile_rec.assigned_department_ids LOOP
            SELECT name INTO dept_name FROM public.departments WHERE id = dept_uuid;
            IF dept_name IS NULL THEN
                RAISE NOTICE '   ❌ % (%): Invalid UUID %', 
                    profile_rec.full_name, profile_rec.email, dept_uuid;
                invalid_count := invalid_count + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    IF invalid_count = 0 THEN
        RAISE NOTICE '   ✅ All assigned department UUIDs are valid';
    ELSE
        RAISE NOTICE '   ❌ Found % invalid UUID assignments', invalid_count;
    END IF;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 6: STATUS ROW ANALYSIS
-- ============================================================================

SELECT 
    '' as blank,
    '6️⃣  STATUS ROW ANALYSIS' as section,
    '═══════════════════════════════════════════════════════════════' as separator;

-- Count status rows per form
WITH status_counts AS (
    SELECT 
        form_id,
        COUNT(*) as dept_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
    FROM public.no_dues_status
    GROUP BY form_id
)
SELECT 
    '📊 Status Row Distribution:' as info,
    COUNT(*) as total_forms_with_status,
    MIN(dept_count) as min_departments,
    MAX(dept_count) as max_departments,
    AVG(dept_count)::NUMERIC(10,2) as avg_departments
FROM status_counts;

-- Find forms missing status rows
SELECT 
    '⚠️  Forms Missing Status Rows:' as warning,
    COUNT(*) as count
FROM public.no_dues_forms f
WHERE NOT EXISTS (
    SELECT 1 FROM public.no_dues_status s WHERE s.form_id = f.id
);

-- Show forms with incomplete status rows (should have 7)
WITH expected_dept_count AS (
    SELECT COUNT(*) as expected FROM public.departments WHERE is_active = true
),
form_status_count AS (
    SELECT 
        f.id,
        f.registration_no,
        f.student_name,
        COUNT(s.id) as actual_dept_count
    FROM public.no_dues_forms f
    LEFT JOIN public.no_dues_status s ON s.form_id = f.id
    GROUP BY f.id, f.registration_no, f.student_name
)
SELECT 
    '❌ Forms with Incomplete Status Rows:' as issue,
    COUNT(*) as affected_forms
FROM form_status_count fsc, expected_dept_count edc
WHERE fsc.actual_dept_count < edc.expected;

-- ============================================================================
-- SECTION 7: DEPARTMENT WORKFLOW ANALYSIS
-- ============================================================================

SELECT 
    '' as blank,
    '7️⃣  DEPARTMENT WORKFLOW ANALYSIS' as section,
    '═══════════════════════════════════════════════════════════════' as separator;

-- Show workload per department
SELECT 
    d.display_name as department,
    COUNT(s.id) FILTER (WHERE s.status = 'pending') as pending,
    COUNT(s.id) FILTER (WHERE s.status = 'approved') as approved,
    COUNT(s.id) FILTER (WHERE s.status = 'rejected') as rejected,
    COUNT(s.id) as total_tasks
FROM public.departments d
LEFT JOIN public.no_dues_status s ON s.department_name = d.name
WHERE d.is_active = true
GROUP BY d.id, d.display_name, d.display_order
ORDER BY d.display_order;

-- ============================================================================
-- SECTION 8: EMAIL QUEUE STATUS
-- ============================================================================

SELECT 
    '' as blank,
    '8️⃣  EMAIL QUEUE STATUS' as section,
    '═══════════════════════════════════════════════════════════════' as separator;

SELECT 
    '📧 Email Queue:' as info,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'sent') as sent,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) as total
FROM public.email_queue;

-- ============================================================================
-- SECTION 9: INDEX ANALYSIS
-- ============================================================================

SELECT 
    '' as blank,
    '9️⃣  INDEX ANALYSIS' as section,
    '═══════════════════════════════════════════════════════════════' as separator;

SELECT 
    '📈 Index Summary:' as info,
    COUNT(*) as total_indexes
FROM pg_indexes 
WHERE schemaname = 'public';

-- Show missing critical indexes
DO $$
DECLARE
    critical_indexes TEXT[] := ARRAY[
        'idx_profiles_email',
        'idx_forms_registration',
        'idx_forms_status',
        'idx_status_form_dept',
        'idx_status_department_pending'
    ];
    idx TEXT;
    missing_indexes TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Critical Index Check:';
    
    FOREACH idx IN ARRAY critical_indexes LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' AND indexname = idx
        ) THEN
            missing_indexes := array_append(missing_indexes, idx);
        END IF;
    END LOOP;
    
    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE NOTICE '   ❌ MISSING CRITICAL INDEXES: %', array_to_string(missing_indexes, ', ');
    ELSE
        RAISE NOTICE '   ✅ All critical indexes present';
    END IF;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 10: FINAL SUMMARY & RECOMMENDATIONS
-- ============================================================================

DO $$
DECLARE
    has_manual_cols BOOLEAN;
    has_assigned_ids BOOLEAN;
    has_bad_triggers BOOLEAN;
    missing_status INTEGER;
    staff_without_uuids INTEGER;
BEGIN
    -- Check issues
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' 
        AND column_name IN ('is_manual_entry', 'manual_status', 'manual_certificate_url')
    ) INTO has_manual_cols;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'assigned_department_ids'
    ) INTO has_assigned_ids;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND pg_get_triggerdef(t.oid) LIKE '%is_manual_entry%'
    ) INTO has_bad_triggers;
    
    SELECT COUNT(*) INTO missing_status
    FROM public.no_dues_forms f
    WHERE NOT EXISTS (
        SELECT 1 FROM public.no_dues_status s WHERE s.form_id = f.id
    );
    
    SELECT COUNT(*) INTO staff_without_uuids
    FROM public.profiles
    WHERE role = 'department' 
    AND (assigned_department_ids IS NULL OR array_length(assigned_department_ids, 1) = 0);
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 FINAL DIAGNOSIS & RECOMMENDATIONS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    IF has_manual_cols THEN
        RAISE NOTICE '🔥 CRITICAL: Manual entry columns still exist in no_dues_forms';
        RAISE NOTICE '   → Run: ALTER TABLE no_dues_forms DROP COLUMN is_manual_entry CASCADE;';
    END IF;
    
    IF NOT has_assigned_ids THEN
        RAISE NOTICE '🔥 CRITICAL: profiles.assigned_department_ids column missing';
        RAISE NOTICE '   → Run: ALTER TABLE profiles ADD COLUMN assigned_department_ids UUID[];';
    END IF;
    
    IF has_bad_triggers THEN
        RAISE NOTICE '🔥 CRITICAL: Triggers reference removed is_manual_entry column';
        RAISE NOTICE '   → This WILL cause form submission failures!';
        RAISE NOTICE '   → Run EMERGENCY_FIX_RUN_THIS_NOW.sql';
    END IF;
    
    IF missing_status > 0 THEN
        RAISE NOTICE '⚠️  WARNING: % forms missing department status rows', missing_status;
        RAISE NOTICE '   → These forms won''t appear in staff dashboards';
    END IF;
    
    IF staff_without_uuids > 0 THEN
        RAISE NOTICE '⚠️  WARNING: % staff accounts missing UUID assignments', staff_without_uuids;
        RAISE NOTICE '   → These staff cannot approve/reject applications';
    END IF;
    
    IF NOT has_manual_cols AND has_assigned_ids AND NOT has_bad_triggers 
       AND missing_status = 0 AND staff_without_uuids = 0 THEN
        RAISE NOTICE '✅ ALL CHECKS PASSED! Database is healthy.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Diagnostic Complete - % UTC', NOW();
    RAISE NOTICE '';
END $$;