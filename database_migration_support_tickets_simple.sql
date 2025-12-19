-- =====================================================
-- DATABASE MIGRATION: Support Tickets Table (Simplified)
-- =====================================================
-- Purpose: Create support_tickets table with minimal validation
-- Date: 2025-01-19
-- Note: This is a SIMPLE schema with NO complex constraints
-- =====================================================

-- Create support_tickets table (if not exists)
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ticket Identification
    ticket_number VARCHAR(50) UNIQUE DEFAULT ('TICKET-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0')),
    
    -- User Information (NO foreign keys, NO validation)
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    user_id UUID,  -- Optional reference to auth.users
    user_type VARCHAR(50) DEFAULT 'student',  -- 'student' or 'department'
    requester_type VARCHAR(50) DEFAULT 'student',  -- 'student' or 'department'
    roll_number VARCHAR(100),  -- Optional for students
    
    -- Ticket Content (NO length limits)
    subject VARCHAR(500) DEFAULT 'Support Request',
    message TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'other',
    priority VARCHAR(50) DEFAULT 'medium',
    
    -- Status (NO enum constraint - just text)
    status VARCHAR(50) DEFAULT 'open',
    
    -- Optional Fields (all nullable)
    related_form_id UUID,
    assigned_to UUID,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create support_messages table (optional - for threaded replies)
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255),
    message TEXT NOT NULL,
    is_staff_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simple indexes for performance (NO unique constraints)
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_email ON support_tickets(user_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_requester_type ON support_tickets(requester_type);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);

-- Add updated_at trigger (auto-update timestamp)
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER set_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_tickets_updated_at();

-- =====================================================
-- VALIDATION SUMMARY
-- =====================================================
-- ✅ NO foreign key constraints (except soft reference)
-- ✅ NO enum types (status/category/priority are plain text)
-- ✅ NO required fields except: user_email, message
-- ✅ NO length limits on message field (TEXT type)
-- ✅ NO check constraints
-- ✅ NO unique constraints (except ticket_number auto-generated)
-- ✅ All fields are nullable except explicitly marked NOT NULL
-- =====================================================

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire SQL script
-- 3. Click "Run" to execute
-- 4. Verify tables were created:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public'
--    AND table_name IN ('support_tickets', 'support_messages');
-- =====================================================

-- =====================================================
-- SAMPLE DATA INSERT (optional - for testing)
-- =====================================================
-- INSERT INTO support_tickets (user_email, user_name, message, requester_type)
-- VALUES 
--   ('student@example.com', 'Test Student', 'This is a test ticket from a student', 'student'),
--   ('dept@example.com', 'Test Department', 'This is a test ticket from a department', 'department');
-- =====================================================

-- =====================================================
-- ROLLBACK (if needed - uncomment to execute)
-- =====================================================
-- DROP TRIGGER IF EXISTS set_support_tickets_updated_at ON support_tickets;
-- DROP FUNCTION IF EXISTS update_support_tickets_updated_at();
-- DROP TABLE IF EXISTS support_messages CASCADE;
-- DROP TABLE IF EXISTS support_tickets CASCADE;
-- =====================================================