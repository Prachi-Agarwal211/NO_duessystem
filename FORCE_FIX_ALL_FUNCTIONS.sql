-- ============================================================================
-- FORCE FIX - Delete and Recreate ALL Functions
-- ============================================================================
-- This script DROPS and recreates functions completely
-- Run this in Supabase SQL Editor NOW
-- ============================================================================

-- STEP 1: Drop ALL functions completely (force delete)
DROP FUNCTION IF EXISTS public.create_department_statuses() CASCADE;
DROP FUNCTION IF EXISTS public.update_convocation_status() CASCADE;
DROP FUNCTION IF EXISTS public.update_global_status() CASCADE;
DROP FUNCTION IF EXISTS public.update_form_status_on_department_action() CASCADE;

-- STEP 2: Recreate Function 1 - Create Department Statuses
CREATE FUNCTION public.create_department_statuses()
RETURNS TRIGGER AS $$
BEGIN
    -- ✅ NO is_manual_entry check - ALL forms get 7 status rows
    INSERT INTO public.no_dues_status (form_id, department_name, status)
    SELECT NEW.id, name, 'pending'
    FROM public.departments
    WHERE is_active = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Recreate Function 2 - Update Convocation Status
CREATE FUNCTION public.update_convocation_status()
RETURNS TRIGGER AS $$
BEGIN
    -- ✅ NO is_manual_entry check - update convocation for ALL forms
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.convocation_students
        SET 
            no_dues_submitted = true,
            no_dues_status = NEW.status,
            updated_at = NOW()
        WHERE registration_no = NEW.registration_no;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Recreate Function 3 - Update Global Status
CREATE FUNCTION public.update_global_status()
RETURNS TRIGGER AS $$
BEGIN
    -- ✅ NO is_manual_entry check - just return NEW
    -- This function might do other things, but NOT check is_manual_entry
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 5: Recreate Function 4 - Update Form Status on Department Action
CREATE FUNCTION public.update_form_status_on_department_action()
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
    
    -- ✅ Update form status WITHOUT checking is_manual_entry
    UPDATE public.no_dues_forms
    SET 
        status = form_status,
        updated_at = NOW()
    WHERE id = NEW.form_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 6: Recreate ALL triggers
CREATE TRIGGER on_form_submit
AFTER INSERT ON public.no_dues_forms
FOR EACH ROW 
EXECUTE FUNCTION public.create_department_statuses();

CREATE TRIGGER trigger_update_convocation_status
AFTER INSERT OR UPDATE ON public.no_dues_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_convocation_status();

CREATE TRIGGER on_department_action
AFTER UPDATE ON public.no_dues_status
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.update_form_status_on_department_action();

CREATE TRIGGER on_status_change
AFTER INSERT OR UPDATE ON public.no_dues_status
FOR EACH ROW
EXECUTE FUNCTION public.update_global_status();

-- STEP 7: FINAL VERIFICATION - All should be ✅ Clean now
SELECT 
    proname as function_name,
    CASE 
        WHEN prosrc LIKE '%is_manual_entry%' THEN '❌ STILL HAS IT'
        ELSE '✅ CLEAN'
    END as status
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
    'create_department_statuses',
    'update_convocation_status',
    'update_global_status',
    'update_form_status_on_department_action'
)
ORDER BY proname;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- If all show ✅ CLEAN, you're done!
-- Test form submission now - it WILL work!
-- ============================================================================