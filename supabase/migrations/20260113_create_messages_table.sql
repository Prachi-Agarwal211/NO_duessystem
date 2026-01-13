-- ============================================
-- NO DUES MESSAGES TABLE FOR STUDENT-DEPARTMENT CHAT
-- ============================================

-- Create the messages table
CREATE TABLE IF NOT EXISTS no_dues_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES no_dues_forms(id) ON DELETE CASCADE,
  department_name TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('student', 'department')),
  sender_id UUID,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_messages_form_dept ON no_dues_messages(form_id, department_name);
CREATE INDEX IF NOT EXISTS idx_messages_created ON no_dues_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON no_dues_messages(form_id, department_name, is_read) WHERE is_read = FALSE;

-- Enable Row Level Security
ALTER TABLE no_dues_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Students can read messages for their own forms
CREATE POLICY "Students can read own messages" ON no_dues_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM no_dues_forms ndf
      WHERE ndf.id = no_dues_messages.form_id
      AND ndf.user_id = auth.uid()
    )
  );

-- RLS Policy: Students can insert messages for their own forms
CREATE POLICY "Students can send messages" ON no_dues_messages
  FOR INSERT
  WITH CHECK (
    sender_type = 'student'
    AND EXISTS (
      SELECT 1 FROM no_dues_forms ndf
      WHERE ndf.id = no_dues_messages.form_id
      AND ndf.user_id = auth.uid()
    )
  );

-- RLS Policy: Department staff can read messages for their department
CREATE POLICY "Staff can read department messages" ON no_dues_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN departments d ON d.id = ANY(p.assigned_department_ids)
      WHERE p.id = auth.uid()
      AND d.name = no_dues_messages.department_name
    )
  );

-- RLS Policy: Department staff can insert messages for their department
CREATE POLICY "Staff can send department messages" ON no_dues_messages
  FOR INSERT
  WITH CHECK (
    sender_type = 'department'
    AND EXISTS (
      SELECT 1 FROM profiles p
      JOIN departments d ON d.id = ANY(p.assigned_department_ids)
      WHERE p.id = auth.uid()
      AND d.name = no_dues_messages.department_name
    )
  );

-- RLS Policy: Staff can mark messages as read
CREATE POLICY "Staff can mark as read" ON no_dues_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN departments d ON d.id = ANY(p.assigned_department_ids)
      WHERE p.id = auth.uid()
      AND d.name = no_dues_messages.department_name
    )
  );

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE no_dues_messages;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON no_dues_messages TO authenticated;
