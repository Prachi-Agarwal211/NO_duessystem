-- Migration: Add missing columns to no_dues_forms
-- Run this in Supabase SQL Editor

-- Add unread_count column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' AND column_name = 'unread_count'
    ) THEN
        ALTER TABLE no_dues_forms ADD COLUMN unread_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' AND column_name = 'department_unread_counts'
    ) THEN
        ALTER TABLE no_dues_forms ADD COLUMN department_unread_counts JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Update existing rows to have default values
UPDATE no_dues_forms SET unread_count = 0 WHERE unread_count IS NULL;
UPDATE no_dues_forms SET department_unread_counts = '{}'::jsonb WHERE department_unread_counts IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'no_dues_forms' 
AND column_name IN ('unread_count', 'department_unread_counts');
