-- Migration: Fix no_dues_messages id column to have default value
-- Run this in Supabase SQL Editor

-- The issue: id column is TEXT NOT NULL without DEFAULT gen_random_uuid()
-- This means inserts fail because id is null

-- Solution: Add DEFAULT value to the id column
ALTER TABLE no_dues_messages 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the change
SELECT column_name, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'no_dues_messages' 
AND column_name = 'id';
