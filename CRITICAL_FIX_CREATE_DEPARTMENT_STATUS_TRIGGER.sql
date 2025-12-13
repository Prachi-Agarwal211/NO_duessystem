-- ============================================
-- CRITICAL FIX: CREATE MISSING DATABASE TRIGGER
-- ============================================
-- This trigger automatically creates department status records
-- when a new online form is submitted
-- 
-- WITHOUT THIS TRIGGER: Forms appear but have no department status records
-- WITH THIS TRIGGER: Forms automatically get status records for all 11 departments

-- ============================================
-- STEP 1: Create the trigger function
-- ============================================
CREATE OR REPLACE FUNCTION create_department_statuses()
RETURNS TRIGGER AS $$
DECLARE
  dept RECORD;
BEGIN
  -- Only create department status records for ONLINE forms
  -- Manual entries (is_manual_entry=true) should NOT have department status records
  IF NEW.is_manual_entry = false OR NEW.is_manual_entry IS NULL THEN
    -- Insert a status record for each department
    FOR dept IN 
      SELECT name FROM departments WHERE is_active = true
    LOOP
      INSERT INTO no_dues_status (
        form_id,
        department_name,
        status,
        created_at
      ) VALUES (
        NEW.id,
        dept.name,
        'pending',
        NOW()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 2: Drop existing trigger if it exists
-- ============================================
DROP TRIGGER IF EXISTS trigger_create_department_statuses ON no_dues_forms;

-- ============================================
-- STEP 3: Create the trigger
-- ============================================
CREATE TRIGGER trigger_create_department_statuses
  AFTER INSERT ON no_dues_forms
  FOR EACH ROW
  EXECUTE FUNCTION create_department_statuses();

-- ============================================
-- STEP 4: Verify trigger was created
-- ============================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_department_statuses';

-- ============================================
-- STEP 5: Fix existing forms that have no department status
-- ============================================
-- This will add department status records to any existing online forms
-- that don't have them (forms submitted before trigger was created)

DO $$
DECLARE
  form_record RECORD;
  dept_record RECORD;
  status_count INTEGER;
BEGIN
  -- Loop through all online forms
  FOR form_record IN 
    SELECT id FROM no_dues_forms 
    WHERE (is_manual_entry = false OR is_manual_entry IS NULL)
  LOOP
    -- Check if this form has any department status records
    SELECT COUNT(*) INTO status_count
    FROM no_dues_status
    WHERE form_id = form_record.id;
    
    -- If no status records exist, create them
    IF status_count = 0 THEN
      RAISE NOTICE 'Creating department statuses for form: %', form_record.id;
      
      -- Create status record for each active department
      FOR dept_record IN 
        SELECT name FROM departments WHERE is_active = true
      LOOP
        INSERT INTO no_dues_status (
          form_id,
          department_name,
          status,
          created_at
        ) VALUES (
          form_record.id,
          dept_record.name,
          'pending',
          NOW()
        );
      END LOOP;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Department status fix complete!';
END $$;

-- ============================================
-- STEP 6: Verify the fix worked
-- ============================================
-- Check forms that now have department status records
SELECT 
  'Online forms with status records' as check_type,
  COUNT(DISTINCT nf.id) as form_count
FROM no_dues_forms nf
INNER JOIN no_dues_status ns ON nf.id = ns.form_id
WHERE (nf.is_manual_entry = false OR nf.is_manual_entry IS NULL);

-- Check forms that still have NO status records (should be 0 for online forms)
SELECT 
  'Online forms WITHOUT status records (should be 0)' as check_type,
  COUNT(*) as form_count
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON nf.id = ns.form_id
WHERE (nf.is_manual_entry = false OR nf.is_manual_entry IS NULL)
AND ns.id IS NULL;

-- Check manual entries (should have NO status records)
SELECT 
  'Manual entries (should have 0 status records)' as check_type,
  COUNT(DISTINCT nf.id) as form_count,
  COUNT(ns.id) as status_count
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON nf.id = ns.form_id
WHERE nf.is_manual_entry = true;

-- ============================================
-- EXPLANATION
-- ============================================
/*
WHAT THIS FIXES:

PROBLEM:
- Student submits online form → Form created in no_dues_forms
- NO department status records created
- Admin dashboard query uses INNER JOIN with no_dues_status
- Form doesn't appear because no status records exist
- Department staff see nothing in their queue

SOLUTION:
1. Creates trigger that automatically generates department status records
2. Trigger runs AFTER INSERT on no_dues_forms table
3. For online forms: Creates status record for each active department
4. For manual entries: Skips creation (manual entries are admin-only)
5. Backfills any existing forms that are missing status records

AFTER RUNNING THIS:
✅ Online form submission → 11 department status records auto-created
✅ Forms appear in admin dashboard
✅ Forms appear in department staff queues
✅ Staff can approve/reject as normal
✅ Manual entries remain admin-only (no status records)

SAFETY:
- Uses IF NOT EXISTS checks
- Only creates records where missing
- Does not modify existing records
- Idempotent (safe to run multiple times)
*/