
-- Fix no_dues_messages sender_id issue

-- 1. Add a new column for the proper UUID foreign key
ALTER TABLE no_dues_messages
ADD COLUMN IF NOT EXISTS sender_uuid UUID REFERENCES profiles(id);

-- 2. Try to migrate existing data (This is tricky because we have "student-NAME" not UUIDs)
-- We need to find the profile ID based on the name if possible, or leave it NULL
-- If sender_id contains a valid UUID, we can just cast it.
-- But the log showed "student-ANURAG SINGH". This implies the frontend was sending names, not IDs.

-- This suggests a deeper issue in the Chat UI/API where it was saving names instead of IDs.
-- We should fix the API to save IDs first.

-- But to fix the database structure for FUTURE messages:
-- Let's check if we can link it.

-- STRATEGY:
-- 1. Add sender_uuid column.
-- 2. Update the API to use sender_uuid.
-- 3. For existing messages, we might have to leave them as is or try to backfill.

-- Let's just create the column first and set up the foreign key.
-- We will keep receiving "sender_id" as text for backward compatibility if needed, 
-- but ideally we switch to using the UUID column.

-- Actually, if the frontend expects to join on `sender_id`, we need `sender_id` to be the UUID.
-- We should probably:
-- 1. Rename `sender_id` to `sender_name_legacy`
-- 2. Create new `sender_id` as UUID
-- 3. Backfill.

-- BUT `sender_id` column currently holds mixed data? Or just strings?
-- Log said: "student-ANURAG SINGH".
-- If it's always "student-NAME" or "department-NAME", we can't easily backfill without querying profiles by name (which might not be unique).

-- PROPOSED FIX:
-- 1. Add `profile_id` UUID column to `no_dues_messages`.
-- 2. Add Foreign Key constraint to `profiles(id)`.
-- 3. Update API to save `profile_id` when sending messages.
-- 4. Update API to join on `profile_id` instead of `sender_id`.

-- SQL:
ALTER TABLE no_dues_messages 
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id);

-- Optional: Index for performance
CREATE INDEX IF NOT EXISTS idx_no_dues_messages_profile_id ON no_dues_messages(profile_id);

-- NOTE: You will need to run a migration script to fill profile_id if you want old messages to have links.
-- For now, this enables future messages to work correctly.
