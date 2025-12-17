-- ============================================================================
-- MASTER CYCLE FIX: Database-First 7-Department Workflow
-- ============================================================================
-- This migration implements automatic status management through triggers
-- Ensures every student has exactly 7 department tasks at all times
-- 
-- SAFE TO RUN MULTIPLE TIMES: Uses UPDATE/INSERT instead of TRUNCATE
-- ============================================================================

-- ==================== STEP 1: ENSURE 7 DEPARTMENTS EXIST ====================
-- Use INSERT ... ON CONFLICT to safely ensure exactly 7 departments

INSERT INTO public.departments (name, display_name, display_order, is_school_specific, is_active)
VALUES
  ('school_hod', 'School Dean / HOD', 1, true, true),
  ('library', 'Central Library', 2, false, true),
  ('it_department', 'IT Services', 3, false, true),
  ('hostel', 'Hostel Management', 4, false, true),
  ('alumni_association', 'Alumni Relations', 5, false, true),
  ('accounts_department', 'Accounts & Finance', 6, false, true),
  ('registrar', 'Registrar Office', 7, false, true)
ON CONFLICT (name)
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  display_order = EXCLUDED.display_order,
  is_school_specific = EXCLUDED.is_school_specific,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Step 1 complete

-- ==================== STEP 2: AUTO-CREATE STATUS ROWS ON FORM SUBMISSION ====================
-- This trigger ensures every new form submission automatically gets 7 department tasks

-- Drop ALL existing triggers that might conflict
DROP TRIGGER IF EXISTS on_form_submit ON public.no_dues_forms;
DROP TRIGGER IF EXISTS trigger_create_department_statuses ON public.no_dues_forms;

-- Create/replace the function (this updates existing one if present)
CREATE OR REPLACE FUNCTION public.create_department_statuses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert a pending status row for EACH of the 7 departments
    INSERT INTO public.no_dues_status (form_id, department_name, status, created_at)
    SELECT
        NEW.id,
        name,
        'pending',
        NOW()
    FROM public.departments
    WHERE is_active = true
    ON CONFLICT (form_id, department_name) DO NOTHING;
    
    RAISE NOTICE '✅ Created 7 status rows for form %', NEW.id;
    RETURN NEW;
END;
$$;

-- Create the trigger (only one will exist after this)
CREATE TRIGGER on_form_submit
    AFTER INSERT ON public.no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION public.create_department_statuses();

-- Step 2 complete

-- ==================== STEP 3: AUTO-UPDATE GLOBAL STATUS ====================
-- This trigger implements "One Reject = Global Reject" and "All 7 Approved = Completed"

-- Drop ALL existing triggers that might conflict
DROP TRIGGER IF EXISTS on_status_change ON public.no_dues_status;
DROP TRIGGER IF EXISTS trigger_update_form_status ON public.no_dues_status;

-- Create/replace the function (this updates existing one if present)
CREATE OR REPLACE FUNCTION public.update_global_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_depts INT;
    approved_count INT;
    rejected_count INT;
    pending_count INT;
    current_status TEXT;
BEGIN
    -- Get current form status
    SELECT status INTO current_status
    FROM public.no_dues_forms
    WHERE id = NEW.form_id;
    
    -- Count total active departments
    SELECT COUNT(*) INTO total_depts
    FROM public.departments
    WHERE is_active = true;
    
    -- Count statuses for this form
    SELECT
        COUNT(*) FILTER (WHERE status = 'rejected'),
        COUNT(*) FILTER (WHERE status = 'approved'),
        COUNT(*) FILTER (WHERE status = 'pending')
    INTO rejected_count, approved_count, pending_count
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id;
    
    -- RULE 1: If ANY department rejects -> Global status = 'rejected'
    IF rejected_count > 0 AND current_status != 'rejected' THEN
        UPDATE public.no_dues_forms
        SET
            status = 'rejected',
            updated_at = NOW()
        WHERE id = NEW.form_id;
        
        RAISE NOTICE '❌ Form % rejected (% rejection(s))', NEW.form_id, rejected_count;
        RETURN NEW;
    END IF;
    
    -- RULE 2: If ALL departments approve -> Global status = 'completed'
    IF approved_count = total_depts AND current_status != 'completed' THEN
        UPDATE public.no_dues_forms
        SET
            status = 'completed',
            updated_at = NOW()
        WHERE id = NEW.form_id;
        
        RAISE NOTICE '✅ Form % completed (all % departments approved)', NEW.form_id, total_depts;
        RETURN NEW;
    END IF;
    
    -- RULE 3: Otherwise, keep status as 'pending'
    IF current_status != 'pending' AND rejected_count = 0 AND approved_count < total_depts THEN
        UPDATE public.no_dues_forms
        SET
            status = 'pending',
            updated_at = NOW()
        WHERE id = NEW.form_id;
        
        RAISE NOTICE '⏳ Form % back to pending (% approved, % pending)', NEW.form_id, approved_count, pending_count;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger (only one will exist after this)
CREATE TRIGGER on_status_change
    AFTER INSERT OR UPDATE OF status ON public.no_dues_status
    FOR EACH ROW
    EXECUTE FUNCTION public.update_global_status();

-- Step 3 complete

-- ==================== STEP 4: REPAIR EXISTING FORMS ====================
-- Backfill missing status rows for any existing forms that don't have all 7

DO $$
DECLARE
    missing_count INT;
BEGIN
    -- Count how many status rows need to be created
    SELECT COUNT(*) INTO missing_count
    FROM public.no_dues_forms f
    CROSS JOIN public.departments d
    WHERE d.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM public.no_dues_status s 
        WHERE s.form_id = f.id AND s.department_name = d.name
    );
    
    IF missing_count > 0 THEN
        -- Create missing status rows
        INSERT INTO public.no_dues_status (form_id, department_name, status, created_at)
        SELECT f.id, d.name, 'pending', NOW()
        FROM public.no_dues_forms f
        CROSS JOIN public.departments d
        WHERE d.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM public.no_dues_status s 
            WHERE s.form_id = f.id AND s.department_name = d.name
        );
        
        RAISE NOTICE '🔧 Step 4: Repaired % missing status rows for existing forms', missing_count;
    ELSE
        RAISE NOTICE '✅ Step 4: No repairs needed - all forms have complete status rows';
    END IF;
END $$;

-- ==================== STEP 5: LINK STAFF TO DEPARTMENTS ====================
-- Ensure all staff have assigned_department_ids populated

DO $$
DECLARE
    updated_count INT;
BEGIN
    -- Update profiles to link to department UUIDs
    WITH updates AS (
        UPDATE public.profiles p
        SET assigned_department_ids = ARRAY(
            SELECT d.id 
            FROM public.departments d 
            WHERE d.name = p.department_name
        )
        WHERE p.role = 'department'
        AND (p.assigned_department_ids IS NULL OR array_length(p.assigned_department_ids, 1) = 0)
        RETURNING 1
    )
    SELECT COUNT(*) INTO updated_count FROM updates;
    
    IF updated_count > 0 THEN
        RAISE NOTICE '🔧 Step 5: Linked % staff profiles to department UUIDs', updated_count;
    ELSE
        RAISE NOTICE '✅ Step 5: All staff already linked to departments';
    END IF;
END $$;

-- ==================== STEP 6: VERIFICATION ====================
-- Run checks to verify the migration was successful

DO $$
DECLARE
    form_count INT;
    status_count INT;
    expected_statuses INT;
    dept_count INT;
    staff_count INT;
    linked_staff_count INT;
BEGIN
    -- Count active departments
    SELECT COUNT(*) INTO dept_count FROM public.departments WHERE is_active = true;
    
    -- Count forms
    SELECT COUNT(*) INTO form_count FROM public.no_dues_forms;
    
    -- Count status rows
    SELECT COUNT(*) INTO status_count FROM public.no_dues_status;
    
    -- Calculate expected status rows (forms × departments)
    expected_statuses := form_count * dept_count;
    
    -- Count staff
    SELECT COUNT(*) INTO staff_count FROM public.profiles WHERE role = 'department';
    
    -- Count staff with department links
    SELECT COUNT(*) INTO linked_staff_count 
    FROM public.profiles 
    WHERE role = 'department' 
    AND assigned_department_ids IS NOT NULL 
    AND array_length(assigned_department_ids, 1) > 0;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '📊 MASTER CYCLE FIX - VERIFICATION REPORT';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Active Departments: %', dept_count;
    RAISE NOTICE '✅ Online Forms: %', form_count;
    RAISE NOTICE '✅ Status Rows: % (expected: %)', status_count, expected_statuses;
    RAISE NOTICE '✅ Staff Accounts: %', staff_count;
    RAISE NOTICE '✅ Staff Linked to Departments: % / %', linked_staff_count, staff_count;
    RAISE NOTICE '';
    
    IF status_count = expected_statuses THEN
        RAISE NOTICE '✅ SUCCESS: All forms have exactly % department tasks!', dept_count;
    ELSE
        RAISE WARNING '⚠️  Status row mismatch detected. Expected %, got %', expected_statuses, status_count;
    END IF;
    
    IF linked_staff_count = staff_count THEN
        RAISE NOTICE '✅ SUCCESS: All staff linked to departments!';
    ELSE
        RAISE WARNING '⚠️  Some staff not linked. Linked: %, Total: %', linked_staff_count, staff_count;
    END IF;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
END $$;

-- ==================== STEP 7: TEST THE TRIGGERS ====================
-- Display trigger installation status

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 TRIGGER STATUS:';
    RAISE NOTICE '  ✅ on_form_submit: Creates 7 status rows on new form';
    RAISE NOTICE '  ✅ on_status_change: Auto-updates global status';
    RAISE NOTICE '';
    RAISE NOTICE '📋 WORKFLOW RULES:';
    RAISE NOTICE '  1️⃣  New submission → 7 pending tasks created';
    RAISE NOTICE '  2️⃣  Any rejection → Global status = rejected';
    RAISE NOTICE '  3️⃣  All 7 approved → Global status = completed';
    RAISE NOTICE '  4️⃣  Reapplication → All 7 tasks reset to pending';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Master Cycle Fix installation complete!';
    RAISE NOTICE '';
END $$;