-- =====================================================
-- UNIFY NOTIFICATION SYSTEM MIGRATION
-- =====================================================
-- Purpose: Make department email optional since we now
--          use staff account emails from profiles table
-- Date: 2025-12-09
-- =====================================================

-- STEP 1: Make department email field optional (nullable)
-- This allows departments to exist without email since staff emails are used
ALTER TABLE departments 
ALTER COLUMN email DROP NOT NULL;

-- STEP 2: Add constraint to ensure staff accounts have emails
-- All department staff MUST have emails for notifications
ALTER TABLE profiles 
ADD CONSTRAINT profiles_department_email_required 
CHECK (
  role != 'department' OR 
  (role = 'department' AND email IS NOT NULL)
);

-- STEP 3: Add index for faster staff member lookups during notifications
CREATE INDEX IF NOT EXISTS idx_profiles_department_staff 
ON profiles(role, department_name) 
WHERE role = 'department' AND email IS NOT NULL;

-- STEP 4: Add comments for documentation
COMMENT ON COLUMN departments.email IS 'DEPRECATED: Use staff account emails from profiles table. Kept for backward compatibility only.';
COMMENT ON CONSTRAINT profiles_department_email_required ON profiles IS 'Ensures all staff accounts have valid email addresses for notifications';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check current staff without emails (should be 0 after constraint)
SELECT 
  id, 
  full_name, 
  email, 
  department_name 
FROM profiles 
WHERE role = 'department' AND email IS NULL;

-- Count staff members per department for notification coverage
SELECT 
  department_name,
  COUNT(*) as staff_count,
  COUNT(email) as staff_with_email
FROM profiles
WHERE role = 'department'
GROUP BY department_name
ORDER BY staff_count DESC;

-- List all active staff members who will receive notifications
SELECT 
  p.department_name,
  p.full_name,
  p.email,
  d.display_name as department_display_name
FROM profiles p
LEFT JOIN departments d ON p.department_name = d.name
WHERE p.role = 'department' 
  AND p.email IS NOT NULL
ORDER BY p.department_name, p.full_name;

-- =====================================================
-- ROLLBACK SCRIPT (if needed)
-- =====================================================
-- Uncomment to rollback changes:
-- ALTER TABLE departments ALTER COLUMN email SET NOT NULL;
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_department_email_required;
-- DROP INDEX IF EXISTS idx_profiles_department_staff;
-- COMMENT ON COLUMN departments.email IS NULL;