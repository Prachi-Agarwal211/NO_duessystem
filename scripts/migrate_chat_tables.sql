-- ============================================================================
-- MIGRATION: Add missing chat tables (safe - won't affect existing data)
-- ============================================================================

-- Create no_dues_messages table for chat
CREATE TABLE IF NOT EXISTS no_dues_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES no_dues_forms(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL,
    message TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('student', 'department')),
    sender_name TEXT NOT NULL,
    sender_id TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_form_id ON no_dues_messages(form_id);
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_department ON no_dues_messages(department_name);
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_created_at ON no_dues_messages(created_at);

-- Enable RLS
ALTER TABLE IF EXISTS no_dues_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (ignore error if already exists)
DROP POLICY IF EXISTS "Service role full access" ON no_dues_messages;
CREATE POLICY "Service role full access" ON no_dues_messages FOR ALL TO service_role USING (true);
