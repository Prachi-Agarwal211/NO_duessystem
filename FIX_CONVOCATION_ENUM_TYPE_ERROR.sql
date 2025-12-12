-- ============================================================================
-- FIX ERROR 42804: column "status" is of type convocation_status but expression is of type text
-- ============================================================================
-- ROOT CAUSE: The convocation_eligible_students.status column uses a custom ENUM type
-- called "convocation_status", but we're trying to assign TEXT values to it
--
-- SOLUTION: Cast values to the correct ENUM type OR use the ENUM values directly
-- ============================================================================

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS trigger_update_convocation_status ON public.no_dues_forms;

-- Drop the old function
DROP FUNCTION IF EXISTS update_convocation_status();

-- Create the FIXED version with proper ENUM type casting
CREATE OR REPLACE FUNCTION update_convocation_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if this student exists in convocation table
    IF EXISTS (
        SELECT 1 
        FROM public.convocation_eligible_students 
        WHERE registration_no = NEW.registration_no
    ) THEN
        -- Update convocation status with proper ENUM casting
        UPDATE public.convocation_eligible_students
        SET
            form_id = NEW.id,
            status = CASE
                -- Manual entry completed
                WHEN NEW.is_manual_entry = true AND NEW.status = 'completed' THEN 
                    'completed_manual'::convocation_status
                -- Manual entry in progress  
                WHEN NEW.is_manual_entry = true THEN 
                    'pending_manual'::convocation_status
                -- Online form completed
                WHEN NEW.status = 'completed' THEN 
                    'completed_online'::convocation_status
                -- Online form in any other state (pending/approved/rejected)
                WHEN NEW.status IN ('pending', 'approved', 'rejected') THEN 
                    'pending_online'::convocation_status
                -- Default: not started
                ELSE 
                    'not_started'::convocation_status
            END,
            updated_at = NOW()
        WHERE registration_no = NEW.registration_no;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_convocation_status
    AFTER INSERT OR UPDATE ON public.no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_convocation_status();

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  CONVOCATION ENUM TYPE ERROR 42804 - FIXED!           ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed Issues:';
    RAISE NOTICE '   1. Changed ::text to ::convocation_status casting';
    RAISE NOTICE '   2. All CASE branches now return correct ENUM type';
    RAISE NOTICE '   3. Added EXISTS check for safety';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Form submission should now work!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Test Now:';
    RAISE NOTICE '   1. Submit form with any registration number';
    RAISE NOTICE '   2. Verify no more error 42804';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFICATION: Check the ENUM type definition
-- ============================================================================
-- Run this to see the valid ENUM values:
--
-- SELECT 
--     t.typname AS enum_type,
--     e.enumlabel AS enum_value,
--     e.enumsortorder AS sort_order
-- FROM pg_type t 
-- JOIN pg_enum e ON t.oid = e.enumtypid  
-- WHERE t.typname = 'convocation_status'
-- ORDER BY e.enumsortorder;
--
-- Expected values:
-- - not_started
-- - pending_online
-- - pending_manual
-- - completed_online
-- - completed_manual
-- ============================================================================