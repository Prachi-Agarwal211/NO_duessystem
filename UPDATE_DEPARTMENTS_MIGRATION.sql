-- ============================================================================
-- DEPARTMENT STRUCTURE UPDATE MIGRATION
-- ============================================================================
-- This script updates the departments table structure:
-- REMOVES: JIC and Student Council
-- ADDS: Registrar (after Accounts)
-- UPDATES: Display order for all departments
-- 
-- Run this in Supabase SQL Editor AFTER backing up your data
-- ============================================================================

-- Step 1: Backup existing department statuses (IMPORTANT!)
-- This preserves all approval/rejection data before department changes
CREATE TABLE IF NOT EXISTS departments_backup_20251211 AS
SELECT * FROM public.departments;

CREATE TABLE IF NOT EXISTS no_dues_status_backup_20251211 AS
SELECT * FROM public.no_dues_status;

-- Step 2: Deactivate JIC and Student Council (preserve data, mark inactive)
UPDATE public.departments
SET is_active = false,
    updated_at = NOW()
WHERE name IN ('jic', 'student_council');

-- Step 3: Add Registrar department
INSERT INTO public.departments (name, display_name, email, display_order, is_school_specific, is_active)
VALUES ('registrar', 'Registrar', 'registrar@jecrcu.edu.in', 10, false, true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    display_order = EXCLUDED.display_order,
    is_school_specific = EXCLUDED.is_school_specific,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Step 4: Update display order and display names for all active departments
UPDATE public.departments
SET display_order = 1, updated_at = NOW()
WHERE name = 'school_hod' AND is_active = true;

UPDATE public.departments
SET display_order = 2, updated_at = NOW()
WHERE name = 'library' AND is_active = true;

UPDATE public.departments
SET display_order = 3, updated_at = NOW()
WHERE name = 'it_department' AND is_active = true;

UPDATE public.departments
SET display_order = 4, updated_at = NOW()
WHERE name = 'hostel' AND is_active = true;

UPDATE public.departments
SET display_order = 5, updated_at = NOW()
WHERE name = 'mess' AND is_active = true;

UPDATE public.departments
SET display_order = 6, updated_at = NOW()
WHERE name = 'canteen' AND is_active = true;

UPDATE public.departments
SET display_order = 7, updated_at = NOW()
WHERE name = 'tpo' AND is_active = true;

UPDATE public.departments
SET display_order = 8, updated_at = NOW()
WHERE name = 'alumni_association' AND is_active = true;

UPDATE public.departments
SET display_order = 9, 
    display_name = 'Accounts',  -- Simplified name
    updated_at = NOW()
WHERE name = 'accounts_department' AND is_active = true;

UPDATE public.departments
SET display_order = 10, updated_at = NOW()
WHERE name = 'registrar' AND is_active = true;

-- Step 5: Handle existing no_dues_status records for JIC and Student Council
-- Option A: Delete status records for inactive departments (RECOMMENDED for clean migration)
-- Uncomment if you want to remove JIC/Student Council statuses from existing forms
-- DELETE FROM public.no_dues_status
-- WHERE department_name IN ('jic', 'student_council');

-- Option B: Keep historical data but mark as archived (alternative)
-- This preserves the data but doesn't affect new forms
-- (No action needed - they're already in backup table)

-- Step 6: For NEW forms submitted after this migration, add Registrar status
-- This trigger function already handles this via create_department_statuses()
-- It will automatically create statuses only for active departments

-- Step 7: Update forms currently in progress (OPTIONAL)
-- Add Registrar status to existing pending/rejected forms so they need Registrar approval
-- Uncomment if you want existing forms to require Registrar approval
/*
INSERT INTO public.no_dues_status (form_id, department_name, status)
SELECT DISTINCT f.id, 'registrar', 'pending'
FROM public.no_dues_forms f
WHERE f.status IN ('pending', 'rejected')
  AND NOT EXISTS (
    SELECT 1 FROM public.no_dues_status s
    WHERE s.form_id = f.id AND s.department_name = 'registrar'
  );
*/

-- Step 8: Verification queries
DO $$
DECLARE
    active_dept_count INTEGER;
    inactive_dept_count INTEGER;
    registrar_exists BOOLEAN;
BEGIN
    -- Count active departments
    SELECT COUNT(*) INTO active_dept_count
    FROM public.departments
    WHERE is_active = true;
    
    -- Count inactive departments
    SELECT COUNT(*) INTO inactive_dept_count
    FROM public.departments
    WHERE is_active = false;
    
    -- Check if registrar exists
    SELECT EXISTS(
        SELECT 1 FROM public.departments
        WHERE name = 'registrar' AND is_active = true
    ) INTO registrar_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════╗';
    RAISE NOTICE '║   DEPARTMENT MIGRATION VERIFICATION           ║';
    RAISE NOTICE '╚════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Active Departments: %', active_dept_count;
    RAISE NOTICE '   Expected: 9 departments';
    RAISE NOTICE '';
    RAISE NOTICE '📦 Inactive Departments: %', inactive_dept_count;
    RAISE NOTICE '   (JIC and Student Council should be inactive)';
    RAISE NOTICE '';
    RAISE NOTICE '🆕 Registrar Added: %', CASE WHEN registrar_exists THEN 'YES ✅' ELSE 'NO ❌' END;
    RAISE NOTICE '';
    
    IF active_dept_count = 9 AND registrar_exists THEN
        RAISE NOTICE '✅ Migration completed successfully!';
    ELSE
        RAISE NOTICE '⚠️  Warning: Please verify department counts';
    END IF;
    RAISE NOTICE '';
END $$;

-- Display final department structure
SELECT
    name,
    display_name,
    display_order,
    is_active,
    CASE WHEN is_active THEN '✅ Active' ELSE '❌ Inactive' END as status
FROM public.departments
ORDER BY
    CASE WHEN is_active THEN 0 ELSE 1 END,
    display_order;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Verify the department list above shows 9 active departments
-- 2. Check that 'registrar' is at display_order 10
-- 3. Confirm 'jic' and 'student_council' are marked inactive
-- 4. Update your application code if it has hardcoded department lists
-- 5. Test student form submission to ensure all 9 departments get status records
-- 6. Backup tables created: departments_backup_20251211, no_dues_status_backup_20251211
-- ============================================================================