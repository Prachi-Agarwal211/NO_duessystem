
-- FINAL RELIABLE FIX for no_dues_messages schema
-- This script handles cleanup of previous failed attempts and applies the correct TEXT type.

-- 1. Clean up any incorrect columns from previous attempts
ALTER TABLE no_dues_messages 
DROP COLUMN IF EXISTS sender_uuid;

-- 2. Add the correct column (TEXT type to match profiles.id)
-- We check if it exists first to avoid errors if you partially ran a previous script
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'no_dues_messages' AND column_name = 'profile_id') THEN
        ALTER TABLE no_dues_messages ADD COLUMN profile_id TEXT REFERENCES profiles(id);
    END IF;
END $$;

-- 3. Ensure the index exists for performance
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_profile_id ON no_dues_messages(profile_id);

-- 4. Verification output (selects columns to confirm)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'no_dues_messages' 
AND column_name IN ('sender_id', 'profile_id');
