-- ============================================================================
-- Fix Role Constraint to Allow 'staff' Role
-- ============================================================================
-- Problem: Database constraint only allows 'admin' and 'department' roles
-- Solution: Drop old constraint and create new one with 'staff' role
-- ============================================================================

-- STEP 1: Check current constraint
-- This shows you the current constraint definition
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND contype = 'c'  -- check constraint
AND conname LIKE '%role%';

-- Expected output:
-- constraint_name: profiles_role_check
-- constraint_definition: CHECK ((role = 'admin' OR role = 'department'))

-- ============================================================================

-- STEP 2: Drop the old constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- ============================================================================

-- STEP 3: Create new constraint with 'staff' role allowed
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'staff'));

-- Note: We're removing 'department' and adding 'staff'
-- This is correct because we're migrating from 'department' to 'staff'

-- ============================================================================

-- STEP 4: Verify new constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND contype = 'c'
AND conname LIKE '%role%';

-- Expected output:
-- constraint_name: profiles_role_check
-- constraint_definition: CHECK (role IN ('admin', 'staff'))

-- ============================================================================

-- STEP 5: Now update existing roles from 'department' to 'staff'
-- This will work now because 'staff' is allowed by the constraint
UPDATE profiles 
SET role = 'staff' 
WHERE role = 'department';

-- ============================================================================

-- STEP 6: Verify all profiles have valid roles
SELECT 
    role,
    COUNT(*) as count,
    array_agg(DISTINCT department_name) as departments
FROM profiles 
GROUP BY role
ORDER BY role;

-- Expected output:
-- role='admin': 1-5 accounts
-- role='staff': 15+ accounts (all former 'department' staff)
-- NO 'department' role should exist

-- ============================================================================

-- STEP 7: Test inserting a new staff member (to verify constraint)
-- This is just a test - you can comment this out if not needed
/*
INSERT INTO profiles (id, email, full_name, role, department_name)
VALUES (
    gen_random_uuid(),
    'test@library.edu',
    'Test Staff',
    'staff',  -- This should work now
    'Library'
);

-- Clean up test
DELETE FROM profiles WHERE email = 'test@library.edu';
*/

-- ============================================================================
-- EXECUTION ORDER:
-- ============================================================================
-- 1. Run STEP 1 (check current constraint)
-- 2. Run STEP 2 (drop old constraint)
-- 3. Run STEP 3 (create new constraint)
-- 4. Run STEP 4 (verify new constraint)
-- 5. Run STEP 5 (update existing roles)
-- 6. Run STEP 6 (verify all profiles)
-- ============================================================================

-- NOTES:
-- ============================================================================
-- - This is a ONE-TIME migration
-- - After this, all new staff accounts will use role='staff'
-- - Old 'department' role is being phased out
-- - The constraint ensures only 'admin' and 'staff' roles are allowed
-- ============================================================================