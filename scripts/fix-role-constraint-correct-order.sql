-- ============================================================================
-- Fix Role Constraint - CORRECT ORDER
-- ============================================================================
-- Problem: Existing rows have 'department' role, but new constraint won't allow it
-- Solution: Update rows FIRST, then modify constraint
-- ============================================================================

-- STEP 1: Check current data (to understand what we have)
SELECT 
    role,
    COUNT(*) as count,
    array_agg(email) as example_emails
FROM profiles 
GROUP BY role;

-- You should see: 'admin', 'department' roles
-- May also see 'student' or other roles

-- ============================================================================

-- STEP 2: Drop the old constraint (so we can update roles freely)
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- This removes the restriction temporarily
-- Now we can update role values

-- ============================================================================

-- STEP 3: Update ALL 'department' roles to 'staff'
-- This must happen BEFORE we add the new constraint
UPDATE profiles 
SET role = 'staff' 
WHERE role = 'department';

-- This updates all existing department staff accounts

-- ============================================================================

-- STEP 4: Verify the update worked
SELECT 
    role,
    COUNT(*) as count
FROM profiles 
GROUP BY role
ORDER BY role;

-- Expected output:
-- role='admin': X accounts
-- role='staff': Y accounts (all former 'department')
-- role='department': 0 (should be ZERO)

-- ============================================================================

-- STEP 5: Add the new constraint (now that all data is clean)
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'staff'));

-- This will work now because no 'department' roles exist anymore

-- ============================================================================

-- STEP 6: Final verification
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND contype = 'c'
AND conname = 'profiles_role_check';

-- Expected output:
-- constraint_name: profiles_role_check
-- constraint_definition: CHECK ((role = ANY (ARRAY['admin'::text, 'staff'::text])))

-- ============================================================================

-- STEP 7: Test that new staff can be created
-- This is optional - just to verify everything works
/*
DO $$
DECLARE
    test_id uuid := gen_random_uuid();
BEGIN
    -- Try to insert a test staff member
    INSERT INTO profiles (id, email, full_name, role, department_name)
    VALUES (test_id, 'test-staff@example.com', 'Test Staff', 'staff', 'Library');
    
    -- Clean up test
    DELETE FROM profiles WHERE id = test_id;
    
    RAISE NOTICE 'Test passed: Can create staff with role=staff';
END $$;
*/

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If you still get errors, check for any rows with invalid roles:
SELECT 
    id,
    email,
    role,
    department_name
FROM profiles 
WHERE role NOT IN ('admin', 'staff');

-- If you see any rows here, they have invalid roles that need to be fixed
-- Decide what to do with them (update or delete)

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
-- Only run this if you need to undo everything
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE profiles SET role = 'department' WHERE role = 'staff';

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'department'));
*/

-- ============================================================================
-- EXECUTION CHECKLIST
-- ============================================================================
-- [ ] 1. Backup database
-- [ ] 2. Run STEP 1 (check current data)
-- [ ] 3. Run STEP 2 (drop constraint)
-- [ ] 4. Run STEP 3 (update roles)
-- [ ] 5. Run STEP 4 (verify update)
-- [ ] 6. Run STEP 5 (add new constraint)
-- [ ] 7. Run STEP 6 (verify constraint)
-- [ ] 8. Deploy code changes
-- [ ] 9. Test staff login
-- ============================================================================