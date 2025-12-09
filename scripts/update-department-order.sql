-- ============================================================================
-- Update Department Order and Add Registrar
-- ============================================================================
-- This script:
-- 1. Removes JIC and Student Council
-- 2. Adds Registrar department
-- 3. Reorders departments as requested
-- ============================================================================

BEGIN;

-- Step 1: Deactivate JIC and Student Council (don't delete to preserve history)
UPDATE public.departments 
SET is_active = false
WHERE name IN ('jic', 'student_council');

-- Step 2: Update display order for existing departments
-- New order:
-- 1. School (HOD/Department)
-- 2. Library
-- 3. Hostel
-- 4. Mess
-- 5. Canteen
-- 6. TPO
-- 7. Alumni Association
-- 8. IT Department (moved from position 3)
-- 9. Accounts Department (moved from position 9)
-- 10. Registrar (NEW)

UPDATE public.departments SET display_order = 1 WHERE name = 'school_hod';
UPDATE public.departments SET display_order = 2 WHERE name = 'library';
UPDATE public.departments SET display_order = 3 WHERE name = 'hostel';
UPDATE public.departments SET display_order = 4 WHERE name = 'mess';
UPDATE public.departments SET display_order = 5 WHERE name = 'canteen';
UPDATE public.departments SET display_order = 6 WHERE name = 'tpo';
UPDATE public.departments SET display_order = 7 WHERE name = 'alumni_association';
UPDATE public.departments SET display_order = 8 WHERE name = 'it_department';
UPDATE public.departments SET display_order = 9 WHERE name = 'accounts_department';

-- Step 3: Add Registrar department
INSERT INTO public.departments (name, display_name, email, display_order, is_school_specific, is_active)
VALUES ('registrar', 'Registrar', 'registrar@jecrc.ac.in', 10, false, true)
ON CONFLICT (name) DO UPDATE 
SET 
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    display_order = EXCLUDED.display_order,
    is_active = true;

-- Step 4: Verify the new order
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Updated Department Order:';
    RAISE NOTICE '============================================';
END $$;

SELECT 
    display_order,
    display_name,
    name,
    CASE WHEN is_active THEN '✓ Active' ELSE '✗ Inactive' END as status
FROM public.departments
ORDER BY 
    CASE WHEN is_active THEN 0 ELSE 1 END,  -- Active first
    display_order;

-- Rollback instructions (if needed)
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'To rollback this migration, run:';
    RAISE NOTICE 'ROLLBACK;';
    RAISE NOTICE '';
    RAISE NOTICE 'To commit this migration, run:';
    RAISE NOTICE 'COMMIT;';
    RAISE NOTICE '============================================';
END $$;

-- Don't auto-commit - let user review and commit manually
-- COMMIT;