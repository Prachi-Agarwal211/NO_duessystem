-- ============================================================================
-- DIAGNOSTIC: See the ACTUAL function source code
-- ============================================================================

-- Step 1: Show the ACTUAL source code of each function
SELECT 
    proname as function_name,
    prosrc as actual_source_code
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
-- If you see is_manual_entry in the source above, run the fixes below:
-- ============================================================================

-- Fix 1: create_department_statuses
DROP FUNCTION IF EXISTS public.create_department_statuses() CASCADE;

CREATE FUNCTION public.create_department_statuses()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.no_dues_status (form_id, department_name, status)
    SELECT NEW.id, name, 'pending'
    FROM public.departments
    WHERE is_active = true;
    RETURN NEW;
END;
$$;

-- Fix 2: update_convocation_status  
DROP FUNCTION IF EXISTS public.update_convocation_status() CASCADE;

CREATE FUNCTION public.update_convocation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
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
$$;

-- Fix 3: update_global_status
DROP FUNCTION IF EXISTS public.update_global_status() CASCADE;

CREATE FUNCTION public.update_global_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN NEW;
END;
$$;

-- Fix 4: update_form_status_on_department_action
DROP FUNCTION IF EXISTS public.update_form_status_on_department_action() CASCADE;

CREATE FUNCTION public.update_form_status_on_department_action()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    total_depts INTEGER;
    approved_depts INTEGER;
    rejected_depts INTEGER;
    form_status TEXT;
BEGIN
    SELECT COUNT(*) INTO total_depts
    FROM public.departments
    WHERE is_active = true;
    
    SELECT 
        COUNT(*) FILTER (WHERE status = 'approved'),
        COUNT(*) FILTER (WHERE status = 'rejected')
    INTO approved_depts, rejected_depts
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id;
    
    IF rejected_depts > 0 THEN
        form_status := 'rejected';
        UPDATE public.no_dues_status
        SET 
            status = 'rejected',
            rejection_reason = 'Auto-rejected',
            action_at = NOW()
        WHERE form_id = NEW.form_id 
        AND status = 'pending';
    ELSIF approved_depts = total_depts THEN
        form_status := 'completed';
    ELSE
        form_status := 'pending';
    END IF;
    
    UPDATE public.no_dues_forms
    SET status = form_status, updated_at = NOW()
    WHERE id = NEW.form_id;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- Recreate triggers
-- ============================================================================

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

-- ============================================================================
-- FINAL VERIFICATION: Check if is_manual_entry is GONE
-- ============================================================================

SELECT 
    proname,
    CASE 
        WHEN prosrc LIKE '%is_manual_entry%' THEN '❌ STILL THERE'
        ELSE '✅ GONE'
    END as status,
    LENGTH(prosrc) as code_length
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
    'create_department_statuses',
    'update_convocation_status',
    'update_global_status',
    'update_form_status_on_department_action'
)
ORDER BY proname;