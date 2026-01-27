-- EMERGENCY FIX FOR CHAT SYSTEM
-- Error: Could not find a relationship between 'no_dues_messages' and 'sender_id'

-- The issue is that the API is trying to join with a 'sender' table/relationship
-- that doesn't exist. We need to either:
-- 1. Remove the join from the API query, OR
-- 2. Create the proper foreign key relationship

-- OPTION 1: Quick Fix - Remove the relationship from queries (recommended)
-- This updates the API to not use the sender join

-- First, let's check the current table structure
-- \d no_dues_messages;

-- The API is using this query pattern:
-- .select(`
--     *,
--     sender:sender_id(
--         id,
--         full_name,
--         email,
--         role
--     )
-- `)

-- Since sender_id can be ANY of:
-- 1. A UUID from auth.users (for authenticated users)
-- 2. A string like "student-Name" (for anonymous students)
-- 3. NULL

-- We CANNOT create a proper foreign key because it's polymorphic

-- SOLUTION: Update the API to NOT use the join
-- The API should just return sender_id as-is without trying to join

-- Alternative: Create a view that handles this
CREATE OR REPLACE VIEW no_dues_messages_view AS
SELECT 
    m.*,
    CASE 
        WHEN m.sender_type = 'department' THEN (
            SELECT jsonb_build_object(
                'id', p.id,
                'full_name', p.full_name,
                'email', p.email,
                'role', p.role
            )
            FROM profiles p
            WHERE p.id = m.sender_id::uuid
        )
        ELSE NULL
    END as sender
FROM no_dues_messages m;

-- Grant permissions
GRANT SELECT ON no_dues_messages_view TO anon, authenticated, service_role;

-- Now update RLS policies to use the view if needed
