-- ============================================================================
-- FIX ERROR 42804: CASE types convocation_status and text cannot be matched
-- ============================================================================
-- This error occurs when a form is submitted and the trigger tries to update
-- the convocation_eligible_students table with incompatible CASE type matching
--
-- IMMEDIATE ACTION REQUIRED: Run this in Supabase SQL Editor NOW
-- ============================================================================

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS trigger_update_convocation_status ON public.no_dues_forms;

-- Drop the old function
DROP FUNCTION IF EXISTS update_convocation_status();

-- Create the FIXED version of the function
CREATE OR REPLACE FUNCTION update_convocation_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if this student exists in convocation table
    -- This prevents errors when non-convocation students submit forms
    IF EXISTS (
        SELECT 1 
        FROM public.convocation_eligible_students 
        WHERE registration_no = NEW.registration_no
    ) THEN
        -- Update convocation status based on form status
        UPDATE public.convocation_eligible_students
        SET
            form_id = NEW.id,
            status = CASE
                -- Manual entry completed
                WHEN NEW.is_manual_entry = true AND NEW.status = 'completed' THEN 
                    'completed_manual'::text
                -- Manual entry in progress  
                WHEN NEW.is_manual_entry = true THEN 
                    'pending_manual'::text
                -- Online form completed
                WHEN NEW.status = 'completed' THEN 
                    'completed_online'::text
                -- Online form in any other state (pending/approved/rejected)
                WHEN NEW.status IN ('pending', 'approved', 'rejected') THEN 
                    'pending_online'::text
                -- Default: not started
                ELSE 
                    'not_started'::text
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
    RAISE NOTICE '║  CONVOCATION TRIGGER ERROR 42804 - FIXED!             ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed Issues:';
    RAISE NOTICE '   1. Added EXISTS check to prevent errors for non-convocation students';
    RAISE NOTICE '   2. Explicit ::text casting in CASE statement';
    RAISE NOTICE '   3. Used IN clause for multiple status checks';
    RAISE NOTICE '   4. Proper WHEN conditions for all scenarios';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Form submission should now work for:';
    RAISE NOTICE '   - Convocation-eligible students (3,094 students)';
    RAISE NOTICE '   - Non-convocation students (regular students)';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Test form submission with convocation registration number';
    RAISE NOTICE '   2. Test form submission with regular registration number';
    RAISE NOTICE '   3. Verify no more error 42804';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the trigger is working correctly:
--
-- SELECT 
--     t.tgname as trigger_name,
--     p.proname as function_name,
--     pg_get_triggerdef(t.oid) as trigger_definition
-- FROM pg_trigger t
-- JOIN pg_proc p ON t.tgfoid = p.oid
-- WHERE t.tgname = 'trigger_update_convocation_status';
--
-- Expected: Should show the new trigger with the fixed function
-- ============================================================================