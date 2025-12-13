-- =====================================================
-- CRITICAL DATABASE VERIFICATION AND FIX SCRIPT
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- ========== STEP 1: VERIFY TRIGGER EXISTS ==========
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_create_department_statuses'
    ) THEN
        RAISE NOTICE '✅ Trigger exists: trigger_create_department_statuses';
    ELSE
        RAISE NOTICE '❌ CRITICAL: Trigger MISSING! Need to create it!';
    END IF;
END $$;

-- ========== STEP 2: CHECK FOR FORMS WITHOUT STATUS RECORDS ==========
SELECT 
    'Forms without status records' as issue,
    COUNT(*) as count,
    ARRAY_AGG(registration_no) as affected_registrations
FROM no_dues_forms nf
WHERE is_manual_entry = false
AND NOT EXISTS (
    SELECT 1 FROM no_dues_status ns 
    WHERE ns.form_id = nf.id
);

-- ========== STEP 3: CREATE TRIGGER IF MISSING ==========
-- Create function to auto-create department status records
CREATE OR REPLACE FUNCTION create_department_statuses()
RETURNS TRIGGER AS $$
BEGIN
    -- Only for ONLINE forms (not manual entries)
    IF NEW.is_manual_entry = false OR NEW.is_manual_entry IS NULL THEN
        -- Insert 11 department status records
        INSERT INTO no_dues_status (
            form_id,
            department_name,
            status,
            created_at
        )
        SELECT 
            NEW.id,
            dept_name,
            'pending',
            NOW()
        FROM (
            VALUES 
                ('Library'),
                ('Accounts'),
                ('Hostel'),
                ('Transport'),
                ('Sports'),
                ('Academic'),
                ('IT'),
                ('Examination'),
                ('Training & Placement'),
                ('Student Welfare'),
                ('Department')
        ) AS departments(dept_name);
        
        RAISE NOTICE '✅ Created 11 department status records for form: %', NEW.id;
    ELSE
        RAISE NOTICE 'ℹ️ Skipped status creation for manual entry: %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_create_department_statuses ON no_dues_forms;

-- Create trigger
CREATE TRIGGER trigger_create_department_statuses
    AFTER INSERT ON no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION create_department_statuses();

-- ========== STEP 4: BACKFILL MISSING STATUS RECORDS ==========
DO $$
DECLARE
    form_record RECORD;
    inserted_count INTEGER := 0;
BEGIN
    -- Find all online forms without status records
    FOR form_record IN 
        SELECT id, registration_no 
        FROM no_dues_forms 
        WHERE (is_manual_entry = false OR is_manual_entry IS NULL)
        AND NOT EXISTS (
            SELECT 1 FROM no_dues_status 
            WHERE form_id = no_dues_forms.id
        )
    LOOP
        -- Insert 11 department status records
        INSERT INTO no_dues_status (
            form_id,
            department_name,
            status,
            created_at
        )
        SELECT 
            form_record.id,
            dept_name,
            'pending',
            NOW()
        FROM (
            VALUES 
                ('Library'),
                ('Accounts'),
                ('Hostel'),
                ('Transport'),
                ('Sports'),
                ('Academic'),
                ('IT'),
                ('Examination'),
                ('Training & Placement'),
                ('Student Welfare'),
                ('Department')
        ) AS departments(dept_name);
        
        inserted_count := inserted_count + 1;
        RAISE NOTICE '✅ Backfilled statuses for form: % (Reg: %)', form_record.id, form_record.registration_no;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ BACKFILL COMPLETE: % forms fixed', inserted_count;
    RAISE NOTICE '========================================';
END $$;

-- ========== STEP 5: MIGRATE OLD MANUAL ENTRY STATUS ==========
-- Fix any manual entries that have 'completed' status
UPDATE no_dues_forms 
SET status = 'approved',
    updated_at = NOW()
WHERE is_manual_entry = true 
AND status = 'completed';

-- Show how many were updated
SELECT 
    'Manual entries migrated from completed to approved' as action,
    COUNT(*) as count
FROM no_dues_forms 
WHERE is_manual_entry = true 
AND status = 'approved';

-- ========== STEP 6: VERIFY SYSTEM STATE ==========
-- Check forms and their status records
SELECT 
    'VERIFICATION REPORT' as report_type,
    (SELECT COUNT(*) FROM no_dues_forms WHERE is_manual_entry = false) as online_forms_total,
    (SELECT COUNT(DISTINCT form_id) FROM no_dues_status) as forms_with_statuses,
    (SELECT COUNT(*) FROM no_dues_forms WHERE is_manual_entry = true) as manual_entries_total,
    (SELECT COUNT(*) FROM no_dues_forms WHERE is_manual_entry = true AND status = 'pending') as manual_pending,
    (SELECT COUNT(*) FROM no_dues_forms WHERE is_manual_entry = true AND status = 'approved') as manual_approved,
    (SELECT COUNT(*) FROM no_dues_forms WHERE is_manual_entry = true AND status = 'rejected') as manual_rejected;

-- ========== STEP 7: CHECK FOR ORPHANED STATUS RECORDS ==========
-- Find status records without parent forms (shouldn't exist)
SELECT 
    'Orphaned status records (need cleanup)' as issue,
    COUNT(*) as count
FROM no_dues_status ns
WHERE NOT EXISTS (
    SELECT 1 FROM no_dues_forms nf 
    WHERE nf.id = ns.form_id
);

-- ========== STEP 8: VERIFY DEPARTMENT CONFIGURATION ==========
-- Check that all 11 departments are properly configured
SELECT 
    department_name,
    COUNT(*) as forms_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
FROM no_dues_status
GROUP BY department_name
ORDER BY department_name;

-- ========== STEP 9: CHECK RLS POLICIES ==========
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('no_dues_forms', 'no_dues_status', 'profiles')
ORDER BY tablename, policyname;

-- ========== STEP 10: FINAL HEALTH CHECK ==========
DO $$
DECLARE
    online_forms INTEGER;
    forms_with_statuses INTEGER;
    forms_missing_statuses INTEGER;
    manual_entries INTEGER;
    trigger_exists BOOLEAN;
BEGIN
    -- Count online forms
    SELECT COUNT(*) INTO online_forms 
    FROM no_dues_forms 
    WHERE is_manual_entry = false OR is_manual_entry IS NULL;
    
    -- Count forms with statuses
    SELECT COUNT(DISTINCT form_id) INTO forms_with_statuses 
    FROM no_dues_status;
    
    -- Calculate missing
    forms_missing_statuses := online_forms - forms_with_statuses;
    
    -- Count manual entries
    SELECT COUNT(*) INTO manual_entries 
    FROM no_dues_forms 
    WHERE is_manual_entry = true;
    
    -- Check trigger
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_create_department_statuses'
    ) INTO trigger_exists;
    
    -- Print report
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SYSTEM HEALTH CHECK REPORT';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Online Forms: %', online_forms;
    RAISE NOTICE 'Forms with Status Records: %', forms_with_statuses;
    RAISE NOTICE 'Forms Missing Statuses: % %', forms_missing_statuses, 
        CASE WHEN forms_missing_statuses > 0 THEN '❌ NEEDS FIX' ELSE '✅' END;
    RAISE NOTICE 'Manual Entries: %', manual_entries;
    RAISE NOTICE 'Trigger Exists: % %', trigger_exists,
        CASE WHEN trigger_exists THEN '✅' ELSE '❌ CRITICAL' END;
    RAISE NOTICE '========================================';
    
    IF forms_missing_statuses = 0 AND trigger_exists THEN
        RAISE NOTICE '✅✅✅ SYSTEM HEALTHY - All checks passed!';
    ELSE
        RAISE NOTICE '❌❌❌ SYSTEM UNHEALTHY - Issues detected!';
    END IF;
    RAISE NOTICE '========================================';
END $$;

-- ========== COMPLETION MESSAGE ==========
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉🎉🎉 DATABASE FIX SCRIPT COMPLETED 🎉🎉🎉';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Review the output above for any errors';
    RAISE NOTICE '2. If "SYSTEM HEALTHY" - deploy the code changes';
    RAISE NOTICE '3. If issues remain - share the output for analysis';
    RAISE NOTICE '';
END $$;