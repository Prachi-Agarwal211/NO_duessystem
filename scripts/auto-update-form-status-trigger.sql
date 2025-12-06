-- ============================================================
-- AUTO-UPDATE FORM STATUS TRIGGER
-- ============================================================
-- This trigger automatically updates no_dues_forms.status AND updated_at
-- whenever any department status changes in no_dues_status table.
-- 
-- This ensures:
-- 1. Admin dashboard receives real-time UPDATE events
-- 2. Form overall status is always accurate
-- 3. No manual refresh needed to see status changes
-- ============================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_auto_update_form_status ON no_dues_status;
DROP FUNCTION IF EXISTS auto_update_form_status();

-- Create the trigger function
CREATE OR REPLACE FUNCTION auto_update_form_status()
RETURNS TRIGGER AS $$
DECLARE
  has_rejected BOOLEAN;
  has_pending BOOLEAN;
  new_status TEXT;
BEGIN
  -- Check if any department has rejected
  SELECT EXISTS (
    SELECT 1 FROM no_dues_status 
    WHERE form_id = NEW.form_id AND status = 'rejected'
  ) INTO has_rejected;
  
  -- Check if any department is still pending
  SELECT EXISTS (
    SELECT 1 FROM no_dues_status 
    WHERE form_id = NEW.form_id AND status = 'pending'
  ) INTO has_pending;
  
  -- Determine new form status
  IF has_rejected THEN
    new_status := 'rejected';
  ELSIF NOT has_pending THEN
    new_status := 'completed';
  ELSE
    new_status := 'pending';
  END IF;
  
  -- Update the form status and timestamp
  -- The timestamp update ensures real-time UPDATE event fires
  UPDATE no_dues_forms
  SET 
    status = new_status,
    updated_at = NOW()
  WHERE id = NEW.form_id;
  
  RAISE NOTICE 'Form % status updated to: %', NEW.form_id, new_status;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trg_auto_update_form_status
AFTER INSERT OR UPDATE OF status ON no_dues_status
FOR EACH ROW
EXECUTE FUNCTION auto_update_form_status();

-- ============================================================
-- VERIFICATION QUERY
-- Run this after creating the trigger to verify it works:
-- ============================================================
-- 
-- 1. Check trigger exists:
-- SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'trg_auto_update_form_status';
--
-- 2. Test by updating a status:
-- UPDATE no_dues_status SET status = 'approved' WHERE id = 'some-uuid';
-- 
-- 3. Check if form updated_at changed:
-- SELECT id, status, updated_at FROM no_dues_forms WHERE id = 'form-id';
-- ============================================================
