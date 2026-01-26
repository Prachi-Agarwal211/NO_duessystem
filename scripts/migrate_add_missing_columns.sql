-- ============================================================================
-- MIGRATION: Add missing columns to existing tables
-- Run this in Supabase SQL Editor to fix schema mismatches
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add missing columns to no_dues_reapplication_history
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS no_dues_reapplication_history
ADD COLUMN IF NOT EXISTS department_name TEXT;

ALTER TABLE IF EXISTS no_dues_reapplication_history
ADD COLUMN IF NOT EXISTS edited_fields JSONB DEFAULT '{}';

ALTER TABLE IF EXISTS no_dues_reapplication_history
ADD COLUMN IF NOT EXISTS previous_status JSONB DEFAULT '[]';

-- ----------------------------------------------------------------------------
-- 2. Add missing columns to no_dues_forms
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS no_dues_forms
ADD COLUMN IF NOT EXISTS rejection_context JSONB;

ALTER TABLE IF EXISTS no_dues_forms
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

ALTER TABLE IF EXISTS no_dues_forms
ADD COLUMN IF NOT EXISTS department_unread_counts JSONB DEFAULT '{}';

-- ----------------------------------------------------------------------------
-- 3. Add missing column to no_dues_status
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS no_dues_status
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- ----------------------------------------------------------------------------
-- 4. Create support_tickets table if not exists
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Create indexes for support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_form_id ON support_tickets(form_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_registration_no ON support_tickets(registration_no);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);

-- Enable RLS for support_tickets
ALTER TABLE IF EXISTS support_tickets ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for support_tickets
DROP POLICY IF EXISTS "Service role full access" ON support_tickets;
CREATE POLICY "Service role full access" ON support_tickets FOR ALL TO postgres USING (true);

-- ----------------------------------------------------------------------------
-- 5. Create no_dues_messages table if not exists (for chat)
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_form_id ON no_dues_messages(form_id);
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_department ON no_dues_messages(department_name);
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_created_at ON no_dues_messages(created_at);

-- Enable RLS
ALTER TABLE IF EXISTS no_dues_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Service role full access" ON no_dues_messages;
CREATE POLICY "Service role full access" ON no_dues_messages FOR ALL TO postgres USING (true);

-- ----------------------------------------------------------------------------
-- 6. Add indexes to improve query performance
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_registration_no ON no_dues_forms(registration_no);
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_status ON no_dues_forms(status);
CREATE INDEX IF NOT EXISTS idx_no_dues_status_form_id ON no_dues_status(form_id);
CREATE INDEX IF NOT EXISTS idx_no_dues_status_department ON no_dues_status(department_name);

-- ----------------------------------------------------------------------------
-- 7. Verify the tables and columns
-- ----------------------------------------------------------------------------
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('no_dues_forms', 'no_dues_status', 'no_dues_reapplication_history', 'no_dues_messages', 'support_tickets')
ORDER BY table_name, ordinal_position;
