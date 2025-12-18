-- ============================================================================
-- CRITICAL CRASH FIXES - RUN THIS IMMEDIATELY
-- ============================================================================
-- This file fixes 3 critical production crashes:
-- 1. Form submission 500 error (trigger references deleted column)
-- 2. Dashboard ReferenceError (variable scoping issue - fixed in code)
-- 3. Student detail 400 error (null user ID - fixed in code)
--
-- Run this in Supabase SQL Editor NOW
-- ============================================================================

-- ============================================================================
-- FIX #1: Form Submission Crash
-- ============================================================================
-- Error: { code: '42703', message: 'record "new" has no field "is_manual_entry"' }
-- Cause: Trigger tries to read deleted column
-- Impact: Students CANNOT submit forms (500 error)
-- ============================================================================

-- Step 1: Drop the old trigger
DROP TRIGGER IF EXISTS on_form_submit ON public.no_dues_forms;

-- Step 2: Recreate function WITHOUT is_manual_entry check
CREATE OR REPLACE FUNCTION public.create_department_statuses()
RETURNS TRIGGER AS $$
BEGIN
    -- ✅ FIX: Removed the 'IF NEW.is_manual_entry' check
    -- Since we separated manual entries into a different table,
    -- ALL inserts into no_dues_forms are now online forms that need 7 status rows
    
    INSERT INTO public.no_dues_status (form_id, department_name, status)
    SELECT NEW.id, name, 'pending'
    FROM public.departments
    WHERE is_active = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Re-enable the trigger
CREATE TRIGGER on_form_submit
AFTER INSERT ON public.no_dues_forms
FOR EACH ROW 
EXECUTE FUNCTION public.create_department_statuses();

-- ============================================================================
-- FIX #2: Update Form Status Trigger (Safety Check)
-- ============================================================================
-- Ensure this trigger also doesn't reference manual entry columns
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_form_status_on_department_action()
RETURNS TRIGGER AS $$
DECLARE
    total_depts INTEGER;
    approved_depts INTEGER;
    rejected_depts INTEGER;
    form_status TEXT;
BEGIN
    -- Count total active departments
    SELECT COUNT(*) INTO total_depts
    FROM public.departments
    WHERE is_active = true;
    
    -- Count approved and rejected for this form
    SELECT 
        COUNT(*) FILTER (WHERE status = 'approved'),
        COUNT(*) FILTER (WHERE status = 'rejected')
    INTO approved_depts, rejected_depts
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id;
    
    -- Determine form status
    IF rejected_depts > 0 THEN
        -- Any rejection = form rejected
        form_status := 'rejected';
        
        -- Cascade: Mark all pending departments as rejected
        UPDATE public.no_dues_status
        SET 
            status = 'rejected',
            rejection_reason = 'Auto-rejected due to another department rejection',
            action_at = NOW()
        WHERE form_id = NEW.form_id 
        AND status = 'pending';
        
    ELSIF approved_depts = total_depts THEN
        -- All approved = form completed
        form_status := 'completed';
    ELSE
        -- Still in progress
        form_status := 'pending';
    END IF;
    
    -- Update form status (✅ no manual entry logic)
    UPDATE public.no_dues_forms
    SET 
        status = form_status,
        updated_at = NOW()
    WHERE id = NEW.form_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for department actions
DROP TRIGGER IF EXISTS on_department_action ON public.no_dues_status;

CREATE TRIGGER on_department_action
AFTER UPDATE ON public.no_dues_status
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.update_form_status_on_department_action();

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to confirm triggers are updated correctly
-- ============================================================================

SELECT 
    trigger_name,
    event_manipulation as "event",
    event_object_table as "table",
    action_statement as "function"
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('no_dues_forms', 'no_dues_status')
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- If you see the triggers listed above, the fix is complete!
-- Now test form submission - it should work without 500 error
-- ============================================================================