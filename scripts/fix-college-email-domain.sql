-- ============================================================================
-- FIX COLLEGE EMAIL DOMAIN - Change from jecrc.ac.in to jecrcu.edu.in
-- ============================================================================
-- This script fixes the college email domain validation issue
-- Run this in Supabase SQL Editor if you're seeing "jecrc.ac.in" error
-- ============================================================================

-- Check if config_emails table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'config_emails') THEN
        -- Create the table if it doesn't exist
        CREATE TABLE public.config_emails (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            description TEXT,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            updated_by UUID
        );
        
        RAISE NOTICE '✅ Created config_emails table';
    END IF;
END $$;

-- Insert or update the college_domain to jecrcu.edu.in
INSERT INTO public.config_emails (key, value, description)
VALUES ('college_domain', 'jecrcu.edu.in', 'College email domain for validation')
ON CONFLICT (key) 
DO UPDATE SET 
    value = 'jecrcu.edu.in',
    updated_at = NOW();

-- Also update any other email configurations
INSERT INTO public.config_emails (key, value, description)
VALUES 
    ('admin_email', 'admin@jecrcu.edu.in', 'Admin notification email'),
    ('system_email', 'noreply@jecrcu.edu.in', 'System sender email for notifications'),
    ('notifications_enabled', 'true', 'Enable/disable email notifications')
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- Enable RLS if not already enabled
ALTER TABLE public.config_emails ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view email config" ON public.config_emails;
DROP POLICY IF EXISTS "Service role can manage email config" ON public.config_emails;

-- Create RLS policies
CREATE POLICY "Anyone can view email config" ON public.config_emails
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage email config" ON public.config_emails
    FOR ALL USING (true);

-- Verify the changes
SELECT 
    key,
    value,
    description,
    updated_at
FROM public.config_emails
ORDER BY key;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║     COLLEGE EMAIL DOMAIN FIXED SUCCESSFULLY!          ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ College domain updated to: jecrcu.edu.in';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Clear browser cache (Ctrl+Shift+R)';
    RAISE NOTICE '   2. Refresh the student form page';
    RAISE NOTICE '   3. Try submitting with email ending in @jecrcu.edu.in';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  If you still see issues, run FINAL_COMPLETE_DATABASE_SETUP.sql';
    RAISE NOTICE '';
END $$;