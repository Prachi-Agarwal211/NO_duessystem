-- Add missing columns to support_tickets table
-- This script ensures all required columns exist for the support system.

DO $$ 
BEGIN
    -- Add is_read column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'is_read'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add read_at column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'read_at'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add read_by column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'read_by'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN read_by UUID REFERENCES auth.users(id);
    END IF;

    -- Add resolved_at column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'resolved_at'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add resolved_by column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'resolved_by'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN resolved_by UUID REFERENCES auth.users(id);
    END IF;

    -- Add updated_at column if not exists (should already be there but just in case)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Ensure ticket_number is unique and indexed (should already be)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'support_tickets' AND indexname = 'support_tickets_ticket_number_idx'
    ) THEN
        CREATE UNIQUE INDEX support_tickets_ticket_number_idx ON support_tickets(ticket_number);
    END IF;

    -- Add RLS policy for support_tickets if not exists (optional)
    -- Note: RLS should already be enabled.
END $$;

-- Update any existing rows with default values
UPDATE support_tickets SET is_read = FALSE WHERE is_read IS NULL;