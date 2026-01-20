-- ============================================================================
-- JECRC NO DUES SYSTEM - DATABASE FIXES & EXTENSIONS
-- ============================================================================
-- This script fixes the "missing columns/functions" and "no realtime" issues.
-- ============================================================================

BEGIN;

-- 1. REALTIME ACTIVATION
-- Ensure the publication exists and add tables to it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Enable REPLICA IDENTITY FULL for tables where we need to compare OLD vs NEW in Realtime
ALTER TABLE public.no_dues_forms REPLICA IDENTITY FULL;
ALTER TABLE public.no_dues_status REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;

-- Add tables to the publication (ignore errors if already added)
DO $$
BEGIN
    -- We use a loop or multiple calls; simpler to just try and catch
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.no_dues_forms;
    EXCEPTION WHEN others THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.no_dues_status;
    EXCEPTION WHEN others THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
    EXCEPTION WHEN others THEN NULL;
    END;
END $$;

-- 2. STATS & ANALYTICS FUNCTIONS (RPCs)
-- These are required by the Admin Dashboard / API

-- Function: Get overall form statistics
CREATE OR REPLACE FUNCTION public.get_form_statistics()
RETURNS TABLE (
    total_applications BIGINT,
    pending_applications BIGINT,
    approved_applications BIGINT,
    rejected_applications BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_applications,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_applications,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as approved_applications,
        COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_applications
    FROM public.no_dues_forms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get department-specific workload
CREATE OR REPLACE FUNCTION public.get_department_workload()
RETURNS TABLE (
    department_name TEXT,
    pending_count BIGINT,
    approved_count BIGINT,
    rejected_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        status.department_name,
        COUNT(*) FILTER (WHERE status.status = 'pending')::BIGINT as pending_count,
        COUNT(*) FILTER (WHERE status.status = 'approved')::BIGINT as approved_count,
        COUNT(*) FILTER (WHERE status.status = 'rejected')::BIGINT as rejected_count
    FROM public.no_dues_status status
    GROUP BY status.department_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. VALIDATION RULES SEED DATA
-- The config_validation_rules table was found empty
INSERT INTO public.config_validation_rules (type, pattern, message) VALUES
('email', '^[a-zA-Z0-9._%+-]+@jecrcu\.edu\.in$', 'Please use your official college email (@jecrcu.edu.in)'),
('registration_no', '^[0-9]{2}[a-zA-Z]{3}[0-9]{3}$', 'Invalid registration number format (e.g., 21BCS001)'),
('phone', '^[0-9]{10}$', 'Phone number must be 10 digits')
ON CONFLICT DO NOTHING;

-- 4. MISSING COLUMNS / CONSTRAINTS CHECK
-- Ensure profiles metadata is present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='metadata') THEN
        ALTER TABLE public.profiles ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Ensure system_config fallback (if some old code still references it)
-- Based on codebase check, it seems it's NOT used, but we can create a view or table if needed.
-- For now, let's just make sure config_emails has the essential keys.
INSERT INTO public.config_emails (key, value, description) VALUES
('maintenance_mode', 'false', 'Enable to block student submissions'),
('allow_reapplication', 'true', 'Allow students to resubmit after rejection')
ON CONFLICT (key) DO NOTHING;

COMMIT;
