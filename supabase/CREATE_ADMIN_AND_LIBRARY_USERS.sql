-- ============================================================================
-- CREATE ADMIN AND LIBRARY DEPARTMENT USERS
-- ============================================================================
-- This script creates profile entries for:
-- 1. Main Admin: razorrag.official@gmail.com
-- 2. Library Department: 15anuragsignh2003@gmail.com
-- 
-- PREREQUISITES:
-- You must FIRST create these users in Supabase Auth Dashboard:
-- 1. Go to Authentication → Users
-- 2. Click "Add User"
-- 3. Enter email and password
-- 4. Enable "Auto Confirm User"
-- 5. Copy the generated UUID
-- 6. Replace the UUIDs below with the actual UUIDs from Supabase Auth
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE ADMIN USER PROFILE
-- ============================================================================
-- Replace 'ADMIN_USER_ID_FROM_AUTH' with actual UUID from Supabase Auth
-- User: razorrag.official@gmail.com

INSERT INTO public.profiles (id, email, full_name, role, department_name, school_id)
VALUES (
    '5269d0de-f362-418a-b65d-6304ec438503',  -- Replace with actual UUID from auth.users
    'razorrag.official@gmail.com',
    'System Administrator',  -- Change to actual admin name if needed
    'admin',
    NULL,  -- Admin doesn't need department_name
    NULL   -- Admin doesn't need school_id
);

-- ============================================================================
-- STEP 2: CREATE LIBRARY DEPARTMENT USER PROFILE
-- ============================================================================
-- Replace 'LIBRARY_USER_ID_FROM_AUTH' with actual UUID from Supabase Auth
-- User: 15anuragsignh2003@gmail.com

INSERT INTO public.profiles (id, email, full_name, role, department_name, school_id)
VALUES (
    'LIBRARY_USER_ID_FROM_AUTH',  -- Replace with actual UUID from auth.users
    '15anuragsignh2003@gmail.com',
    'Library Manager',  -- Change to actual staff name if needed
    'department',
    'library',  -- Must match the department name in departments table
    NULL  -- Library is not school-specific
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the profiles were created correctly:

-- Check all profiles
SELECT id, email, full_name, role, department_name, school_id
FROM public.profiles
ORDER BY role, email;

-- Check admin user specifically
SELECT * FROM public.profiles 
WHERE email = 'razorrag.official@gmail.com';

-- Check library user specifically
SELECT * FROM public.profiles 
WHERE email = '15anuragsignh2003@gmail.com';

-- Verify library department exists
SELECT * FROM public.departments 
WHERE name = 'library';

-- ============================================================================
-- LOGIN DETAILS
-- ============================================================================
-- After creating these profiles, users can log in at:
--
-- ADMIN LOGIN:
-- URL: http://localhost:3000/staff/login (or /admin redirects to login)
-- Email: razorrag.official@gmail.com
-- Password: [Password you set in Supabase Auth]
-- After login: Will be redirected to /admin dashboard
--
-- LIBRARY STAFF LOGIN:
-- URL: http://localhost:3000/staff/login
-- Email: 15anuragsignh2003@gmail.com
-- Password: [Password you set in Supabase Auth]
-- After login: Will be redirected to /staff/dashboard
-- ============================================================================

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================
-- If you get "duplicate key" error:
-- The user profile already exists. To update it, use:
/*
UPDATE public.profiles 
SET full_name = 'New Name', 
    role = 'admin',
    department_name = NULL
WHERE email = 'razorrag.official@gmail.com';
*/

-- If you get foreign key constraint error:
-- The user doesn't exist in auth.users table yet.
-- You MUST create the user in Supabase Auth Dashboard first.

-- To delete a profile (if needed):
/*
DELETE FROM public.profiles WHERE email = 'razorrag.official@gmail.com';
DELETE FROM public.profiles WHERE email = '15anuragsignh2003@gmail.com';
*/
-- ============================================================================