-- ============================================================================
-- CREATE USER PROFILES FOR JECRC NO DUES SYSTEM
-- ============================================================================
-- IMPORTANT: You must first create these users in Supabase Auth Dashboard
-- Then run this script to set up their profiles
-- ============================================================================

-- Instructions:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add user" and create:
--    - Email: razorrag.official@gmail.com, Password: password123
--    - Email: 15anuragsingh2003@gmail.com, Password: password123
-- 3. After creating users, run this SQL script
-- 4. Replace the UUIDs below with actual user IDs from auth.users table

-- ============================================================================
-- STEP 1: Check existing auth users
-- ============================================================================

-- Run this query first to get the user IDs:
-- SELECT id, email FROM auth.users WHERE email IN ('razorrag.official@gmail.com', '15anuragsingh2003@gmail.com');

-- ============================================================================
-- STEP 2: Insert/Update profiles for these users
-- ============================================================================

-- Admin Account Profile
-- Replace 'USER_ID_FROM_AUTH_USERS' with actual UUID from auth.users
INSERT INTO public.profiles (id, email, full_name, role, department_name)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'razorrag.official@gmail.com'),
    'razorrag.official@gmail.com',
    'Admin User',
    'admin',
    NULL
)
ON CONFLICT (id) 
DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department_name = EXCLUDED.department_name,
    updated_at = NOW();

-- Department Account Profile (Library)
-- Replace 'USER_ID_FROM_AUTH_USERS' with actual UUID from auth.users
INSERT INTO public.profiles (id, email, full_name, role, department_name)
VALUES (
    (SELECT id FROM auth.users WHERE email = '15anuragsingh2003@gmail.com'),
    '15anuragsingh2003@gmail.com',
    'Library Staff',
    'department',
    'library'
)
ON CONFLICT (id) 
DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department_name = EXCLUDED.department_name,
    updated_at = NOW();

-- ============================================================================
-- STEP 3: Verify profiles were created
-- ============================================================================

-- Run this to verify:
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.department_name,
    p.created_at
FROM public.profiles p
WHERE p.email IN ('razorrag.official@gmail.com', '15anuragsingh2003@gmail.com')
ORDER BY p.role;

-- Expected output:
-- Should see 2 rows:
-- 1. razorrag.official@gmail.com | Admin User | admin | NULL
-- 2. 15anuragsingh2003@gmail.com | Library Staff | department | library

-- ============================================================================
-- MANUAL SETUP (If above doesn't work)
-- ============================================================================

-- If the INSERT statements fail because users don't exist yet:

-- 1. First, create users in Supabase Dashboard:
--    - Go to Authentication → Users → Add user
--    - Email: razorrag.official@gmail.com, Password: password123
--    - Email: 15anuragsingh2003@gmail.com, Password: password123

-- 2. Get the user IDs:
--    SELECT id, email FROM auth.users;

-- 3. Manually insert profiles with actual UUIDs:
--    INSERT INTO public.profiles (id, email, full_name, role, department_name)
--    VALUES 
--    ('actual-uuid-here', 'razorrag.official@gmail.com', 'Admin User', 'admin', NULL),
--    ('actual-uuid-here', '15anuragsingh2003@gmail.com', 'Library Staff', 'department', 'library');

-- ============================================================================