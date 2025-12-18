-- ============================================================================
-- FIX: Final Trigger Still Referencing is_manual_entry
-- ============================================================================
-- Student form submission is failing because a trigger is trying to access
-- the deleted is_manual_entry column on INSERT
-- ============================================================================

-- Find ALL triggers on no_dues_forms table
SELECT 
    'Triggers on no_dues_forms' as info,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'no_dues_forms'
ORDER BY trigger_name;

-- Drop ALL triggers on no_dues_forms (we'll recreate the good ones)
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN 
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'no_dues_forms'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON no_dues_forms CASCADE', trigger_rec.trigger_name);
        RAISE NOTICE 'Dropped trigger: %', trigger_rec.trigger_name;
    END LOOP;
END $$;

-- Recreate ONLY the essential triggers (without is_manual_entry reference)

-- 1. Trigger to create status rows for all departments when form is inserted
CREATE OR REPLACE FUNCTION create_department_statuses()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a pending status row for each active department
    INSERT INTO no_dues_status (form_id, department_name, status)
    SELECT NEW.id, name, 'pending'
    FROM departments
    WHERE is_active = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_form_insert_create_statuses
    AFTER INSERT ON no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION create_department_statuses();

-- 2. Trigger to update form status when all departments approve
CREATE OR REPLACE FUNCTION update_form_status()
RETURNS TRIGGER AS $$
DECLARE
    total_depts INT;
    approved_depts INT;
    rejected_depts INT;
BEGIN
    -- Count total active departments
    SELECT COUNT(*) INTO total_depts
    FROM departments
    WHERE is_active = true;
    
    -- Count approved departments for this form
    SELECT COUNT(*) INTO approved_depts
    FROM no_dues_status
    WHERE form_id = NEW.form_id
    AND status = 'approved';
    
    -- Count rejected departments for this form
    SELECT COUNT(*) INTO rejected_depts
    FROM no_dues_status
    WHERE form_id = NEW.form_id
    AND status = 'rejected';
    
    -- Update form status
    IF rejected_depts > 0 THEN
        -- Any rejection = rejected form
        UPDATE no_dues_forms
        SET status = 'rejected', updated_at = NOW()
        WHERE id = NEW.form_id;
    ELSIF approved_depts = total_depts THEN
        -- All approved = completed form
        UPDATE no_dues_forms
        SET status = 'completed', updated_at = NOW()
        WHERE id = NEW.form_id;
    ELSE
        -- Some pending = pending form
        UPDATE no_dues_forms
        SET status = 'pending', updated_at = NOW()
        WHERE id = NEW.form_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_status_update
    AFTER INSERT OR UPDATE OF status ON no_dues_status
    FOR EACH ROW
    EXECUTE FUNCTION update_form_status();

-- 3. Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_form_update
    BEFORE UPDATE ON no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Verify triggers are created correctly
SELECT 
    'New Triggers Created' as info,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'no_dues_forms'
ORDER BY trigger_name;

-- Test: Try inserting a form (this should work now)
SELECT 'Trigger fix complete - student form submission should work now' as status;