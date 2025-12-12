-- ============================================================================
-- CRITICAL FIX: REJECTION CASCADE - When one department rejects, ALL must reject
-- ============================================================================
-- This fixes the workflow so students get immediate feedback and can reapply
-- 
-- PROBLEM: Currently when one department rejects:
-- - Form status becomes 'rejected' ✓
-- - But other departments remain 'pending' ✗
-- - Student sees mixed status (rejected by 1, pending for others) ✗
--
-- SOLUTION: When ANY department rejects:
-- - Set form status to 'rejected' ✓
-- - Set ALL department statuses to 'rejected' ✓ (NEW)
-- - Show "Rejected by X departments" message ✓
-- - Enable "Reapply" button immediately ✓
-- ============================================================================

-- Drop existing trigger function
DROP FUNCTION IF EXISTS update_form_status_on_department_action() CASCADE;

-- Create FIXED trigger function with rejection cascade
CREATE OR REPLACE FUNCTION update_form_status_on_department_action()
RETURNS TRIGGER AS $$
DECLARE
    total_depts INTEGER;
    approved_depts INTEGER;
    rejected_depts INTEGER;
BEGIN
    -- Count total departments for this form
    SELECT COUNT(*) INTO total_depts
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id;
    
    -- Count approved departments
    SELECT COUNT(*) INTO approved_depts
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id AND status = 'approved';
    
    -- Count rejected departments
    SELECT COUNT(*) INTO rejected_depts
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id AND status = 'rejected';
    
    -- ==================== CRITICAL: REJECTION CASCADE ====================
    -- If ANY department rejects, mark ALL departments as rejected
    -- This ensures students get immediate feedback and can reapply
    IF rejected_depts > 0 THEN
        -- Update form status to rejected
        UPDATE public.no_dues_forms
        SET status = 'rejected',
            updated_at = NOW()
        WHERE id = NEW.form_id;
        
        -- CASCADE: Mark ALL other pending departments as rejected
        -- This is the KEY FIX for the rejection workflow
        UPDATE public.no_dues_status
        SET 
            status = 'rejected',
            rejection_reason = CASE 
                WHEN rejection_reason IS NULL THEN 'Form rejected by another department. Please reapply after addressing all concerns.'
                ELSE rejection_reason
            END,
            updated_at = NOW()
        WHERE form_id = NEW.form_id 
        AND status = 'pending';  -- Only update pending ones, keep approved/already-rejected as-is
        
        RAISE NOTICE 'Rejection cascade: Form % marked as rejected across all departments', NEW.form_id;
        
    -- ==================== ALL APPROVED - MARK AS COMPLETED ====================
    ELSIF approved_depts = total_depts THEN
        UPDATE public.no_dues_forms
        SET status = 'completed',
            updated_at = NOW()
        WHERE id = NEW.form_id;
        
        RAISE NOTICE 'All approved: Form % marked as completed', NEW.form_id;
        
    -- ==================== PARTIAL PROGRESS - KEEP AS PENDING ====================
    ELSE
        UPDATE public.no_dues_forms
        SET status = 'pending',
            updated_at = NOW()
        WHERE id = NEW.form_id;
        
        RAISE NOTICE 'Partial progress: Form % remains pending', NEW.form_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_form_status
    AFTER INSERT OR UPDATE ON public.no_dues_status
    FOR EACH ROW
    EXECUTE FUNCTION update_form_status_on_department_action();

-- ============================================================================
-- VERIFICATION QUERY - Run this to test the fix
-- ============================================================================
-- After a department rejects a form, run this query:
--
-- SELECT 
--     f.registration_no,
--     f.status as form_status,
--     s.department_name,
--     s.status as dept_status,
--     s.rejection_reason
-- FROM no_dues_forms f
-- JOIN no_dues_status s ON s.form_id = f.id
-- WHERE f.registration_no = 'YOUR_TEST_REGISTRATION_NO'
-- ORDER BY s.department_name;
--
-- EXPECTED RESULT after one department rejects:
-- - form_status: 'rejected'
-- - ALL dept_status: 'rejected' (not 'pending')
-- - rejection_reason populated for all departments
-- ============================================================================

-- ============================================================================
-- TESTING INSTRUCTIONS
-- ============================================================================
-- 1. Submit a test form
-- 2. Have ONE department reject it
-- 3. Check status page - should show:
--    ✓ "Application Rejected by X Departments"
--    ✓ ALL departments show as "rejected" (no pending ones)
--    ✓ "Reapply with Corrections" button appears immediately
-- 4. Student reapplies - all departments reset to 'pending'
-- 5. Workflow continues normally
-- ============================================================================

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  REJECTION CASCADE FIX APPLIED SUCCESSFULLY!          ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ When ANY department rejects:';
    RAISE NOTICE '   - Form status → rejected';
    RAISE NOTICE '   - ALL pending departments → rejected';
    RAISE NOTICE '   - Student sees clear rejection message';
    RAISE NOTICE '   - Reapply button appears immediately';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Re-apply button logic already working in:';
    RAISE NOTICE '   - src/components/student/StatusTracker.jsx (line 221)';
    RAISE NOTICE '   - Shows when: hasRejection && !completed';
    RAISE NOTICE '';
    RAISE NOTICE '🔥 CRITICAL: This fixes the core workflow issue!';
    RAISE NOTICE '';
END $$;