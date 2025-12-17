-- =====================================================
-- Remove Unwanted Departments: Mess, Canteen, TPO
-- =====================================================
-- This script will:
-- 1. Remove these departments from the departments table
-- 2. Delete all staff members assigned to these departments
-- 3. Clean up any department statuses for these departments
-- 4. Update display orders for remaining departments
-- =====================================================

BEGIN;

-- Step 1: List departments to be removed
-- (For verification before deletion)
SELECT 
  name as department_code,
  display_name,
  display_order,
  is_active
FROM departments
WHERE name IN ('mess', 'canteen', 'tpo')
ORDER BY display_order;

-- Step 2: Deactivate staff members in these departments first
-- (This prevents login issues during transition)
UPDATE profiles
SET is_active = false
WHERE role = 'department' 
  AND department_name IN ('mess', 'canteen', 'tpo');

-- Step 3: Delete department status records for these departments
-- (Clean up any pending approvals)
DELETE FROM no_dues_status
WHERE department_name IN ('mess', 'canteen', 'tpo');

-- Step 4: Delete staff profiles for these departments
-- (Remove user accounts)
DELETE FROM profiles
WHERE role = 'department' 
  AND department_name IN ('mess', 'canteen', 'tpo');

-- Step 5: Remove the departments themselves
DELETE FROM departments
WHERE name IN ('mess', 'canteen', 'tpo');

-- Step 6: Update display orders for remaining departments
-- This ensures proper sequential ordering without gaps
WITH ordered_depts AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY display_order) as new_order
  FROM departments
  WHERE is_active = true
)
UPDATE departments d
SET display_order = od.new_order
FROM ordered_depts od
WHERE d.id = od.id;

-- Step 7: Verify remaining departments
SELECT 
  name as department_code,
  display_name,
  display_order,
  is_active,
  (SELECT COUNT(*) FROM profiles WHERE department_name = departments.name) as staff_count
FROM departments
WHERE is_active = true
ORDER BY display_order;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (Run these after the script)
-- =====================================================

-- Check no mess/canteen/tpo departments remain
SELECT COUNT(*) as removed_departments_count
FROM departments
WHERE name IN ('mess', 'canteen', 'tpo');
-- Expected: 0

-- Check no staff members for removed departments
SELECT COUNT(*) as removed_staff_count
FROM profiles
WHERE department_name IN ('mess', 'canteen', 'tpo');
-- Expected: 0

-- Check no department statuses for removed departments
SELECT COUNT(*) as removed_status_count
FROM no_dues_status
WHERE department_name IN ('mess', 'canteen', 'tpo');
-- Expected: 0

-- List all remaining active departments
SELECT 
  display_order,
  name as code,
  display_name,
  (SELECT COUNT(*) FROM profiles WHERE department_name = departments.name AND role = 'department') as staff_count
FROM departments
WHERE is_active = true
ORDER BY display_order;

-- =====================================================
-- EXPECTED REMAINING DEPARTMENTS (after removal):
-- =====================================================
-- 1. library - Library
-- 2. hostel - Hostel
-- 3. account - Accounts
-- 4. academic - Academic
-- 5. exam - Examination
-- 6. admin - Administration Office
-- 7. sports - Sports
-- 8. school_hod - HOD/Dean
-- 9. anti_ragging - Anti Ragging Committee
-- 10. registrar - Registrar Office (Final Approval)
-- =====================================================