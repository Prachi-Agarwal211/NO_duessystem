-- ============================================================================
-- STUDENT EMAIL NOTIFICATIONS FIX
-- ============================================================================
-- This migration adds email tracking columns to enable student notifications
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add email columns to no_dues_forms table
-- ============================================================================
-- These columns will store student emails for notification purposes

-- Add personal_email column if it doesn't exist (should already exist from form submission)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' 
        AND column_name = 'personal_email'
    ) THEN
        ALTER TABLE no_dues_forms 
        ADD COLUMN personal_email TEXT;
        
        COMMENT ON COLUMN no_dues_forms.personal_email IS 'Student personal email address for notifications';
    END IF;
END $$;

-- Add college_email column if it doesn't exist (should already exist from form submission)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' 
        AND column_name = 'college_email'
    ) THEN
        ALTER TABLE no_dues_forms 
        ADD COLUMN college_email TEXT;
        
        COMMENT ON COLUMN no_dues_forms.college_email IS 'Student college email address for notifications';
    END IF;
END $$;

-- Add email_notifications_enabled flag
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' 
        AND column_name = 'email_notifications_enabled'
    ) THEN
        ALTER TABLE no_dues_forms 
        ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT TRUE;
        
        COMMENT ON COLUMN no_dues_forms.email_notifications_enabled IS 'Whether to send email notifications to this student';
    END IF;
END $$;

-- Add last_notification_sent timestamp
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' 
        AND column_name = 'last_notification_sent'
    ) THEN
        ALTER TABLE no_dues_forms 
        ADD COLUMN last_notification_sent TIMESTAMPTZ;
        
        COMMENT ON COLUMN no_dues_forms.last_notification_sent IS 'Timestamp of last email notification sent to student';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create indexes for better email query performance
-- ============================================================================

-- Index on personal_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_personal_email 
ON no_dues_forms(personal_email) 
WHERE personal_email IS NOT NULL;

-- Index on college_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_college_email 
ON no_dues_forms(college_email) 
WHERE college_email IS NOT NULL;

-- Index on email notifications enabled flag
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_email_enabled 
ON no_dues_forms(email_notifications_enabled) 
WHERE email_notifications_enabled = TRUE;

-- ============================================================================
-- STEP 3: Update existing records (if any have NULL emails)
-- ============================================================================
-- This ensures all existing forms have the notification flag set

UPDATE no_dues_forms 
SET email_notifications_enabled = TRUE 
WHERE email_notifications_enabled IS NULL;

-- ============================================================================
-- STEP 4: Add validation constraints
-- ============================================================================

-- Ensure email format is valid (basic check)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_personal_email_format'
    ) THEN
        ALTER TABLE no_dues_forms 
        ADD CONSTRAINT check_personal_email_format 
        CHECK (
            personal_email IS NULL 
            OR personal_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_college_email_format'
    ) THEN
        ALTER TABLE no_dues_forms 
        ADD CONSTRAINT check_college_email_format 
        CHECK (
            college_email IS NULL 
            OR college_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        );
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Create email notification log table
-- ============================================================================
-- Track all email notifications sent to students

CREATE TABLE IF NOT EXISTS email_notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES no_dues_forms(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    notification_type TEXT NOT NULL, -- 'status_update', 'certificate_ready', 'rejection', etc.
    department_name TEXT,
    status TEXT NOT NULL, -- 'sent', 'failed', 'queued'
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for log table
CREATE INDEX IF NOT EXISTS idx_email_log_form_id ON email_notification_log(form_id);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_notification_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_notification_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON email_notification_log(sent_at DESC);

-- Add comment
COMMENT ON TABLE email_notification_log IS 'Log of all email notifications sent to students';

-- ============================================================================
-- STEP 6: Create helper function to log email notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION log_email_notification(
    p_form_id UUID,
    p_recipient_email TEXT,
    p_notification_type TEXT,
    p_department_name TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'sent',
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO email_notification_log (
        form_id,
        recipient_email,
        notification_type,
        department_name,
        status,
        error_message
    ) VALUES (
        p_form_id,
        p_recipient_email,
        p_notification_type,
        p_department_name,
        p_status,
        p_error_message
    ) RETURNING id INTO v_log_id;
    
    -- Update last notification sent timestamp on form
    UPDATE no_dues_forms 
    SET last_notification_sent = NOW() 
    WHERE id = p_form_id;
    
    RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION log_email_notification IS 'Log email notification sent to student';

-- ============================================================================
-- STEP 7: Grant necessary permissions
-- ============================================================================

-- Grant permissions on email_notification_log
GRANT SELECT, INSERT ON email_notification_log TO authenticated;
GRANT SELECT, INSERT ON email_notification_log TO service_role;

-- Grant execute on helper function
GRANT EXECUTE ON FUNCTION log_email_notification TO authenticated;
GRANT EXECUTE ON FUNCTION log_email_notification TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if columns were added successfully
DO $$
DECLARE
    v_personal_email_exists BOOLEAN;
    v_college_email_exists BOOLEAN;
    v_notifications_enabled_exists BOOLEAN;
    v_last_notification_exists BOOLEAN;
    v_log_table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' AND column_name = 'personal_email'
    ) INTO v_personal_email_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' AND column_name = 'college_email'
    ) INTO v_college_email_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' AND column_name = 'email_notifications_enabled'
    ) INTO v_notifications_enabled_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' AND column_name = 'last_notification_sent'
    ) INTO v_last_notification_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'email_notification_log'
    ) INTO v_log_table_exists;
    
    RAISE NOTICE '===== MIGRATION VERIFICATION =====';
    RAISE NOTICE 'personal_email column: %', CASE WHEN v_personal_email_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'college_email column: %', CASE WHEN v_college_email_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'email_notifications_enabled column: %', CASE WHEN v_notifications_enabled_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'last_notification_sent column: %', CASE WHEN v_last_notification_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'email_notification_log table: %', CASE WHEN v_log_table_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '==================================';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- UNCOMMENT BELOW TO ROLLBACK CHANGES

/*
BEGIN;

-- Drop helper function
DROP FUNCTION IF EXISTS log_email_notification;

-- Drop log table
DROP TABLE IF EXISTS email_notification_log CASCADE;

-- Remove columns from no_dues_forms
ALTER TABLE no_dues_forms DROP COLUMN IF EXISTS email_notifications_enabled;
ALTER TABLE no_dues_forms DROP COLUMN IF EXISTS last_notification_sent;

-- Note: We keep personal_email and college_email as they're used for form submission

COMMIT;
*/