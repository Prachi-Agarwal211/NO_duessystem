-- ============================================================================
-- REAPPLICATION SYSTEM DATABASE SETUP
-- ============================================================================
-- This script creates all necessary database objects for the reapplication system
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ==================== STEP 1: ADD COLUMNS TO no_dues_forms ====================
-- Add reapplication tracking fields
ALTER TABLE no_dues_forms 
ADD COLUMN IF NOT EXISTS reapplication_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reapplied_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS student_reply_message TEXT,
ADD COLUMN IF NOT EXISTS is_reapplication BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_forms_reapplication ON no_dues_forms(reapplication_count) WHERE reapplication_count > 0;
CREATE INDEX IF NOT EXISTS idx_forms_status_rejected ON no_dues_forms(status) WHERE status = 'rejected';

-- ==================== STEP 2: CREATE REAPPLICATION HISTORY TABLE ====================
-- Track all reapplication attempts with full audit trail
CREATE TABLE IF NOT EXISTS no_dues_reapplication_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES no_dues_forms(id) ON DELETE CASCADE,
    reapplication_number INTEGER NOT NULL,
    student_message TEXT NOT NULL,
    edited_fields JSONB, -- Store only changed fields
    rejected_departments JSONB NOT NULL, -- Array of rejected dept info
    previous_status JSONB NOT NULL, -- Snapshot of all statuses before reapplication
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_reapplication UNIQUE(form_id, reapplication_number)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reapp_form_id ON no_dues_reapplication_history(form_id);
CREATE INDEX IF NOT EXISTS idx_reapp_created ON no_dues_reapplication_history(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE no_dues_reapplication_history IS 'Audit trail for all form reapplications with student messages and changes';
COMMENT ON COLUMN no_dues_reapplication_history.edited_fields IS 'JSONB object containing only the fields that were modified';
COMMENT ON COLUMN no_dues_reapplication_history.rejected_departments IS 'Array of objects with dept name, reason, and rejection timestamp';

-- ==================== STEP 3: CREATE TRIGGER FOR AUTOMATIC REJECTION STATUS ====================
-- When ANY department rejects, automatically mark form as rejected
CREATE OR REPLACE FUNCTION update_form_rejection_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If this status update is a rejection, mark the form as rejected
  IF NEW.status = 'rejected' THEN
    UPDATE no_dues_forms 
    SET status = 'rejected'
    WHERE id = NEW.form_id
      AND status != 'completed'; -- Don't override completed forms
    
    RAISE NOTICE 'Form % marked as rejected due to department % rejection', NEW.form_id, NEW.department_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_form_rejection ON no_dues_status;

CREATE TRIGGER trigger_form_rejection
AFTER UPDATE ON no_dues_status
FOR EACH ROW 
WHEN (NEW.status = 'rejected' AND OLD.status != 'rejected')
EXECUTE FUNCTION update_form_rejection_status();

COMMENT ON FUNCTION update_form_rejection_status() IS 'Automatically sets form status to rejected when any department rejects';

-- ==================== STEP 4: CREATE FUNCTION FOR REAPPLICATION ====================
-- Helper function to process reapplication logic
CREATE OR REPLACE FUNCTION process_reapplication(
    p_form_id UUID,
    p_student_message TEXT,
    p_edited_fields JSONB
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    reapplication_number INTEGER
) AS $$
DECLARE
    v_reapp_count INTEGER;
    v_rejected_depts JSONB;
    v_previous_status JSONB;
BEGIN
    -- Get current reapplication count
    SELECT reapplication_count INTO v_reapp_count
    FROM no_dues_forms
    WHERE id = p_form_id;
    
    -- Get rejected departments info
    SELECT jsonb_agg(
        jsonb_build_object(
            'department_name', department_name,
            'rejection_reason', rejection_reason,
            'action_at', action_at
        )
    ) INTO v_rejected_depts
    FROM no_dues_status
    WHERE form_id = p_form_id AND status = 'rejected';
    
    -- Get all current statuses for history
    SELECT jsonb_agg(
        jsonb_build_object(
            'department_name', department_name,
            'status', status,
            'action_at', action_at,
            'rejection_reason', rejection_reason
        )
    ) INTO v_previous_status
    FROM no_dues_status
    WHERE form_id = p_form_id;
    
    -- Insert into history
    INSERT INTO no_dues_reapplication_history (
        form_id,
        reapplication_number,
        student_message,
        edited_fields,
        rejected_departments,
        previous_status
    ) VALUES (
        p_form_id,
        v_reapp_count + 1,
        p_student_message,
        p_edited_fields,
        v_rejected_depts,
        v_previous_status
    );
    
    -- Update form
    UPDATE no_dues_forms
    SET 
        reapplication_count = v_reapp_count + 1,
        last_reapplied_at = NOW(),
        student_reply_message = p_student_message,
        is_reapplication = true,
        status = 'pending'
    WHERE id = p_form_id;
    
    -- Reset rejected department statuses to pending
    UPDATE no_dues_status
    SET 
        status = 'pending',
        rejection_reason = NULL,
        action_at = NULL,
        action_by_user_id = NULL
    WHERE form_id = p_form_id AND status = 'rejected';
    
    RETURN QUERY SELECT true, 'Reapplication processed successfully'::TEXT, v_reapp_count + 1;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, SQLERRM::TEXT, 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_reapplication IS 'Atomically processes a reapplication with history logging and status reset';

-- ==================== STEP 5: ENABLE RLS (Row Level Security) ====================
-- Enable RLS on reapplication history
ALTER TABLE no_dues_reapplication_history ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view their own reapplication history via registration number
CREATE POLICY "Students can view their reapplication history"
ON no_dues_reapplication_history
FOR SELECT
USING (
    form_id IN (
        SELECT id FROM no_dues_forms 
        WHERE registration_no = current_setting('app.registration_no', true)
    )
);

-- Policy: Authenticated staff can view all reapplication history
CREATE POLICY "Staff can view all reapplication history"
ON no_dues_reapplication_history
FOR SELECT
TO authenticated
USING (true);

-- ==================== STEP 6: CREATE VIEW FOR EASY QUERYING ====================
-- View to easily see forms with rejections and reapplication status
CREATE OR REPLACE VIEW vw_forms_with_rejection_status AS
SELECT 
    f.id,
    f.registration_no,
    f.student_name,
    f.status as form_status,
    f.reapplication_count,
    f.last_reapplied_at,
    f.student_reply_message,
    f.is_reapplication,
    COUNT(s.id) FILTER (WHERE s.status = 'rejected') as rejected_count,
    COUNT(s.id) FILTER (WHERE s.status = 'approved') as approved_count,
    COUNT(s.id) FILTER (WHERE s.status = 'pending') as pending_count,
    jsonb_agg(
        CASE WHEN s.status = 'rejected' THEN
            jsonb_build_object(
                'department_name', s.department_name,
                'rejection_reason', s.rejection_reason,
                'action_at', s.action_at
            )
        ELSE NULL END
    ) FILTER (WHERE s.status = 'rejected') as rejected_departments
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON f.id = s.form_id
GROUP BY f.id, f.registration_no, f.student_name, f.status, 
         f.reapplication_count, f.last_reapplied_at, 
         f.student_reply_message, f.is_reapplication;

COMMENT ON VIEW vw_forms_with_rejection_status IS 'Consolidated view of forms with rejection and reapplication status';

-- ==================== STEP 7: VERIFY SETUP ====================
-- Check that all objects were created successfully
SELECT 
    'Tables' as object_type,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('no_dues_reapplication_history')

UNION ALL

SELECT 
    'Triggers' as object_type,
    COUNT(*) as count
FROM information_schema.triggers
WHERE trigger_name = 'trigger_form_rejection'

UNION ALL

SELECT 
    'Functions' as object_type,
    COUNT(*) as count
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('update_form_rejection_status', 'process_reapplication')

UNION ALL

SELECT 
    'Views' as object_type,
    COUNT(*) as count
FROM information_schema.views
WHERE table_schema = 'public'
    AND table_name = 'vw_forms_with_rejection_status';

-- ==================== STEP 8: TEST DATA (OPTIONAL) ====================
-- Uncomment to test the trigger
/*
-- Get a test form ID
DO $$
DECLARE
    test_form_id UUID;
    test_dept_name TEXT;
BEGIN
    -- Get first pending form
    SELECT id INTO test_form_id 
    FROM no_dues_forms 
    WHERE status = 'pending' 
    LIMIT 1;
    
    IF test_form_id IS NOT NULL THEN
        -- Get first pending status for that form
        SELECT department_name INTO test_dept_name
        FROM no_dues_status
        WHERE form_id = test_form_id AND status = 'pending'
        LIMIT 1;
        
        IF test_dept_name IS NOT NULL THEN
            -- Test rejection trigger
            RAISE NOTICE 'Testing rejection trigger on form % for department %', test_form_id, test_dept_name;
            
            UPDATE no_dues_status
            SET status = 'rejected',
                rejection_reason = 'Test rejection for trigger verification'
            WHERE form_id = test_form_id 
                AND department_name = test_dept_name;
            
            -- Check if form status was updated
            PERFORM 1 FROM no_dues_forms 
            WHERE id = test_form_id AND status = 'rejected';
            
            IF FOUND THEN
                RAISE NOTICE '✅ Trigger working correctly - form marked as rejected';
            ELSE
                RAISE WARNING '❌ Trigger not working - form status not updated';
            END IF;
        END IF;
    END IF;
END $$;
*/

-- ==================== COMPLETION MESSAGE ====================
DO $$
BEGIN
    RAISE NOTICE '
    ============================================================================
    ✅ REAPPLICATION SYSTEM SETUP COMPLETE
    ============================================================================
    
    Created:
    - Added 4 columns to no_dues_forms table
    - Created no_dues_reapplication_history table with audit trail
    - Added trigger for automatic rejection status
    - Created helper function for reapplication processing
    - Added RLS policies for security
    - Created consolidated view for easy querying
    
    Next Steps:
    1. Deploy API endpoints for reapplication
    2. Update frontend components
    3. Test the complete flow
    
    ============================================================================
    ';
END $$;