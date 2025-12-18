-- ============================================================================
-- FIX ALL DATABASE REFERENCES TO DELETED COLUMNS
-- ============================================================================
-- This script:
-- 1. Drops and recreates RPC functions with correct signatures
-- 2. Finds and drops any triggers/views referencing deleted columns
-- 3. Verifies the database is clean
-- ============================================================================

-- PART 1: DROP OLD RPC FUNCTIONS (if they exist with wrong signatures)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_form_statistics();
DROP FUNCTION IF EXISTS public.get_department_workload();
DROP FUNCTION IF EXISTS public.get_manual_entry_statistics();

-- PART 2: CREATE RPC FUNCTIONS WITH CORRECT SIGNATURES
-- ============================================================================

-- 1. Function for overall form statistics
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

-- 2. Function for department workload statistics
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

-- 3. Function for manual entry statistics
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
        RETURN QUERY
        SELECT 
            0::BIGINT as total_entries,
            0::BIGINT as pending_entries,
            0::BIGINT as approved_entries,
            0::BIGINT as rejected_entries;
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_form_statistics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_department_workload() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_manual_entry_statistics() TO authenticated, service_role;

-- PART 3: FIND AND DROP PROBLEMATIC TRIGGERS
-- ============================================================================

-- Find triggers that reference is_manual_entry
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN 
        SELECT DISTINCT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE action_statement LIKE '%is_manual_entry%'
           OR action_statement LIKE '%manual_status%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', 
                      trigger_rec.trigger_name, 
                      trigger_rec.event_object_table);
        RAISE NOTICE 'Dropped trigger: % on %', trigger_rec.trigger_name, trigger_rec.event_object_table;
    END LOOP;
END $$;

-- PART 4: FIND AND DROP PROBLEMATIC VIEWS
-- ============================================================================

-- Find views that reference deleted columns
DO $$
DECLARE
    view_rec RECORD;
BEGIN
    FOR view_rec IN 
        SELECT table_name
        FROM information_schema.views
        WHERE table_schema = 'public'
          AND (view_definition LIKE '%is_manual_entry%' 
               OR view_definition LIKE '%manual_status%'
               OR view_definition LIKE '%manual_certificate_url%'
               OR view_definition LIKE '%manual_entry_approved_by%')
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', view_rec.table_name);
        RAISE NOTICE 'Dropped view: %', view_rec.table_name;
    END LOOP;
END $$;

-- PART 5: VERIFICATION QUERIES
-- ============================================================================

-- Test RPC functions
SELECT 'Testing get_form_statistics()' as test;
SELECT * FROM get_form_statistics();

SELECT 'Testing get_department_workload()' as test;
SELECT * FROM get_department_workload();

SELECT 'Testing get_manual_entry_statistics()' as test;
SELECT * FROM get_manual_entry_statistics();

-- Check for any remaining references to deleted columns
SELECT 'Checking for remaining column references' as test;

-- Check triggers
SELECT 
    'TRIGGER' as object_type,
    trigger_name as name,
    event_object_table as table_name
FROM information_schema.triggers
WHERE action_statement LIKE '%is_manual_entry%'
   OR action_statement LIKE '%manual_status%'
   OR action_statement LIKE '%manual_certificate_url%';

-- Check views
SELECT 
    'VIEW' as object_type,
    table_name as name,
    'n/a' as table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND (view_definition LIKE '%is_manual_entry%' 
       OR view_definition LIKE '%manual_status%'
       OR view_definition LIKE '%manual_certificate_url%');

-- Check functions
SELECT 
    'FUNCTION' as object_type,
    routine_name as name,
    'n/a' as table_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND (routine_definition LIKE '%is_manual_entry%' 
       OR routine_definition LIKE '%manual_status%'
       OR routine_definition LIKE '%manual_certificate_url%');

-- ============================================================================
-- EXPECTED RESULT
-- ============================================================================
-- After running this script, you should see:
-- 1. "Dropped trigger: ..." messages for any problematic triggers
-- 2. "Dropped view: ..." messages for any problematic views
-- 3. Test queries should return data without errors
-- 4. Verification queries should return NO ROWS (meaning no references found)
-- ============================================================================