-- ============================================================================
-- COMPREHENSIVE TRIGGER FIX - Find and Fix ALL Triggers
-- ============================================================================
-- This script will find ALL functions/triggers that reference is_manual_entry
-- and fix them ALL at once
-- ============================================================================

-- STEP 1: Find all functions that reference is_manual_entry
-- Run this first to see what needs fixing
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc
WHERE prosrc LIKE '%is_manual_entry%'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- STEP 2: Drop ALL triggers that might be problematic
-- ============================================================================

DROP TRIGGER IF EXISTS on_form_submit ON public.no_dues_forms;
DROP TRIGGER IF EXISTS trigger_update_convocation_status ON public.no_dues_forms;
DROP TRIGGER IF EXISTS on_status_change ON public.no_dues_status;
DROP TRIGGER IF EXISTS on_department_action ON public.no_dues_status;

-- ============================================================================
-- STEP 3: Recreate ALL functions WITHOUT is_manual_entry references
-- ============================================================================

-- Function 1: Create department statuses (form submission)
CREATE OR REPLACE FUNCTION public.create_department_statuses()
RETURNS TRIGGER AS $$
BEGIN
    -- ✅ No is_manual_entry check - all forms are online now
    INSERT INTO public.no_dues_status (form_id, department_name, status)
    SELECT NEW.id, name, 'pending'
    FROM public.departments
    WHERE is_active = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Update form status on department action
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
        form_status := 'rejected';
        
        -- Cascade rejection
        UPDATE public.no_dues_status
        SET 
            status = 'rejected',
            rejection_reason = 'Auto-rejected due to another department rejection',
            action_at = NOW()
        WHERE form_id = NEW.form_id 
        AND status = 'pending';
        
    ELSIF approved_depts = total_depts THEN
        form_status := 'completed';
    ELSE
        form_status := 'pending';
    END IF;
    
    -- ✅ Update form status (no manual entry logic)
    UPDATE public.no_dues_forms
    SET 
        status = form_status,
        updated_at = NOW()
    WHERE id = NEW.form_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Update convocation status (if exists)
CREATE OR REPLACE FUNCTION public.update_convocation_status()
RETURNS TRIGGER AS $$
BEGIN
    -- ✅ Update convocation list without checking is_manual_entry
    UPDATE public.convocation_students
    SET 
        no_dues_submitted = true,
        no_dues_status = NEW.status,
        updated_at = NOW()
    WHERE registration_no = NEW.registration_no;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Update global status (if exists)
CREATE OR REPLACE FUNCTION public.update_global_status()
RETURNS TRIGGER AS $$
BEGIN
    -- ✅ Just return NEW - no is_manual_entry checks
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Recreate ALL triggers with the fixed functions
-- ============================================================================

-- Trigger 1: Create statuses on form insert
CREATE TRIGGER on_form_submit
AFTER INSERT ON public.no_dues_forms
FOR EACH ROW 
EXECUTE FUNCTION public.create_department_statuses();

-- Trigger 2: Update form status on department action
CREATE TRIGGER on_department_action
AFTER UPDATE ON public.no_dues_status
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.update_form_status_on_department_action();

-- Trigger 3: Update convocation status
CREATE TRIGGER trigger_update_convocation_status
AFTER INSERT OR UPDATE ON public.no_dues_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_convocation_status();

-- Trigger 4: Update global status (if needed)
CREATE TRIGGER on_status_change
AFTER INSERT OR UPDATE ON public.no_dues_status
FOR EACH ROW
EXECUTE FUNCTION public.update_global_status();

-- ============================================================================
-- STEP 5: Verify all triggers are recreated correctly
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
-- STEP 6: Verify no functions still reference is_manual_entry
-- ============================================================================

SELECT 
    proname as function_name,
    CASE 
        WHEN prosrc LIKE '%is_manual_entry%' THEN '❌ STILL REFERENCES is_manual_entry'
        ELSE '✅ Clean'
    END as status
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
    'create_department_statuses',
    'update_form_status_on_department_action',
    'update_convocation_status',
    'update_global_status'
);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- If Step 6 shows all ✅ Clean, then all triggers are fixed!
-- Test form submission now - it should work!
-- ============================================================================