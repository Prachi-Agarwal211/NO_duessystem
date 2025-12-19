-- =====================================================
-- SUPPORT TICKETS READ/UNREAD TRACKING MIGRATION
-- =====================================================
-- This adds read tracking functionality to support_tickets
-- Admin can mark tickets as read/unread like email
-- =====================================================

-- Add read tracking columns
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS read_by UUID REFERENCES auth.users(id);

-- Create index for fast unread count queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_unread 
ON support_tickets(is_read) 
WHERE is_read = FALSE;

-- Create index for read_at timestamp
CREATE INDEX IF NOT EXISTS idx_support_tickets_read_at 
ON support_tickets(read_at);

-- Add comments
COMMENT ON COLUMN support_tickets.is_read IS 'Whether admin has read this ticket';
COMMENT ON COLUMN support_tickets.read_at IS 'When admin marked ticket as read';
COMMENT ON COLUMN support_tickets.read_by IS 'Which admin user marked it as read';

-- =====================================================
-- HELPER FUNCTION: Mark ticket as read
-- =====================================================

CREATE OR REPLACE FUNCTION mark_ticket_as_read(ticket_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE support_tickets
  SET 
    is_read = TRUE,
    read_at = NOW(),
    read_by = auth.uid()
  WHERE id = ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION mark_ticket_as_read(UUID) TO authenticated;

-- =====================================================
-- HELPER FUNCTION: Get unread count
-- =====================================================

CREATE OR REPLACE FUNCTION get_unread_support_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM support_tickets 
    WHERE is_read = FALSE 
    AND status != 'resolved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_unread_support_count() TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT '✅ Support read tracking migration complete!' as status;
SELECT 'Added columns: is_read, read_at, read_by' as changes;
SELECT 'Created indexes for performance' as performance;
SELECT 'Added helper functions: mark_ticket_as_read(), get_unread_support_count()' as functions;