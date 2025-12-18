-- ==================================================================================
-- EMERGENCY FIX - RUN THIS IMMEDIATELY
-- This consolidates ALL fixes into ONE script
-- ==================================================================================

-- STEP 0: Drop ALL old triggers that reference is_manual_entry
DO $$
BEGIN
    -- Drop old triggers if they exist
    DROP TRIGGER IF EXISTS trigger_update_form_status ON public.no_dues_status;
    DROP TRIGGER IF EXISTS trigger_update_convocation_status ON public.no_dues_forms;
    DROP TRIGGER IF EXISTS on_status_change ON public.no_dues_status;
    
    RAISE NOTICE '✅ Dropped old triggers';
END $$;

-- STEP 1: Check if assigned_department_ids column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='profiles' AND column_name='assigned_department_ids'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN assigned_department_ids UUID[];
        RAISE NOTICE '✅ Added assigned_department_ids column';
    ELSE
        RAISE NOTICE '✓ assigned_department_ids column already exists';
    END IF;
END $$;

-- STEP 2: Remove manual entry columns if they exist
DO $$ 
BEGIN
    -- Check and drop each column individually
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='no_dues_forms' AND column_name='is_manual_entry') THEN
        ALTER TABLE public.no_dues_forms DROP COLUMN is_manual_entry CASCADE;
        RAISE NOTICE '✅ Dropped is_manual_entry';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='no_dues_forms' AND column_name='manual_status') THEN
        ALTER TABLE public.no_dues_forms DROP COLUMN manual_status CASCADE;
        RAISE NOTICE '✅ Dropped manual_status';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='no_dues_forms' AND column_name='manual_certificate_url') THEN
        ALTER TABLE public.no_dues_forms DROP COLUMN manual_certificate_url CASCADE;
        RAISE NOTICE '✅ Dropped manual_certificate_url';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='no_dues_forms' AND column_name='manual_entry_approved_by') THEN
        ALTER TABLE public.no_dues_forms DROP COLUMN manual_entry_approved_by CASCADE;
        RAISE NOTICE '✅ Dropped manual_entry_approved_by';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='no_dues_forms' AND column_name='manual_entry_approved_at') THEN
        ALTER TABLE public.no_dues_forms DROP COLUMN manual_entry_approved_at CASCADE;
        RAISE NOTICE '✅ Dropped manual_entry_approved_at';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='no_dues_forms' AND column_name='manual_entry_rejection_reason') THEN
        ALTER TABLE public.no_dues_forms DROP COLUMN manual_entry_rejection_reason CASCADE;
        RAISE NOTICE '✅ Dropped manual_entry_rejection_reason';
    END IF;
END $$;

-- STEP 2B: Recreate the global status update trigger WITHOUT is_manual_entry reference
CREATE OR REPLACE FUNCTION public.update_form_status_on_department_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_departments INTEGER;
    approved_count INTEGER;
    rejected_count INTEGER;
    new_status TEXT;
BEGIN
    -- Count total active departments
    SELECT COUNT(*) INTO total_departments
    FROM public.departments
    WHERE is_active = true;
    
    -- Count approved and rejected statuses for this form
    SELECT
        COUNT(*) FILTER (WHERE status = 'approved'),
        COUNT(*) FILTER (WHERE status = 'rejected')
    INTO approved_count, rejected_count
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id;
    
    -- Determine new status
    IF rejected_count > 0 THEN
        new_status := 'rejected';
    ELSIF approved_count = total_departments THEN
        new_status := 'completed';
    ELSE
        new_status := 'pending';
    END IF;
    
    -- Update the form status
    UPDATE public.no_dues_forms
    SET status = new_status, updated_at = NOW()
    WHERE id = NEW.form_id;
    
    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_form_status ON public.no_dues_status;
CREATE TRIGGER trigger_update_form_status
    AFTER INSERT OR UPDATE OF status ON public.no_dues_status
    FOR EACH ROW
    EXECUTE FUNCTION public.update_form_status_on_department_action();

RAISE NOTICE '✅ Recreated status update trigger';

-- STEP 3: Link all staff to their departments via UUIDs
UPDATE public.profiles p
SET assigned_department_ids = ARRAY(
    SELECT id FROM public.departments d WHERE d.name = p.department_name
)
WHERE role = 'department' 
  AND (assigned_department_ids IS NULL OR assigned_department_ids = '{}');

RAISE NOTICE '✅ Linked staff accounts to department UUIDs';

-- STEP 4: Generate missing status rows for ALL forms
INSERT INTO public.no_dues_status (form_id, department_name, status)
SELECT f.id, d.name, 'pending'
FROM public.no_dues_forms f
CROSS JOIN public.departments d
WHERE d.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.no_dues_status s 
    WHERE s.form_id = f.id AND s.department_name = d.name
  )
ON CONFLICT (form_id, department_name) DO NOTHING;

RAISE NOTICE '✅ Generated missing status rows';

-- STEP 5: Verification Report
DO $$
DECLARE
    staff_linked INT;
    staff_total INT;
    forms_total INT;
    status_rows INT;
BEGIN
    SELECT COUNT(*) INTO staff_total FROM public.profiles WHERE role = 'department';
    SELECT COUNT(*) INTO staff_linked FROM public.profiles 
        WHERE role = 'department' AND array_length(assigned_department_ids, 1) > 0;
    
    SELECT COUNT(*) INTO forms_total FROM public.no_dues_forms;
    SELECT COUNT(*) INTO status_rows FROM public.no_dues_status;
    
    RAISE NOTICE '';
    RAISE NOTICE '==================== VERIFICATION REPORT ====================';
    RAISE NOTICE 'Staff Accounts: % total, % linked to departments', staff_total, staff_linked;
    RAISE NOTICE 'Forms: % total, % status rows', forms_total, status_rows;
    RAISE NOTICE '===========================================================';
    RAISE NOTICE '';
    
    IF staff_linked = staff_total THEN
        RAISE NOTICE '✅ ALL STAFF LINKED - SYSTEM READY';
    ELSE
        RAISE WARNING '⚠️  Some staff not linked - check department_name values';
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 EMERGENCY FIX COMPLETE';
    RAISE NOTICE 'You can now:';
    RAISE NOTICE '1. Submit student forms';
    RAISE NOTICE '2. Login as librarian: 15anuragsingh2003@gmail.com';
    RAISE NOTICE '3. Approve/reject applications';
    RAISE NOTICE '';
END $$;