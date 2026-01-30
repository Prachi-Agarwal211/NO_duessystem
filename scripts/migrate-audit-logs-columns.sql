-- Migration: Add missing columns to audit_logs table
-- Run this in Supabase SQL Editor to fix the audit_logs schema mismatch

-- Add details column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'details'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN details JSONB;
        RAISE NOTICE 'Added details column to audit_logs';
    ELSE
        RAISE NOTICE 'details column already exists in audit_logs';
    END IF;
END $$;

-- Add resource_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'resource_id'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN resource_id TEXT;
        RAISE NOTICE 'Added resource_id column to audit_logs';
    ELSE
        RAISE NOTICE 'resource_id column already exists in audit_logs';
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;
