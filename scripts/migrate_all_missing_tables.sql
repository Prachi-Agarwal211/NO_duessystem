-- ============================================================================
-- COMPLETE MIGRATION: All missing tables for chat, reapplication, and support
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create no_dues_messages table for chat
-- ----------------------------------------------------------------------------
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

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_form_id ON no_dues_messages(form_id);
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_department ON no_dues_messages(department_name);
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_created_at ON no_dues_messages(created_at);

-- Enable RLS
ALTER TABLE IF EXISTS no_dues_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for service role (bypasses RLS)
DROP POLICY IF EXISTS "Service role full access" ON no_dues_messages;
CREATE POLICY "Service role full access" ON no_dues_messages FOR ALL TO postgres USING (true);

-- ----------------------------------------------------------------------------
-- 2. Create no_dues_reapplication_history table for reapplication tracking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS no_dues_reapplication_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES no_dues_forms(id) ON DELETE CASCADE,
    reapplication_number INTEGER NOT NULL DEFAULT 1,
    department_name TEXT,
    student_reply_message TEXT,
    edited_fields JSONB DEFAULT '{}',
    previous_status JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for reapplication history
CREATE INDEX IF NOT EXISTS idx_reapplication_history_form_id ON no_dues_reapplication_history(form_id);
CREATE INDEX IF NOT EXISTS idx_reapplication_history_created_at ON no_dues_reapplication_history(created_at);

-- Enable RLS
ALTER TABLE IF EXISTS no_dues_reapplication_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Service role full access" ON no_dues_reapplication_history;
CREATE POLICY "Service role full access" ON no_dues_reapplication_history FOR ALL TO postgres USING (true);

-- ----------------------------------------------------------------------------
-- 3. Create support_tickets table for student support
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID REFERENCES no_dues_forms(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    registration_no TEXT NOT NULL,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW TIMESTAMPT(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Create indexes for support tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_form_id ON support_tickets(form_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_registration_no ON support_tickets(registration_no);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);

-- Enable RLS
ALTER TABLE IF EXISTS support_tickets ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Service role full access" ON support_tickets;
CREATE POLICY "Service role full access" ON support_tickets FOR ALL TO postgres USING (true);

-- ----------------------------------------------------------------------------
-- 4. Add unread_count columns to no_dues_forms for students
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS no_dues_forms
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Add updated_at if not exists
ALTER TABLE IF EXISTS no_dues_forms
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Update timestamp trigger function if needed
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_no_dues_forms_updated_at ON no_dues_forms;
CREATE TRIGGER update_no_dues_forms_updated_at
    BEFORE UPDATE ON no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5. Add unread_count columns to no_dues_forms for departments
-- ----------------------------------------------------------------------------
-- This requires adding a JSONB column to store per-department unread counts
ALTER TABLE IF EXISTS no_dues_forms
ADD COLUMN IF NOT EXISTS department_unread_counts JSONB DEFAULT '{}';

-- ----------------------------------------------------------------------------
-- 6. Add unread_count to no_dues_status for tracking read status
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS no_dues_status
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Add updated_at if not exists
ALTER TABLE IF EXISTS no_dues_status
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Trigger to auto-update updated_at for no_dues_status
DROP TRIGGER IF EXISTS update_no_dues_status_updated_at ON no_dues_status;
CREATE TRIGGER update_no_dues_status_updated_at
    BEFORE UPDATE ON no_dues_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 7. Add student_otp_logs table (if not exists)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_otp_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    registration_no TEXT NOT NULL,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_otp_logs_registration_no ON student_otp_logs(registration_no);
CREATE INDEX IF NOT EXISTS idx_student_otp_logs_expires_at ON student_otp_logs(expires_at);

-- ----------------------------------------------------------------------------
-- 8. Create indexes for better query performance on existing tables
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_registration_no ON no_dues_forms(registration_no);
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_status ON no_dues_forms(status);
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_student_email ON no_dues_forms(personal_email);
CREATE INDEX IF NOT EXISTS idx_no_dues_status_form_id ON no_dues_status(form_id);
CREATE INDEX IF NOT EXISTS idx_no_dues_status_department ON no_dues_status(department_name);

-- ----------------------------------------------------------------------------
-- Verification: Show created tables
-- ----------------------------------------------------------------------------
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'no_dues_%' 
OR table_name = 'support_tickets'
ORDER BY table_name;
