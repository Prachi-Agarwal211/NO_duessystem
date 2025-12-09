-- Script to create accounts from ACCOUNT_CREDENTIALS.csv
-- Run this in Supabase SQL Editor to create all accounts
-- WARNING: This will create users with default passwords - CHANGE THEM!

-- Note: This script shows the structure, but you need to:
-- 1. Create users via Supabase Auth (cannot be done via SQL directly)
-- 2. Then insert profiles using the user IDs from auth.users

-- Step 1: After creating users in Supabase Auth Dashboard, run this to create profiles

-- Admin Account 1
INSERT INTO profiles (id, email, full_name, role, department_name, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@jecrc.ac.in'),
  'admin@jecrc.ac.in',
  'Admin User',
  'admin',
  'Administration',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Admin Account 2 (Your account)
INSERT INTO profiles (id, email, full_name, role, department_name, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = '15anuragsingh2003@gmail.com'),
  '15anuragsingh2003@gmail.com',
  'Anurag Singh',
  'admin',
  'Administration',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Library Staff 1
INSERT INTO profiles (id, email, full_name, role, department_name, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'library@jecrcu.edu.in'),
  'library@jecrcu.edu.in',
  'Library Staff 1',
  'staff',
  'Library',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Library Staff 2
INSERT INTO profiles (id, email, full_name, role, department_name, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'library2@gmail.com'),
  'library2@gmail.com',
  'Library Staff 2',
  'staff',
  'Library',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Hostel Staff 1
INSERT INTO profiles (id, email, full_name, role, department_name, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'hostel@jecrcu.edu.in'),
  'hostel@jecrcu.edu.in',
  'Hostel Warden',
  'staff',
  'Hostel',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Hostel Staff 2
INSERT INTO profiles (id, email, full_name, role, department_name, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'hostel2@gmail.com'),
  'hostel2@gmail.com',
  'Hostel Staff 2',
  'staff',
  'Hostel',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Accounts Staff 1
INSERT INTO profiles (id, email, full_name, role, department_name, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'accounts@jecrcu.edu.in'),
  'accounts@jecrcu.edu.in',
  'Accounts Officer',
  'staff',
  'Accounts',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Accounts Staff 2
INSERT INTO profiles (id, email, full_name, role, department_name, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'accounts2@gmail.com'),
  'accounts2@gmail.com',
  'Accounts Staff 2',
  'staff',
  'Accounts',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Sports Staff
INSERT INTO profiles (id, email, full_name, role, department_name, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'sports@jecrcu.edu.in'),
  'sports@jecrcu.edu.in',
  'Sports In-charge',
  'staff',
  'Sports',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Examination Staff
INSERT INTO profiles (id, email, full_name, role, department_name, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'examination@jecrcu.edu.in'),
  'examination@jecrcu.edu.in',
  'Examination Officer',
  'staff',
  'Examination',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- TPO Staff
INSERT INTO profiles (id, email, full_name, role, department_name, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'tpo@jecrcu.edu.in'),
  'tpo@jecrcu.edu.in',
  'Training Officer',
  'staff',
  'Training and Placement',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Scholarship Staff
INSERT INTO profiles (id, email, full_name, role, department_name, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'scholarship@jecrcu.edu.in'),
  'scholarship@jecrcu.edu.in',
  'Scholarship Officer',
  'staff',
  'Scholarship',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ESD Staff
INSERT INTO profiles (id, email, full_name, role, department_name, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'esd@jecrcu.edu.in'),
  'esd@jecrcu.edu.in',
  'ESD In-charge',
  'staff',
  'ESD',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Alumni Staff
INSERT INTO profiles (id, email, full_name, role, department_name, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'alumni@jecrcu.edu.in'),
  'alumni@jecrcu.edu.in',
  'Alumni Officer',
  'staff',
  'Alumni',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- CSE HOD
INSERT INTO profiles (id, email, full_name, role, department_name, school, course, branch, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'cse.hod@jecrcu.edu.in'),
  'cse.hod@jecrcu.edu.in',
  'CSE HOD',
  'staff',
  'Department',
  'School of Engineering',
  'B.Tech',
  'Computer Science',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ECE HOD
INSERT INTO profiles (id, email, full_name, role, department_name, school, course, branch, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'ece.hod@jecrcu.edu.in'),
  'ece.hod@jecrcu.edu.in',
  'ECE HOD',
  'staff',
  'Department',
  'School of Engineering',
  'B.Tech',
  'Electronics',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Civil HOD
INSERT INTO profiles (id, email, full_name, role, department_name, school, course, branch, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'civil.hod@jecrcu.edu.in'),
  'civil.hod@jecrcu.edu.in',
  'Civil HOD',
  'staff',
  'Department',
  'School of Engineering',
  'B.Tech',
  'Civil',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Mechanical HOD
INSERT INTO profiles (id, email, full_name, role, department_name, school, course, branch, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'mech.hod@jecrcu.edu.in'),
  'mech.hod@jecrcu.edu.in',
  'Mechanical HOD',
  'staff',
  'Department',
  'School of Engineering',
  'B.Tech',
  'Mechanical',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Engineering Dean
INSERT INTO profiles (id, email, full_name, role, department_name, school, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'dean.engineering@jecrcu.edu.in'),
  'dean.engineering@jecrcu.edu.in',
  'Engineering Dean',
  'staff',
  'Department',
  'School of Engineering',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Commerce Dean
INSERT INTO profiles (id, email, full_name, role, department_name, school, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'dean.commerce@jecrcu.edu.in'),
  'dean.commerce@jecrcu.edu.in',
  'Commerce Dean',
  'staff',
  'Department',
  'School of Commerce',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verify accounts created
SELECT 
  email, 
  full_name, 
  role, 
  department_name,
  school,
  course,
  branch
FROM profiles 
ORDER BY role, department_name, email;