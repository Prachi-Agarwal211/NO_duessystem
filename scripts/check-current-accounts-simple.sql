-- ============================================
-- SIMPLE CHECK: Current Accounts in Database
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- Query 1: Check profiles table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Query 2: Count all profiles
SELECT COUNT(*) as total_accounts FROM profiles;

-- Query 3: List ALL profiles (basic info)
SELECT 
  id,
  email,
  full_name,
  department_name,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- Query 4: Check if specific emails exist
SELECT 
  email,
  full_name,
  department_name
FROM profiles
WHERE email IN (
  'admin@jecrc.ac.in',
  '15anuragsingh2003@gmail.com',
  'library@jecrc.ac.in',
  'hostel@jecrc.ac.in',
  'accounts@jecrc.ac.in'
)
ORDER BY email;

-- Query 5: Count by department
SELECT 
  department_name,
  COUNT(*) as staff_count
FROM profiles
GROUP BY department_name
ORDER BY department_name;

-- Query 6: Check auth.users (for password verification)
SELECT 
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;