-- ============================================================
-- DATABASE TRIGGER: Auto-update no_dues_forms.updated_at 
-- when no_dues_status changes
-- ============================================================
-- 
-- PROBLEM SOLVED:
-- When a department approves/rejects a student's dues (updating no_dues_status),
-- the parent no_dues_forms table's updated_at field was NOT changing.
-- This caused Admin real-time subscriptions (which listen to no_dues_forms UPDATE)
-- to miss these changes, leading to stale dashboard data.
--
-- SOLUTION:
-- This trigger automatically updates the no_dues_forms.updated_at timestamp
-- whenever any row in no_dues_status is inserted or updated.
-- This ensures Admin dashboards receive real-time UPDATE events properly.
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ============================================================

-- Step 1: Create the trigger function
CREATE OR REPLACE FUNCTION update_form_timestamp_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent form's updated_at timestamp
  UPDATE no_dues_forms 
  SET updated_at = NOW() 
  WHERE id = NEW.form_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Drop existing trigger if it exists (safe re-run)
DROP TRIGGER IF EXISTS trigger_update_form_timestamp ON no_dues_status;

-- Step 3: Create the trigger
CREATE TRIGGER trigger_update_form_timestamp
AFTER INSERT OR UPDATE ON no_dues_status
FOR EACH ROW
EXECUTE FUNCTION update_form_timestamp_on_status_change();

-- Step 4: Verify the trigger was created
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgenabled AS enabled
FROM pg_trigger 
WHERE tgname = 'trigger_update_form_timestamp';

-- ============================================================
-- VERIFICATION: Test the trigger works
-- ============================================================
-- Uncomment and run this to test:
--
-- UPDATE no_dues_status 
-- SET remarks = 'Trigger test ' || NOW()
-- WHERE id = (SELECT id FROM no_dues_status LIMIT 1);
--
-- Then check that the parent form's updated_at changed:
-- SELECT id, updated_at FROM no_dues_forms WHERE id = (
--   SELECT form_id FROM no_dues_status LIMIT 1
-- );
-- ============================================================
