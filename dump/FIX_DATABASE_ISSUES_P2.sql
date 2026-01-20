-- ============================================================================
-- JECRC NO DUES SYSTEM - DATABASE FIXES PHASE 2
-- ============================================================================
-- This script fixes missing tables and columns discovered during deep audit.
-- ============================================================================

BEGIN;

-- 1. FIX EMAIL_LOGS TABLE
-- Add missing email_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_logs' AND column_name='email_type') THEN
        ALTER TABLE public.email_logs ADD COLUMN email_type TEXT;
    END IF;
END $$;

-- 2. CREATE REMINDER_LOGS TABLE
-- This table is required for the daily digest and reminder analytics
CREATE TABLE IF NOT EXISTS public.reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_name TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    staff_emails TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'sent',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS for reminder_logs
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage reminder_logs" ON public.reminder_logs;
CREATE POLICY "Admin manage reminder_logs" ON public.reminder_logs FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. UTILITY FUNCTON FOR SCHEMA VERIFICATION
-- This allows the assistant to verify schema without samples
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name TEXT)
RETURNS TABLE (column_name TEXT, data_type TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT c.column_name::TEXT, c.data_type::TEXT
    FROM information_schema.columns c
    WHERE c.table_name = get_table_columns.table_name
    AND c.table_schema = 'public'
    ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ENABLE REALTIME FOR MISSING TABLES
-- Ensure email_logs and support_tickets are also in the publication
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
    EXCEPTION WHEN others THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs;
    EXCEPTION WHEN others THEN NULL;
    END;
END $$;

COMMIT;
