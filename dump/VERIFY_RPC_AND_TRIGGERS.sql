-- ============================================================================
-- VERIFY RPCs AND TRIGGERS - NO DUES SYSTEM
-- ============================================================================
-- Run this script to confirm that all necessary database functions and triggers exist.

DO $$ 
DECLARE
    missing_funcs text[] := ARRAY[]::text[];
    missing_triggers text[] := ARRAY[]::text[];
BEGIN
    RAISE NOTICE 'STARTED: Database Function & Trigger Check';
    RAISE NOTICE '---------------------------------------------------';

    -- 1. CHECK RPC FUNCTIONS (Used by Admin Dashboard)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_form_statistics') THEN
        RAISE NOTICE 'OK: Function get_form_statistics exists';
    ELSE
        RAISE WARNING 'CRITICAL: Function get_form_statistics is MISSING!';
        missing_funcs := array_append(missing_funcs, 'get_form_statistics');
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_department_workload') THEN
        RAISE NOTICE 'OK: Function get_department_workload exists';
    ELSE
        RAISE WARNING 'CRITICAL: Function get_department_workload is MISSING!';
        missing_funcs := array_append(missing_funcs, 'get_department_workload');
    END IF;

    -- 2. CHECK STATUS AUTOMATION FUNCTION
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_form_status') THEN
        RAISE NOTICE 'OK: Function update_form_status exists';
    ELSE
        RAISE WARNING 'CRITICAL: Function update_form_status is MISSING!';
        missing_funcs := array_append(missing_funcs, 'update_form_status');
    END IF;

    -- 3. CHECK TRIGGER (Ensures form marks as 'completed' automatically)
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_form_status' 
        AND tgrelid = 'public.no_dues_status'::regclass
    ) THEN
        RAISE NOTICE 'OK: Trigger trigger_update_form_status exists on no_dues_status';
    ELSE
        RAISE WARNING 'CRITICAL: Trigger trigger_update_form_status is MISSING!';
        missing_triggers := array_append(missing_triggers, 'trigger_update_form_status');
    END IF;

    RAISE NOTICE '---------------------------------------------------';

    -- 4. SUMMARY
    IF array_length(missing_funcs, 1) > 0 OR array_length(missing_triggers, 1) > 0 THEN
        RAISE WARNING 'FAILED: Missing components detected!';
        IF array_length(missing_funcs, 1) > 0 THEN
            RAISE WARNING 'Missing Functions: %', missing_funcs;
        END IF;
        IF array_length(missing_triggers, 1) > 0 THEN
            RAISE WARNING 'Missing Triggers: %', missing_triggers;
        END IF;
    ELSE
        RAISE NOTICE 'SUCCESS: All critical database functions and triggers are present.';
    END IF;

END $$;
