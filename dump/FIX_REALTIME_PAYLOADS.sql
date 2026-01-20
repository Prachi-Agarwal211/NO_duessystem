-- ============================================================================
-- JECRC NO DUES SYSTEM - REALTIME PAYLOAD FIX
-- ============================================================================
-- This script fixes the "empty realtime payloads" by:
-- 1. Ensuring RLS allows SELECT for the Realtime listener (anon/public).
-- 2. Explicitly setting REPLICA IDENTITY FULL for data streaming.
-- ============================================================================

BEGIN;

-- 1. REPLICA IDENTITY (Required for UPDATE/DELETE payloads)
ALTER TABLE public.no_dues_forms REPLICA IDENTITY FULL;
ALTER TABLE public.no_dues_status REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;

-- 2. RLS POLICIES FOR REALTIME VISIBILITY
-- For Realtime to stream data, the user subscribing must have SELECT permission.
-- Since the frontend uses a public/shared channel, we need to allow SELECT for specific columns
-- OR check if we can add a bypass for the service role if we use it for listeners.
-- NOTE: In Supabase, Realtime respects RLS. If a user can't SELECT a row, they won't 
-- see it in Realtime either.

-- Enable public read for form status (non-sensitive info)
-- This ensures students and staff can see the LIVE updates.
DROP POLICY IF EXISTS "Public read no_dues_forms" ON public.no_dues_forms;
CREATE POLICY "Public read no_dues_forms" ON public.no_dues_forms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read no_dues_status" ON public.no_dues_status;
CREATE POLICY "Public read no_dues_status" ON public.no_dues_status FOR SELECT USING (true);

-- 3. ENSURE PUBLICATION IS FULLY CONFIGURED
-- Sometimes ADD TABLE is not enough if columns are restricted
-- We recreate the publication to be sure
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.no_dues_forms, 
    public.no_dues_status, 
    public.support_tickets,
    public.email_logs;

COMMIT;
