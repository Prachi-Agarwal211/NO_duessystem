-- Migration: Add unread_count columns to support chat and status tracking
-- Run this in Supabase SQL Editor

-- ============================================
-- Add unread_count column to no_dues_status table
-- ============================================
ALTER TABLE no_dues_status ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- ============================================
-- Add is_read column to no_dues_messages table if not exists
-- ============================================
ALTER TABLE no_dues_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- ============================================
-- Add read_at timestamp to no_dues_messages
-- ============================================
ALTER TABLE no_dues_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- Add indexes for better performance on message queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_form_department_unread 
ON no_dues_messages(form_id, department_name, is_read) 
WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_no_dues_status_unread_count 
ON no_dues_status(form_id, department_name) 
WHERE unread_count > 0;

-- ============================================
-- Function to increment unread count when new message is sent
-- ============================================
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE no_dues_status 
  SET unread_count = unread_count + 1
  WHERE form_id = NEW.form_id 
  AND department_name = NEW.department_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger to call function on new message
-- ============================================
DROP TRIGGER IF EXISTS trigger_increment_unread_count ON no_dues_messages;
CREATE TRIGGER trigger_increment_unread_count
  AFTER INSERT ON no_dues_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_unread_count();

-- ============================================
-- Function to reset unread count when department reads messages
-- ============================================
CREATE OR REPLACE FUNCTION reset_unread_count(p_form_id UUID, p_department_name TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE no_dues_status 
  SET unread_count = 0
  WHERE form_id = p_form_id 
  AND department_name = p_department_name;
  
  UPDATE no_dues_messages
  SET is_read = TRUE, read_at = NOW()
  WHERE form_id = p_form_id 
  AND department_name = p_department_name
  AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function to get unread count for a form/department
-- ============================================
CREATE OR REPLACE FUNCTION get_unread_count(p_form_id UUID, p_department_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM no_dues_messages
  WHERE form_id = p_form_id 
  AND department_name = p_department_name
  AND is_read = FALSE;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Add updated_at to support_tickets if not exists
-- ============================================
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS responded_by UUID;

-- ============================================
-- Grant execute on functions to authenticated users
-- ============================================
GRANT EXECUTE ON FUNCTION increment_unread_count() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_unread_count(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_count(UUID, TEXT) TO authenticated;

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON COLUMN no_dues_status.unread_count IS 'Tracks number of unread messages for this form/department';
COMMENT ON COLUMN no_dues_messages.is_read IS 'Whether the message has been read by the recipient';
COMMENT ON COLUMN no_dues_messages.read_at IS 'Timestamp when the message was marked as read';
COMMENT ON FUNCTION increment_unread_count() IS 'Trigger function to increment unread count when new message is inserted';
COMMENT ON FUNCTION reset_unread_count(UUID, TEXT) IS 'Resets unread count and marks messages as read for a form/department';
COMMENT ON FUNCTION get_unread_count(UUID, TEXT) IS 'Returns the unread message count for a form/department';

-- ============================================
-- Verify changes
-- ============================================
SELECT 
  'no_dues_status' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'no_dues_status' AND column_name = 'unread_count'

UNION ALL

SELECT 
  'no_dues_messages' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'no_dues_messages' AND column_name IN ('is_read', 'read_at');

-- Check triggers
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_increment_unread_count';
