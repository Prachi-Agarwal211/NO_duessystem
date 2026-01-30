
-- Fix no_dues_messages foreign key issue (Version 2)
-- The profiles.id column is TEXT, so our foreign key must also be TEXT.

-- 1. Add profile_id as TEXT (matching profiles.id)
ALTER TABLE no_dues_messages 
ADD COLUMN IF NOT EXISTS profile_id TEXT REFERENCES profiles(id);

-- 2. Add an index for performance
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_profile_id ON no_dues_messages(profile_id);

-- 3. (Optional) If you want to drop the failed partial attempts if any exist:
-- ALTER TABLE no_dues_messages DROP COLUMN IF EXISTS sender_uuid;
