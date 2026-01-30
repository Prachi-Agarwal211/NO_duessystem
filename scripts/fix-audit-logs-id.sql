-- Fix audit_logs table: Ensure id column has default and RLS allows insert
-- Run in Supabase SQL Editor

-- Step 1: Check current table structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Step 2: Drop and recreate audit_logs with correct defaults
DROP TABLE IF EXISTS audit_logs_new;

CREATE TABLE audit_logs_new (
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

-- Copy data from old table to new (if any)
INSERT INTO audit_logs_new (id, actor_id, actor_name, actor_role, action, target_id, target_type, old_values, new_values, ip_address, user_agent, created_at)
SELECT id, actor_id, actor_name, actor_role, action, target_id, target_type, old_values, new_values, ip_address, user_agent, created_at
FROM audit_logs;

-- Drop old table and rename new
DROP TABLE audit_logs;
ALTER TABLE audit_logs_new RENAME TO audit_logs;

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Service role full access to audit_logs" ON audit_logs;
CREATE POLICY "Service role full access to audit_logs" ON audit_logs FOR ALL TO service_role USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Test insert (should auto-generate id)
-- INSERT INTO audit_logs (action, actor_id) VALUES ('TEST', 'aa1824d9-d7a5-400e-89cb-a99b1d2811fe');
