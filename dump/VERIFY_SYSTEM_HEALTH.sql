-- ============================================================================
-- VERIFY SYSTEM HEALTH - NO DUES PORTAL
-- ============================================================================
-- Run this script to verify that tables exist, RLS is enabled, and policies are active.

DO $$ 
DECLARE
    table_name text;
    has_rls boolean;
    policy_count int;
    missing_tables text[] := ARRAY[]::text[];
    insecure_tables text[] := ARRAY[]::text[];
    tables_to_check text[] := ARRAY[
        'no_dues_forms', 
        'profiles', 
        'no_dues_status',
        'config_schools',
        'config_courses',
        'config_branches',
        'departments',
        'reminder_logs',
        'support_tickets',
        'no_dues_messages',
        'no_dues_reapplication_history'
    ];
BEGIN
    RAISE NOTICE 'STARTED: System Health Check';
    RAISE NOTICE '---------------------------------------------------';

    -- 1. CHECK TABLE EXISTENCE AND RLS STATUS
    FOREACH table_name IN ARRAY tables_to_check
    LOOP
        SELECT rowsecurity INTO has_rls 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = table_name;

        IF has_rls IS NULL THEN
            RAISE WARNING 'CRITICAL: Table % does NOT exist!', table_name;
            missing_tables := array_append(missing_tables, table_name);
        ELSIF has_rls = FALSE THEN
            RAISE WARNING 'SECURITY WARNING: RLS is NOT enabled on table %', table_name;
            insecure_tables := array_append(insecure_tables, table_name);
        ELSE
            SELECT count(*) INTO policy_count 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = table_name;
            
            RAISE NOTICE 'OK: Table % exists | RLS: Enabled | Policies: %', table_name, policy_count;
            
            IF policy_count = 0 THEN
                RAISE WARNING 'WARNING: Table % has RLS enabled but 0 policies!', table_name;
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE '---------------------------------------------------';

    -- 2. CHECK SECURITY DEFINER FUNCTIONS
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_role') THEN
        RAISE NOTICE 'OK: Helper function get_user_role exists';
    ELSE
        RAISE WARNING 'CRITICAL: Helper function get_user_role is MISSING!';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        RAISE NOTICE 'OK: Helper function is_admin exists';
    ELSE
        RAISE WARNING 'CRITICAL: Helper function is_admin is MISSING!';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_staff_or_admin') THEN
        RAISE NOTICE 'OK: Helper function is_staff_or_admin exists';
    ELSE
        RAISE WARNING 'CRITICAL: Helper function is_staff_or_admin is MISSING!';
    END IF;

    RAISE NOTICE '---------------------------------------------------';

    -- 3. SUMMARY
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE WARNING 'FAILED: Missing tables: %', missing_tables;
    ELSIF array_length(insecure_tables, 1) > 0 THEN
        RAISE WARNING 'FAILED: Tables without RLS: %', insecure_tables;
    ELSE
        RAISE NOTICE 'SUCCESS: All expected tables exist and have RLS enabled.';
    END IF;

END $$;
