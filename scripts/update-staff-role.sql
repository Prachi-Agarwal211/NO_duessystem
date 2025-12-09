-- ============================================================================
-- Update Staff Role from 'department' to 'staff'
-- ============================================================================
-- Purpose: Fix role inconsistency in profiles table
-- All department staff should have role='staff' not role='department'
-- Run this ONCE on production database
-- ============================================================================

-- STEP 1: Check current state (OPTIONAL - for verification)
-- Run this first to see how many records will be affected
SELECT 
    COUNT(*) as total_department_staff,
    COUNT(DISTINCT department_name) as unique_departments
FROM profiles 
WHERE role = 'department';

-- Expected output: Shows count of staff with old role name
-- Example: total_department_staff: 15, unique_departments: 10

-- ============================================================================

-- STEP 2: Update all department staff to use role='staff'
-- This is the MAIN migration - updates ALL staff accounts at once
UPDATE profiles 
SET role = 'staff' 
WHERE role = 'department';

-- Expected result: UPDATE X (where X is number of staff accounts)

-- ============================================================================

-- STEP 3: Verify the update (REQUIRED - confirms success)
-- Run this to confirm all updates were successful
SELECT 
    role,
    COUNT(*) as count,
    array_agg(DISTINCT department_name) as departments
FROM profiles 
WHERE role IN ('department', 'staff', 'admin')
GROUP BY role
ORDER BY role;

-- Expected output after migration:
-- role='admin': 1-5 accounts
-- role='staff': 15+ accounts (all former 'department' staff)
-- role='department': 0 accounts (should be ZERO)

-- ============================================================================

-- STEP 4: Check if any old role='department' still exists (VERIFICATION)
SELECT 
    id,
    full_name,
    email,
    role,
    department_name,
    created_at
FROM profiles 
WHERE role = 'department';

-- Expected output: NO ROWS (empty result)
-- If you see any rows here, the migration failed for those accounts

-- ============================================================================

-- OPTIONAL: Rollback (ONLY if you need to undo the change)
-- DO NOT RUN THIS unless you need to revert the migration
/*
UPDATE profiles 
SET role = 'department' 
WHERE role = 'staff';
*/

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. This migration is SAFE - it only changes the role name
-- 2. No data loss - all other profile fields remain unchanged
-- 3. All staff can continue using their existing passwords
-- 4. Email addresses remain the same
-- 5. Department assignments remain unchanged
-- 6. After running this, redeploy the application with the code fixes
-- ============================================================================

-- EXECUTION CHECKLIST:
-- ============================================================================
-- [ ] 1. Backup your database first
-- [ ] 2. Run STEP 1 (check current state)
-- [ ] 3. Run STEP 2 (perform update)
-- [ ] 4. Run STEP 3 (verify update)
-- [ ] 5. Run STEP 4 (confirm no old roles remain)
-- [ ] 6. Redeploy application with code fixes
-- [ ] 7. Test staff login
-- [ ] 8. Test email notifications
-- ============================================================================