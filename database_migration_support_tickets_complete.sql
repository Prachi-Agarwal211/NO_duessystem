-- =====================================================
-- COMPLETE MIGRATION: Support Tickets with Realtime & RLS
-- =====================================================
-- Purpose: Create support_tickets table with realtime enabled and RLS policies
-- Date: 2025-12-19
-- Features: Realtime updates, Row Level Security, Indexes
-- =====================================================

-- Step 1: Drop existing tables if fresh start (uncomment if needed)
-- DROP TABLE IF EXISTS support_messages CASCADE;
-- DROP TABLE IF EXISTS support_tickets CASCADE;

-- Step 2: Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ticket Identification
    ticket_number VARCHAR(50) UNIQUE,
    
    -- User Information
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    user_id UUID,
    user_type VARCHAR(50) DEFAULT 'student',
    requester_type VARCHAR(50) DEFAULT 'student',
    roll_number VARCHAR(100),
    
    -- Ticket Content
    subject VARCHAR(500) DEFAULT 'Support Request',
    message TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'other',
    priority VARCHAR(50) DEFAULT 'medium',
    
    -- Status
    status VARCHAR(50) DEFAULT 'open',
    
    -- Optional Fields
    related_form_id UUID,
    assigned_to UUID,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255),
    message TEXT NOT NULL,
    is_staff_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Add missing columns if table already exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='ticket_number') THEN
        ALTER TABLE support_tickets ADD COLUMN ticket_number VARCHAR(50) UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='user_email') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='email') THEN
            ALTER TABLE support_tickets RENAME COLUMN email TO user_email;
        ELSE
            ALTER TABLE support_tickets ADD COLUMN user_email VARCHAR(255) NOT NULL DEFAULT 'unknown@example.com';
        END IF;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='requester_type') THEN
        ALTER TABLE support_tickets ADD COLUMN requester_type VARCHAR(50) DEFAULT 'student';
    END IF;
END $$;

-- Step 5: Update ticket_number for existing rows
UPDATE support_tickets
SET ticket_number = 'TICKET-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0')
WHERE ticket_number IS NULL;

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_email ON support_tickets(user_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_requester_type ON support_tickets(requester_type);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);

-- Step 7: Create updated_at trigger
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
-- REALTIME CONFIGURATION
-- =====================================================

-- Step 8: Enable Realtime on support_tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;

-- Step 9: Enable Realtime on support_messages table (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Step 10: Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Step 11: Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can create support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Anyone can create support messages" ON support_messages;
DROP POLICY IF EXISTS "Admins can view all support messages" ON support_messages;

-- Step 12: Create RLS Policies for support_tickets

-- Policy 1: Allow anyone to INSERT (student/staff submissions)
CREATE POLICY "Anyone can create support tickets"
    ON support_tickets
    FOR INSERT
    WITH CHECK (true);

-- Policy 2: Allow admins to SELECT all tickets
CREATE POLICY "Admins can view all support tickets"
    ON support_tickets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Policy 3: Allow admins to UPDATE tickets
CREATE POLICY "Admins can update support tickets"
    ON support_tickets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Step 13: Create RLS Policies for support_messages

-- Policy 1: Allow anyone to INSERT messages
CREATE POLICY "Anyone can create support messages"
    ON support_messages
    FOR INSERT
    WITH CHECK (true);

-- Policy 2: Allow admins to SELECT all messages
CREATE POLICY "Admins can view all support messages"
    ON support_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check RLS is enabled
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'support_tickets' 
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS enabled on support_tickets';
    ELSE
        RAISE WARNING '❌ RLS not enabled on support_tickets';
    END IF;
END $$;

-- Check policies exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'support_tickets'
    ) THEN
        RAISE NOTICE '✅ RLS policies created';
    ELSE
        RAISE WARNING '❌ No RLS policies found';
    END IF;
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ SUPPORT TICKETS MIGRATION COMPLETE!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Tables Created: support_tickets, support_messages';
    RAISE NOTICE 'Indexes: ✅ Created';
    RAISE NOTICE 'Triggers: ✅ Updated';
    RAISE NOTICE 'Realtime: ✅ Enabled';
    RAISE NOTICE 'RLS Policies: ✅ Configured';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Verify in Supabase Dashboard → Database → Replication';
    RAISE NOTICE '2. Check that support_tickets is in supabase_realtime publication';
    RAISE NOTICE '3. Test ticket submission and realtime updates';
    RAISE NOTICE '================================================';
END $$;

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'support_tickets'
ORDER BY ordinal_position;