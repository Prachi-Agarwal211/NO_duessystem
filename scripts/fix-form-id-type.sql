-- ============================================================================
-- FIX: no_dues_messages form_id TYPE MISMATCH
-- ============================================================================
-- This script fixes the 500 error in chat and reapply APIs caused by:
-- "operator does not exist: uuid = text"
--
-- The issue: no_dues_messages.form_id column type doesn't match no_dues_forms.id
-- ============================================================================

-- RUN THIS IN SUPABASE SQL EDITOR

-- Step 1: Check current column types
SELECT 
    table_name, 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name IN ('no_dues_messages', 'no_dues_forms') 
    AND column_name IN ('id', 'form_id')
ORDER BY table_name, column_name;

-- Step 2: Drop the problematic foreign key constraint (if exists)
ALTER TABLE no_dues_messages DROP CONSTRAINT IF EXISTS no_dues_messages_form_id_fkey;

-- Step 3: Convert form_id to UUID if it's TEXT, or TEXT if it's UUID
-- First check if the column is text and needs to be UUID:
DO $$
DECLARE
    col_type TEXT;
    forms_id_type TEXT;
BEGIN
    -- Get the current type of form_id
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'no_dues_messages' AND column_name = 'form_id';
    
    -- Get the type of forms.id
    SELECT data_type INTO forms_id_type
    FROM information_schema.columns
    WHERE table_name = 'no_dues_forms' AND column_name = 'id';
    
    RAISE NOTICE 'no_dues_messages.form_id type: %', col_type;
    RAISE NOTICE 'no_dues_forms.id type: %', forms_id_type;
    
    -- If types don't match, align them
    IF col_type != forms_id_type THEN
        IF forms_id_type = 'uuid' AND col_type = 'text' THEN
            -- Convert form_id from TEXT to UUID
            RAISE NOTICE 'Converting no_dues_messages.form_id from TEXT to UUID';
            -- First delete any rows with invalid UUIDs
            DELETE FROM no_dues_messages 
            WHERE form_id IS NOT NULL 
                AND form_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
            
            ALTER TABLE no_dues_messages 
                ALTER COLUMN form_id TYPE UUID USING form_id::UUID;
        
        ELSIF forms_id_type = 'text' AND col_type = 'uuid' THEN
            -- Convert form_id from UUID to TEXT
            RAISE NOTICE 'Converting no_dues_messages.form_id from UUID to TEXT';
            ALTER TABLE no_dues_messages 
                ALTER COLUMN form_id TYPE TEXT USING form_id::TEXT;
        END IF;
    ELSE
        RAISE NOTICE 'Column types already match!';
    END IF;
END $$;

-- Step 4: Recreate the foreign key constraint with proper types
ALTER TABLE no_dues_messages 
ADD CONSTRAINT no_dues_messages_form_id_fkey 
FOREIGN KEY (form_id) REFERENCES no_dues_forms(id) ON DELETE CASCADE;

-- Step 5: Also drop any problematic constraint on department_name if it exists
ALTER TABLE no_dues_messages DROP CONSTRAINT IF EXISTS no_dues_messages_department_name_fkey;

-- Step 6: Verify the fix
SELECT 
    'AFTER FIX' as status,
    table_name, 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name IN ('no_dues_messages', 'no_dues_forms') 
    AND column_name IN ('id', 'form_id')
ORDER BY table_name, column_name;

-- Step 7: Test an insert
-- INSERT INTO no_dues_messages (form_id, department_name, message, sender_type, sender_name, sender_id, is_read)
-- SELECT id, 'hostel', 'Test message', 'student', 'Test User', 'test-123', false
-- FROM no_dues_forms LIMIT 1;

-- Clean up test
-- DELETE FROM no_dues_messages WHERE sender_id = 'test-123';

RAISE NOTICE 'Migration complete! Test the chat and reapply functionality now.';
