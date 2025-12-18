-- ================================================================
-- JECRC NO-DUES SYSTEM: Department Flow Fix Migration
-- ================================================================
-- This migration creates the missing database triggers and functions
-- that enable the department dashboard to function properly.
--
-- ISSUE: Staff dashboards show empty (pending: 0) because no_dues_status
-- records are not being created when students submit forms.
--
-- SOLUTION: Create triggers that automatically generate status records
-- for all departments when a form is submitted.
-- ================================================================

-- ================================================================
-- 1. CREATE FUNCTION: Automatically create department status records
-- ================================================================
-- This function is triggered when a new no_dues form is inserted
-- It creates a pending status record for each active department

CREATE OR REPLACE FUNCTION create_department_statuses()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a status record for each active department
  INSERT INTO no_dues_status (
    form_id,
    department_name,
    status,
    created_at
  )
  SELECT 
    NEW.id,
    d.name,
    'pending',
    NOW()
  FROM departments d
  WHERE d.is_active = true
  ORDER BY d.display_order;
  
  -- Log the action
  RAISE NOTICE 'Created % status records for form %', 
    (SELECT COUNT(*) FROM departments WHERE is_active = true),
    NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 2. CREATE TRIGGER: Execute function after form insertion
-- ================================================================
-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_create_department_statuses ON no_dues_forms;

-- Create the trigger
CREATE TRIGGER trigger_create_department_statuses
AFTER INSERT ON no_dues_forms
FOR EACH ROW
EXECUTE FUNCTION create_department_statuses();

-- ================================================================
-- 3. CREATE FUNCTION: Update form status when all departments approve
-- ================================================================
-- This function checks if all departments have approved a form
-- and updates the form status to 'completed' when they have

CREATE OR REPLACE FUNCTION update_form_status()
RETURNS TRIGGER AS $$
DECLARE
  total_depts INTEGER;
  approved_depts INTEGER;
  rejected_depts INTEGER;
BEGIN
  -- Count total active departments
  SELECT COUNT(*) INTO total_depts
  FROM departments
  WHERE is_active = true;
  
  -- Count approved and rejected departments for this form
  SELECT 
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'rejected')
  INTO approved_depts, rejected_depts
  FROM no_dues_status
  WHERE form_id = NEW.form_id;
  
  -- If all departments approved, mark form as completed
  IF approved_depts = total_depts THEN
    UPDATE no_dues_forms
    SET 
      status = 'completed',
      updated_at = NOW()
    WHERE id = NEW.form_id;
    
    RAISE NOTICE 'Form % marked as completed (all % departments approved)', 
      NEW.form_id, total_depts;
  
  -- If any department rejected, mark form as rejected
  ELSIF rejected_depts > 0 THEN
    UPDATE no_dues_forms
    SET 
      status = 'rejected',
      updated_at = NOW()
    WHERE id = NEW.form_id
    AND status != 'rejected'; -- Only update if not already rejected
    
    RAISE NOTICE 'Form % marked as rejected (% rejections)', 
      NEW.form_id, rejected_depts;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 4. CREATE TRIGGER: Update form status on department action
-- ================================================================
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_form_status ON no_dues_status;

-- Create the trigger
CREATE TRIGGER trigger_update_form_status
AFTER UPDATE ON no_dues_status
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_form_status();

-- ================================================================
-- 5. BACKFILL: Create missing status records for existing forms
-- ================================================================
-- This section creates status records for any forms that were
-- submitted before this trigger was in place

DO $$
DECLARE
  form_record RECORD;
  status_count INTEGER;
  forms_fixed INTEGER := 0;
BEGIN
  -- Loop through all forms that don't have status records
  FOR form_record IN 
    SELECT f.id, f.registration_no
    FROM no_dues_forms f
    WHERE NOT EXISTS (
      SELECT 1 FROM no_dues_status s WHERE s.form_id = f.id
    )
  LOOP
    -- Create status records for all active departments
    INSERT INTO no_dues_status (form_id, department_name, status, created_at)
    SELECT 
      form_record.id,
      d.name,
      'pending',
      NOW()
    FROM departments d
    WHERE d.is_active = true
    ORDER BY d.display_order;
    
    GET DIAGNOSTICS status_count = ROW_COUNT;
    forms_fixed := forms_fixed + 1;
    
    RAISE NOTICE 'Fixed form % (Reg: %) - created % status records',
      form_record.id, form_record.registration_no, status_count;
  END LOOP;
  
  IF forms_fixed > 0 THEN
    RAISE NOTICE '✅ Backfill complete: Fixed % forms', forms_fixed;
  ELSE
    RAISE NOTICE '✅ No forms needed fixing - all have status records';
  END IF;
END $$;

-- ================================================================
-- 6. VERIFICATION: Check the migration results
-- ================================================================
-- Run these queries manually to verify the migration worked:

-- Check if triggers exist
-- SELECT tgname, tgenabled 
-- FROM pg_trigger 
-- WHERE tgrelid = 'no_dues_forms'::regclass 
-- OR tgrelid = 'no_dues_status'::regclass;

-- Check if functions exist
-- SELECT proname, prosrc 
-- FROM pg_proc 
-- WHERE proname IN ('create_department_statuses', 'update_form_status');

-- Check forms without status records (should be 0)
-- SELECT COUNT(*) as forms_missing_status
-- FROM no_dues_forms f
-- WHERE NOT EXISTS (
--   SELECT 1 FROM no_dues_status s WHERE s.form_id = f.id
-- );

-- Check status distribution
-- SELECT 
--   d.display_name,
--   COUNT(*) FILTER (WHERE s.status = 'pending') as pending,
--   COUNT(*) FILTER (WHERE s.status = 'approved') as approved,
--   COUNT(*) FILTER (WHERE s.status = 'rejected') as rejected,
--   COUNT(*) as total
-- FROM departments d
-- LEFT JOIN no_dues_status s ON s.department_name = d.name
-- GROUP BY d.display_name, d.display_order
-- ORDER BY d.display_order;

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================
-- After running this migration:
-- 1. All existing forms will have status records for all departments
-- 2. New form submissions will automatically create status records
-- 3. Form status will automatically update when all departments approve
-- 4. Staff dashboards will show pending applications correctly
-- ================================================================