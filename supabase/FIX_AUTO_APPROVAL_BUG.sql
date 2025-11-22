-- ============================================================================
-- FIX AUTO-APPROVAL BUG
-- ============================================================================
-- ISSUE: Forms are automatically marked as "completed" immediately after 
--        submission because the trigger fires on AFTER INSERT, creating a 
--        race condition during the initial creation of department statuses.
--
-- SOLUTION: Change trigger to only fire on UPDATE, not INSERT.
--           Initial INSERTs are all 'pending' so no need to check completion.
-- ============================================================================

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trigger_update_form_status ON public.no_dues_status;

-- Recreate the trigger WITHOUT "INSERT" - only on UPDATE
CREATE TRIGGER trigger_update_form_status
    AFTER UPDATE ON public.no_dues_status
    FOR EACH ROW
    EXECUTE FUNCTION update_form_status_on_department_action();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this fix:
-- 1. Submit a new student form
-- 2. Verify form status is 'pending' (not 'completed')
-- 3. Verify all 12 department statuses are 'pending'
-- 4. Staff can approve/reject normally
-- 5. Only when ALL departments approve does status become 'completed'
-- ============================================================================