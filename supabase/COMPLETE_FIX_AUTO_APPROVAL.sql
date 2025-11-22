-- ============================================================================
-- COMPLETE FIX FOR AUTO-APPROVAL BUG
-- ============================================================================
-- This is a more comprehensive fix that handles edge cases
-- ============================================================================

-- STEP 1: Drop ALL triggers on no_dues_status table
DROP TRIGGER IF EXISTS trigger_update_form_status ON public.no_dues_status;
DROP TRIGGER IF EXISTS trigger_update_form_status_insert ON public.no_dues_status;
DROP TRIGGER IF EXISTS trigger_update_form_status_update ON public.no_dues_status;

-- STEP 2: Recreate the trigger function with a safety check
CREATE OR REPLACE FUNCTION update_form_status_on_department_action()
RETURNS TRIGGER AS $$
DECLARE
    total_depts INTEGER;
    approved_depts INTEGER;
    rejected_depts INTEGER;
BEGIN
    -- SAFETY CHECK: Only proceed if this is an UPDATE with actual status change
    -- This prevents trigger from running during initial INSERT operations
    IF TG_OP = 'INSERT' THEN
        -- During INSERT, statuses are all 'pending', no need to check completion
        RETURN NEW;
    END IF;
    
    -- Only check if status actually changed
    IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
        -- Status didn't change, no need to update form
        RETURN NEW;
    END IF;
    
    -- Get counts
    SELECT COUNT(*) INTO total_depts
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id;
    
    SELECT COUNT(*) INTO approved_depts
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id AND status = 'approved';
    
    SELECT COUNT(*) INTO rejected_depts
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id AND status = 'rejected';
    
    -- Update form status based on department statuses
    IF rejected_depts > 0 THEN
        UPDATE public.no_dues_forms
        SET status = 'rejected'
        WHERE id = NEW.form_id;
    ELSIF approved_depts = total_depts THEN
        UPDATE public.no_dues_forms
        SET status = 'completed'
        WHERE id = NEW.form_id;
    ELSE
        UPDATE public.no_dues_forms
        SET status = 'pending'
        WHERE id = NEW.form_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Create trigger ONLY on UPDATE
CREATE TRIGGER trigger_update_form_status
    AFTER UPDATE ON public.no_dues_status
    FOR EACH ROW
    EXECUTE FUNCTION update_form_status_on_department_action();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check the trigger configuration
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%form_status%'
ORDER BY trigger_name;

-- Should show:
-- trigger_update_form_status | UPDATE | AFTER | no_dues_status

-- ============================================================================
-- TEST AFTER RUNNING THIS FIX:
-- 1. Submit a new student form
-- 2. Check the form status immediately - should be 'pending'
-- 3. Check all 12 department statuses - should all be 'pending'
-- 4. Have staff approve one department
-- 5. Form should remain 'pending' until ALL departments approve
-- 6. After all approve, form becomes 'completed'
-- ============================================================================