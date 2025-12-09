-- ============================================
-- CHECK CURRENT ACCOUNTS IN DATABASE
-- ============================================
-- Purpose: Verify what accounts exist in your Supabase database
-- Run this in Supabase SQL Editor
-- ============================================

-- Query 1: Count of all profiles by role
SELECT 
  '📊 ACCOUNT SUMMARY' as info,
  '==================' as separator
UNION ALL
SELECT 
  role || ' accounts',
  COUNT(*)::TEXT
FROM profiles
GROUP BY role
ORDER BY role;

-- Query 2: List ALL profiles with details
SELECT
  p.email,
  p.full_name,
  p.role,
  p.department_name,
  s.name as school,
  c.name as course,
  b.name as branch,
  p.created_at
FROM profiles p
LEFT JOIN schools s ON p.school_id = s.id
LEFT JOIN courses c ON p.course_id = c.id
LEFT JOIN branches b ON p.branch_id = b.id
ORDER BY
  p.role DESC,  -- admin first, then staff
  p.department_name,
  p.email;

-- Query 3: Check if specific emails exist
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@jecrc.ac.in') 
    THEN '✅ EXISTS' 
    ELSE '❌ NOT FOUND' 
  END as "admin@jecrc.ac.in",
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM profiles WHERE email = '15anuragsingh2003@gmail.com') 
    THEN '✅ EXISTS' 
    ELSE '❌ NOT FOUND' 
  END as "15anuragsingh2003@gmail.com",
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM profiles WHERE email = 'library@jecrc.ac.in') 
    THEN '✅ EXISTS' 
    ELSE '❌ NOT FOUND' 
  END as "library@jecrc.ac.in",
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM profiles WHERE email = 'hostel@jecrc.ac.in') 
    THEN '✅ EXISTS' 
    ELSE '❌ NOT FOUND' 
  END as "hostel@jecrc.ac.in";

-- Query 4: Staff accounts grouped by department
SELECT 
  department_name,
  COUNT(*) as staff_count,
  STRING_AGG(email, ', ' ORDER BY email) as staff_emails
FROM profiles
WHERE role = 'staff'
GROUP BY department_name
ORDER BY department_name;

-- Query 5: Check for multiple staff in same department
SELECT 
  department_name,
  COUNT(*) as count,
  STRING_AGG(email, ', ') as emails
FROM profiles
WHERE role = 'staff'
GROUP BY department_name
HAVING COUNT(*) > 1
ORDER BY department_name;

-- Query 6: Check role distribution
SELECT 
  role,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM profiles
GROUP BY role
ORDER BY count DESC;

-- Query 7: Staff with scope filtering (HOD/Dean accounts)
SELECT
  p.email,
  p.full_name,
  p.department_name,
  s.name as school,
  c.name as course,
  b.name as branch
FROM profiles p
LEFT JOIN schools s ON p.school_id = s.id
LEFT JOIN courses c ON p.course_id = c.id
LEFT JOIN branches b ON p.branch_id = b.id
WHERE p.role = 'staff'
  AND (p.school_id IS NOT NULL OR p.course_id IS NOT NULL OR p.branch_id IS NOT NULL)
ORDER BY p.email;

-- Query 8: Staff without scope filtering (see all students)
SELECT
  p.email,
  p.full_name,
  p.department_name
FROM profiles p
WHERE p.role = 'staff'
  AND p.school_id IS NULL
  AND p.course_id IS NULL
  AND p.branch_id IS NULL
ORDER BY p.department_name, p.email;

-- ============================================
-- VERIFICATION SUMMARY
-- ============================================
SELECT 
  '🔍 VERIFICATION COMPLETE' as status,
  NOW() as checked_at;

-- Expected Results:
-- - Admin accounts should show role='admin'
-- - Staff accounts should show role='staff' (NOT 'department')
-- - Total should match: 1-2 admin + 11+ staff accounts