-- ============================================
-- DATABASE FIX: no_dues_messages table
-- ============================================
-- 
-- PROBLEM: The sender_id column has a foreign key constraint to profiles table,
-- which prevents students (who aren't in profiles) from sending chat messages.
-- 
-- SOLUTION: Drop the foreign key constraint and change column type to TEXT
-- 
-- Run this in Supabase SQL Editor:
-- ============================================

-- 1. Drop the foreign key constraint
ALTER TABLE no_dues_messages 
DROP CONSTRAINT IF EXISTS no_dues_messages_sender_id_fkey;

-- 2. Change sender_id from UUID to TEXT (allows student names/IDs)
ALTER TABLE no_dues_messages 
ALTER COLUMN sender_id TYPE TEXT USING sender_id::TEXT;

-- 3. Make sender_id nullable (for cases where we don't have a specific ID)
ALTER TABLE no_dues_messages 
ALTER COLUMN sender_id DROP NOT NULL;

-- 4. Add RLS policies (if not already present)
-- Enable RLS
ALTER TABLE no_dues_messages ENABLE ROW LEVEL SECURITY;

-- Allow reading all messages (you may want to restrict this later)
DROP POLICY IF EXISTS "Allow read all messages" ON no_dues_messages;
CREATE POLICY "Allow read all messages" ON no_dues_messages 
FOR SELECT USING (true);

-- Allow inserting messages (service role bypasses this, but good to have)
DROP POLICY IF EXISTS "Allow insert messages" ON no_dues_messages;
CREATE POLICY "Allow insert messages" ON no_dues_messages 
FOR INSERT WITH CHECK (true);

-- Allow updating messages (for is_read flag)
DROP POLICY IF EXISTS "Allow update messages" ON no_dues_messages;
CREATE POLICY "Allow update messages" ON no_dues_messages 
FOR UPDATE USING (true);

-- ============================================
-- VERIFICATION: Run this to check the fix worked
-- ============================================
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'no_dues_messages';

-- ============================================
-- After running this SQL, the chat should work!
-- ============================================
