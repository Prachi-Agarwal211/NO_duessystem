-- =====================================================
-- DATABASE MIGRATION: Support Tickets Table (Simplified)
-- =====================================================
-- Purpose: Create/Update support_tickets table with minimal validation
-- Date: 2025-01-19
-- Note: This script SAFELY handles existing tables
-- =====================================================

-- =====================================================
-- OPTION 1: FRESH START (Recommended for new deployments)
-- =====================================================
-- Uncomment these lines if you want to start fresh:

-- DROP TABLE IF EXISTS support_messages CASCADE;
-- DROP TABLE IF EXISTS support_tickets CASCADE;

-- =====================================================
-- OPTION 2: SAFE MIGRATION (Recommended for existing data)
-- =====================================================
-- This approach modifies existing tables without data loss

-- Step 1: Create tables if they don't exist
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ticket Identification
    ticket_number VARCHAR(50) UNIQUE,
    
    -- User Information (NO foreign keys, NO validation)
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    user_id UUID,
    user_type VARCHAR(50) DEFAULT 'student',
    requester_type VARCHAR(50) DEFAULT 'student',
    roll_number VARCHAR(100),
    
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

CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255),
    message TEXT NOT NULL,
    is_staff_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add missing columns to existing tables (if they exist)
-- These will be ignored if columns already exist

DO $$ 
BEGIN
    -- Add ticket_number if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='ticket_number'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN ticket_number VARCHAR(50) UNIQUE;
    END IF;

    -- Add user_email if missing (rename from 'email' if needed)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='user_email'
    ) THEN
        -- Check if 'email' column exists instead
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='support_tickets' AND column_name='email'
        ) THEN
            ALTER TABLE support_tickets RENAME COLUMN email TO user_email;
        ELSE
            ALTER TABLE support_tickets ADD COLUMN user_email VARCHAR(255) NOT NULL DEFAULT 'unknown@example.com';
        END IF;
    END IF;

    -- Add user_name if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='user_name'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN user_name VARCHAR(255);
    END IF;

    -- Add user_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='user_id'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN user_id UUID;
    END IF;

    -- Add requester_type if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='requester_type'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN requester_type VARCHAR(50) DEFAULT 'student';
    END IF;

    -- Add user_type if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='user_type'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN user_type VARCHAR(50) DEFAULT 'student';
    END IF;

    -- Add roll_number if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='roll_number'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN roll_number VARCHAR(100);
    END IF;

    -- Add subject if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='subject'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN subject VARCHAR(500) DEFAULT 'Support Request';
    END IF;

    -- Add message if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='message'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN message TEXT NOT NULL DEFAULT '';
    END IF;

    -- Add category if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='category'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN category VARCHAR(100) DEFAULT 'other';
    END IF;

    -- Add priority if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='priority'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN priority VARCHAR(50) DEFAULT 'medium';
    END IF;

    -- Add status if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='status'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN status VARCHAR(50) DEFAULT 'open';
    END IF;

    -- Add related_form_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='related_form_id'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN related_form_id UUID;
    END IF;

    -- Add assigned_to if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='assigned_to'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN assigned_to UUID;
    END IF;

    -- Add resolved_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='resolved_at'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;

    -- Add resolved_by if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='resolved_by'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN resolved_by VARCHAR(255);
    END IF;

    -- Add created_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='created_at'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='support_tickets' AND column_name='updated_at'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

END $$;

-- Step 3: Update ticket_number for existing rows that don't have one
UPDATE support_tickets
SET ticket_number = 'TICKET-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0')
WHERE ticket_number IS NULL;

-- Step 4: Create indexes (if not exist)
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_email ON support_tickets(user_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_requester_type ON support_tickets(requester_type);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);

-- Step 5: Create/Replace updated_at trigger
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
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration worked:

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'support_tickets'
-- ORDER BY ordinal_position;

-- Check existing data
-- SELECT COUNT(*), requester_type, status
-- FROM support_tickets
-- GROUP BY requester_type, status;

-- =====================================================
-- CLEANUP (Optional - removes constraints if any exist)
-- =====================================================
-- Uncomment these if you have complex constraints to remove:

-- Remove enum types if they exist
-- DO $$ 
-- BEGIN
--     DROP TYPE IF EXISTS ticket_status CASCADE;
--     DROP TYPE IF EXISTS ticket_priority CASCADE;
--     DROP TYPE IF EXISTS ticket_category CASCADE;
-- END $$;

-- Remove foreign keys (except support_messages.ticket_id which we keep)
-- ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS fk_user_id;
-- ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS fk_assigned_to;
-- ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS fk_related_form_id;

-- =====================================================
-- COMPLETE ROLLBACK (if needed - use with caution!)
-- =====================================================
-- DROP TRIGGER IF EXISTS set_support_tickets_updated_at ON support_tickets;
-- DROP FUNCTION IF EXISTS update_support_tickets_updated_at();
-- DROP TABLE IF EXISTS support_messages CASCADE;
-- DROP TABLE IF EXISTS support_tickets CASCADE;
-- =====================================================

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Support Tickets Migration Complete!';
    RAISE NOTICE 'Tables: support_tickets, support_messages';
    RAISE NOTICE 'Indexes: Created/Updated';
    RAISE NOTICE 'Triggers: Updated';
    RAISE NOTICE 'Run verification queries above to confirm.';
END $$;