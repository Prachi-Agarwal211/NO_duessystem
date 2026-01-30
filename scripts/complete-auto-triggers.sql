-- ============================================================================
-- COMPLETE DATABASE AUTOMATION TRIGGERS
-- Run this in Supabase SQL Editor to enable all automations
-- ============================================================================
-- 
-- This script creates ALL needed triggers for the No Dues system:
-- 1. Auto-update form status when departments approve/reject
-- 2. Auto-update updated_at timestamps
-- 3. Blockchain columns for certificate storage
-- 4. Chat FK constraint fix for student messages
--
-- ============================================================================

-- ============================================================================
-- SECTION 1: FORM STATUS AUTO-UPDATE TRIGGER
-- Updates no_dues_forms.status when no_dues_status changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_form_status_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
    total_depts INTEGER;
    approved_count INTEGER;
    rejected_count INTEGER;
    pending_count INTEGER;
    new_status TEXT;
BEGIN
    -- Count department statuses for this form
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'approved'),
        COUNT(*) FILTER (WHERE status = 'rejected'),
        COUNT(*) FILTER (WHERE status = 'pending')
    INTO total_depts, approved_count, rejected_count, pending_count
    FROM no_dues_status
    WHERE form_id = NEW.form_id;

    -- Determine new form status
    IF rejected_count > 0 THEN
        new_status := 'rejected';
    ELSIF approved_count = total_depts AND total_depts > 0 THEN
        new_status := 'completed';
    ELSIF pending_count = total_depts THEN
        new_status := 'pending';
    ELSE
        new_status := 'in_progress';
    END IF;

    -- Update the form status only if changed
    UPDATE no_dues_forms
    SET 
        status = new_status,
        updated_at = NOW()
    WHERE id = NEW.form_id
    AND status != new_status;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_form_status ON no_dues_status;
CREATE TRIGGER trigger_update_form_status
    AFTER INSERT OR UPDATE OF status ON no_dues_status
    FOR EACH ROW
    EXECUTE FUNCTION update_form_status_on_status_change();

-- ============================================================================
-- SECTION 2: UPDATED_AT AUTO-UPDATE TRIGGERS
-- Automatically set updated_at when rows are modified
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- no_dues_forms updated_at trigger
DROP TRIGGER IF EXISTS update_no_dues_forms_updated_at ON no_dues_forms;
CREATE TRIGGER update_no_dues_forms_updated_at
    BEFORE UPDATE ON no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- no_dues_status updated_at trigger
DROP TRIGGER IF EXISTS update_no_dues_status_updated_at ON no_dues_status;
CREATE TRIGGER update_no_dues_status_updated_at
    BEFORE UPDATE ON no_dues_status
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- profiles updated_at trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- SECTION 3: ADD MISSING BLOCKCHAIN COLUMNS
-- Required for certificate generation
-- ============================================================================

ALTER TABLE no_dues_forms ADD COLUMN IF NOT EXISTS blockchain_hash TEXT;
ALTER TABLE no_dues_forms ADD COLUMN IF NOT EXISTS blockchain_tx TEXT;
ALTER TABLE no_dues_forms ADD COLUMN IF NOT EXISTS blockchain_block INTEGER;
ALTER TABLE no_dues_forms ADD COLUMN IF NOT EXISTS blockchain_timestamp TIMESTAMPTZ;
ALTER TABLE no_dues_forms ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- SECTION 4: FIX CHAT SENDER_ID CONSTRAINT
-- Required for student messages
-- ============================================================================

-- Drop FK constraint if exists
ALTER TABLE no_dues_messages DROP CONSTRAINT IF EXISTS no_dues_messages_sender_id_fkey;

-- Ensure sender_id is TEXT and nullable
DO $$ 
BEGIN
    ALTER TABLE no_dues_messages ALTER COLUMN sender_id TYPE TEXT USING sender_id::TEXT;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'sender_id column already TEXT';
END $$;

ALTER TABLE no_dues_messages ALTER COLUMN sender_id DROP NOT NULL;

-- ============================================================================
-- SECTION 5: SUPPORT TICKET COLUMNS (if needed)
-- ============================================================================

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS requester_type TEXT DEFAULT 'student';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS read_by UUID;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS admin_response TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS responded_by UUID;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolved_by TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ticket_number TEXT;

-- ============================================================================
-- SECTION 6: CREATE AUDIT_LOGS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID,
    actor_name TEXT,
    actor_role TEXT,
    action TEXT NOT NULL,
    target_id TEXT,
    target_type TEXT,
    details JSONB,
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to audit_logs" ON audit_logs FOR ALL TO service_role USING (true);

-- ============================================================================
-- VERIFICATION QUERIES (Run these to confirm triggers work)
-- ============================================================================

-- Check triggers exist:
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    CASE tgenabled 
        WHEN 'O' THEN 'Enabled'
        WHEN 'D' THEN 'Disabled'
        ELSE tgenabled::text
    END as status
FROM pg_trigger 
WHERE tgname IN (
    'trigger_update_form_status',
    'update_no_dues_forms_updated_at',
    'update_no_dues_status_updated_at',
    'update_profiles_updated_at'
);

-- ============================================================================
-- DONE! All automations configured.
-- ============================================================================
