-- Fix for email_queue table missing 'attempts' column
-- Run this in Supabase SQL Editor

-- Add attempts column if it doesn't exist
ALTER TABLE email_queue 
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

-- Add index for performance on attempts column
CREATE INDEX IF NOT EXISTS idx_email_queue_attempts 
ON email_queue(attempts);

-- Update existing rows to have 0 attempts if NULL
UPDATE email_queue 
SET attempts = 0 
WHERE attempts IS NULL;

-- Add constraint to ensure attempts is never negative
ALTER TABLE email_queue 
ADD CONSTRAINT check_attempts_non_negative 
CHECK (attempts >= 0);

-- Verify the column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'email_queue' 
AND column_name = 'attempts';