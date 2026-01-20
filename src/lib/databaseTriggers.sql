-- ============================================================================
-- DATABASE TRIGGERS FOR AUTOMATIC CERTIFICATE GENERATION
-- ============================================================================
-- This SQL script creates database triggers that automatically handle
-- certificate generation when forms are completed.
-- ============================================================================

-- ============================================================================
-- 1. FUNCTION: Check and trigger certificate generation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_and_trigger_certificate()
RETURNS TRIGGER AS $$
DECLARE
    total_depts INTEGER;
    approved_depts INTEGER;
    rejected_depts INTEGER;
    certificate_triggered BOOLEAN := FALSE;
BEGIN
    -- Count department statuses for this form
    SELECT COUNT(*) INTO total_depts FROM public.no_dues_status WHERE form_id = NEW.id;
    SELECT COUNT(*) INTO approved_depts FROM public.no_dues_status WHERE form_id = NEW.id AND status = 'approved';
    SELECT COUNT(*) INTO rejected_depts FROM public.no_dues_status WHERE form_id = NEW.id AND status = 'rejected';

    -- Update form status based on department actions
    IF rejected_depts > 0 THEN
        NEW.status := 'rejected';
    ELSIF approved_depts = total_depts AND total_depts > 0 THEN
        NEW.status := 'completed';
        certificate_triggered := TRUE;
    ELSIF approved_depts > 0 THEN
        NEW.status := 'in_progress';
    ELSE
        NEW.status := 'pending';
    END IF;

    -- Log the status change
    RAISE NOTICE 'Form %: Status updated to % (Approved: %/%, Rejected: %)', 
        NEW.id, NEW.status, approved_depts, total_depts, rejected_depts;

    -- If form is now completed, trigger certificate generation
    IF certificate_triggered AND NEW.status = 'completed' THEN
        RAISE NOTICE '🎯 Form % completed - triggering certificate generation', NEW.id;
        
        -- Note: We can't directly call JavaScript functions from SQL triggers
        -- This is where the application-level trigger (certificateTrigger.js) should be called
        -- The trigger will be called by the application when it detects a form status change to 'completed'
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. TRIGGER: Apply status update logic on form updates
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_form_status ON public.no_dues_forms;

-- Create new trigger that uses the enhanced function
CREATE TRIGGER trigger_update_form_status
    BEFORE UPDATE ON public.no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION public.check_and_trigger_certificate();

-- ============================================================================
-- 3. FUNCTION: Handle department status updates and cascade rejections
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_department_status_update()
RETURNS TRIGGER AS $$
DECLARE
    form_record RECORD;
    rejection_context JSONB;
    total_depts INTEGER;
    approved_depts INTEGER;
    rejected_depts INTEGER;
BEGIN
    -- Get the form record
    SELECT * INTO form_record FROM public.no_dues_forms WHERE id = NEW.form_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Form not found for status update: %', NEW.form_id;
    END IF;

    -- Count department statuses for this form
    SELECT COUNT(*) INTO total_depts FROM public.no_dues_status WHERE form_id = NEW.form_id;
    SELECT COUNT(*) INTO approved_depts FROM public.no_dues_status WHERE form_id = NEW.form_id AND status = 'approved';
    SELECT COUNT(*) INTO rejected_depts FROM public.no_dues_status WHERE form_id = NEW.form_id AND status = 'rejected';

    -- Handle rejection
    IF NEW.status = 'rejected' AND NEW.rejection_reason IS NOT NULL THEN
        -- Build rejection context
        rejection_context := jsonb_build_object(
            'department', NEW.department_name,
            'reason', NEW.rejection_reason,
            'action_at', NEW.action_at,
            'action_by_user_id', NEW.action_by_user_id
        );

        -- Update form with rejection context
        UPDATE public.no_dues_forms 
        SET 
            rejection_context = rejection_context,
            rejection_reason = NEW.rejection_reason,
            status = 'rejected'
        WHERE id = NEW.form_id;

        RAISE NOTICE '❌ Form % rejected by %: %', NEW.form_id, NEW.department_name, NEW.rejection_reason;
    -- Handle approval - check if all departments have approved
    ELSIF NEW.status = 'approved' THEN
        IF approved_depts = total_depts AND total_depts > 0 THEN
            -- All departments approved, update form status to completed
            UPDATE public.no_dues_forms 
            SET 
                status = 'completed',
                rejection_context = NULL,
                rejection_reason = NULL
            WHERE id = NEW.form_id;

            RAISE NOTICE '✅ Form % completed - all departments approved', NEW.form_id;
        ELSIF approved_depts > 0 THEN
            -- Some departments approved, update form status to in_progress
            UPDATE public.no_dues_forms 
            SET 
                status = 'in_progress',
                rejection_context = NULL,
                rejection_reason = NULL
            WHERE id = NEW.form_id;

            RAISE NOTICE '📊 Form % in progress - %/% departments approved', NEW.form_id, approved_depts, total_depts;
        END IF;
    END IF;

    -- Log the status update
    RAISE NOTICE '📝 Department % status updated for form %: %', 
        NEW.department_name, NEW.form_id, NEW.status;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. TRIGGER: Handle department status updates
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_handle_department_status ON public.no_dues_status;

-- Create trigger for department status updates
CREATE TRIGGER trigger_handle_department_status
    AFTER UPDATE ON public.no_dues_status
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_department_status_update();

-- ============================================================================
-- 5. FUNCTION: Initialize form with all department statuses
-- ============================================================================

CREATE OR REPLACE FUNCTION public.initialize_form_departments()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert status rows for all active departments
    INSERT INTO public.no_dues_status (form_id, department_name, status)
    SELECT NEW.id, name, 'pending'
    FROM public.departments
    WHERE is_active = true;

    RAISE NOTICE '📋 Form % initialized with department statuses', NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. TRIGGER: Initialize departments when form is created
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_initialize_departments ON public.no_dues_forms;

-- Create trigger for form initialization
CREATE TRIGGER trigger_initialize_departments
    AFTER INSERT ON public.no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION public.initialize_form_departments();

-- ============================================================================
-- 7. FUNCTION: Cleanup function for debugging
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debug_form_status(form_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    form_record RECORD;
    dept_statuses JSONB[];
    dept_record RECORD;
BEGIN
    -- Get form details
    SELECT * INTO form_record FROM public.no_dues_forms WHERE id = form_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Form not found');
    END IF;

    -- Get all department statuses for this form
    FOR dept_record IN 
        SELECT department_name, status, rejection_reason, action_at, action_by_user_id
        FROM public.no_dues_status 
        WHERE form_id = form_id_param
        ORDER BY department_name
    LOOP
        dept_statuses := array_append(dept_statuses, jsonb_build_object(
            'department', dept_record.department_name,
            'status', dept_record.status,
            'rejection_reason', dept_record.rejection_reason,
            'action_at', dept_record.action_at,
            'action_by_user_id', dept_record.action_by_user_id
        ));
    END LOOP;

    -- Build result
    result := jsonb_build_object(
        'form_id', form_record.id,
        'registration_no', form_record.registration_no,
        'student_name', form_record.student_name,
        'current_status', form_record.status,
        'final_certificate_generated', form_record.final_certificate_generated,
        'certificate_url', form_record.certificate_url,
        'departments', COALESCE(array_to_json(dept_statuses)::jsonb, '[]'::jsonb),
        'rejection_context', form_record.rejection_context,
        'rejection_reason', form_record.rejection_reason
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.check_and_trigger_certificate() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_department_status_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_form_departments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_form_status(UUID) TO authenticated;

-- ============================================================================
-- 9. USAGE NOTES
-- ============================================================================
/*
This trigger system provides:

1. Automatic form status updates when departments approve/reject
2. Cascade rejection handling with context tracking
3. Form initialization with all department statuses
4. Debug function for troubleshooting certificate issues

To debug certificate generation issues:

SELECT * FROM public.debug_form_status('your-form-id-here');

This will show you:
- Current form status
- All department approval statuses
- Whether certificate is already generated
- Rejection context if applicable

The actual certificate generation is handled by the application-level
certificateTrigger.js service, which is called when a form status
becomes 'completed'.
*/
-- ============================================================================
