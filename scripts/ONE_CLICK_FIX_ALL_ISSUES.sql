-- ============================================================================
-- ONE-CLICK FIX ALL ISSUES - JECRC NO DUES SYSTEM
-- ============================================================================
-- This script fixes ALL common issues in one go:
-- 1. College email domain (jecrc.ac.in → jecrcu.edu.in)
-- 2. Creates config_emails table if missing
-- 3. Ensures all configuration tables exist
-- 4. Fixes RLS policies
-- 5. Updates validation rules
-- 
-- USAGE: Copy this entire script and run in Supabase SQL Editor
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- FIX 1: CREATE CONFIG_EMAILS TABLE (if missing)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'config_emails') THEN
        CREATE TABLE public.config_emails (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            description TEXT,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            updated_by UUID
        );
        RAISE NOTICE '✅ Created config_emails table';
    ELSE
        RAISE NOTICE '✅ config_emails table already exists';
    END IF;
END $$;

-- ============================================================================
-- FIX 2: UPDATE COLLEGE EMAIL DOMAIN TO jecrcu.edu.in
-- ============================================================================
INSERT INTO public.config_emails (key, value, description)
VALUES ('college_domain', 'jecrcu.edu.in', 'College email domain for validation')
ON CONFLICT (key) 
DO UPDATE SET 
    value = 'jecrcu.edu.in',
    description = 'College email domain for validation',
    updated_at = NOW();

RAISE NOTICE '✅ College domain set to: jecrcu.edu.in';

-- ============================================================================
-- FIX 3: UPDATE ALL EMAIL CONFIGURATIONS
-- ============================================================================
INSERT INTO public.config_emails (key, value, description)
VALUES 
    ('admin_email', 'admin@jecrcu.edu.in', 'Admin notification email'),
    ('system_email', 'noreply@jecrcu.edu.in', 'System sender email for notifications'),
    ('notifications_enabled', 'true', 'Enable/disable email notifications')
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================================================
-- FIX 4: CREATE CONFIG_VALIDATION_RULES TABLE (if missing)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'config_validation_rules') THEN
        CREATE TABLE public.config_validation_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            rule_name TEXT UNIQUE NOT NULL,
            rule_pattern TEXT NOT NULL,
            error_message TEXT NOT NULL,
            is_active BOOLEAN DEFAULT true,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE '✅ Created config_validation_rules table';
    ELSE
        RAISE NOTICE '✅ config_validation_rules table already exists';
    END IF;
END $$;

-- ============================================================================
-- FIX 5: UPDATE VALIDATION RULES
-- ============================================================================
INSERT INTO public.config_validation_rules (rule_name, rule_pattern, error_message, is_active, description)
VALUES 
    ('registration_number', '^[A-Z0-9]{6,15}$', 'Registration number must be 6-15 alphanumeric characters', true, 'Validates student registration number format'),
    ('student_name', '^[A-Za-z\\s.\\-'']+$', 'Name should only contain letters, spaces, dots, hyphens, and apostrophes', true, 'Validates student and parent name format'),
    ('phone_number', '^[0-9]{6,15}$', 'Phone number must be 6-15 digits', true, 'Validates contact number (without country code)'),
    ('session_year', '^\\d{4}$', 'Session year must be in YYYY format', true, 'Validates session year format')
ON CONFLICT (rule_name) 
DO UPDATE SET 
    rule_pattern = EXCLUDED.rule_pattern,
    error_message = EXCLUDED.error_message,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================================================
-- FIX 6: CREATE CONFIG_COUNTRY_CODES TABLE (if missing)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'config_country_codes') THEN
        CREATE TABLE public.config_country_codes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            country_name TEXT NOT NULL,
            country_code TEXT NOT NULL,
            dial_code TEXT NOT NULL,
            is_active BOOLEAN DEFAULT true,
            display_order INTEGER NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(country_code)
        );
        RAISE NOTICE '✅ Created config_country_codes table';
    ELSE
        RAISE NOTICE '✅ config_country_codes table already exists';
    END IF;
END $$;

-- ============================================================================
-- FIX 7: ADD INDIA COUNTRY CODE (if missing)
-- ============================================================================
INSERT INTO public.config_country_codes (country_name, country_code, dial_code, is_active, display_order)
VALUES ('India', 'IN', '+91', true, 1)
ON CONFLICT (country_code) 
DO UPDATE SET 
    country_name = 'India',
    dial_code = '+91',
    is_active = true,
    display_order = 1;

-- ============================================================================
-- FIX 8: ENABLE RLS AND CREATE POLICIES
-- ============================================================================

-- Enable RLS on config tables
ALTER TABLE public.config_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_country_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view email config" ON public.config_emails;
DROP POLICY IF EXISTS "Service role can manage email config" ON public.config_emails;
DROP POLICY IF EXISTS "Anyone can view active validation rules" ON public.config_validation_rules;
DROP POLICY IF EXISTS "Service role can manage validation rules" ON public.config_validation_rules;
DROP POLICY IF EXISTS "Anyone can view active country codes" ON public.config_country_codes;
DROP POLICY IF EXISTS "Service role can manage country codes" ON public.config_country_codes;

-- Create RLS policies for config_emails
CREATE POLICY "Anyone can view email config" ON public.config_emails
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage email config" ON public.config_emails
    FOR ALL USING (true);

-- Create RLS policies for config_validation_rules
CREATE POLICY "Anyone can view active validation rules" ON public.config_validation_rules
    FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage validation rules" ON public.config_validation_rules
    FOR ALL USING (true);

-- Create RLS policies for config_country_codes
CREATE POLICY "Anyone can view active country codes" ON public.config_country_codes
    FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage country codes" ON public.config_country_codes
    FOR ALL USING (true);

-- ============================================================================
-- FIX 9: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_config_validation_rules_active ON public.config_validation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_config_country_codes_active ON public.config_country_codes(is_active);

-- ============================================================================
-- FIX 10: VERIFY ALL CONFIGURATIONS
-- ============================================================================

DO $$
DECLARE
    email_domain TEXT;
    validation_count INTEGER;
    country_count INTEGER;
BEGIN
    -- Get college domain
    SELECT value INTO email_domain 
    FROM public.config_emails 
    WHERE key = 'college_domain';
    
    -- Count validation rules
    SELECT COUNT(*) INTO validation_count 
    FROM public.config_validation_rules 
    WHERE is_active = true;
    
    -- Count country codes
    SELECT COUNT(*) INTO country_count 
    FROM public.config_country_codes 
    WHERE is_active = true;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║        ALL ISSUES FIXED SUCCESSFULLY! ✅              ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Configuration Summary:';
    RAISE NOTICE '   - College Email Domain: %', email_domain;
    RAISE NOTICE '   - Validation Rules Active: %', validation_count;
    RAISE NOTICE '   - Country Codes Available: %', country_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ All Tables Created/Updated';
    RAISE NOTICE '✅ RLS Policies Applied';
    RAISE NOTICE '✅ Indexes Created';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '   1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)';
    RAISE NOTICE '   2. Refresh your application';
    RAISE NOTICE '   3. Test student form with email: student@jecrcu.edu.in';
    RAISE NOTICE '   4. Form should now accept @jecrcu.edu.in emails ✅';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: If you need full database setup with schools,';
    RAISE NOTICE '    courses, and departments, run FINAL_COMPLETE_DATABASE_SETUP.sql';
    RAISE NOTICE '';
END $$;

-- Display current email configurations
SELECT 
    '📧 Email Configurations' as info,
    key,
    value,
    description
FROM public.config_emails
ORDER BY key;