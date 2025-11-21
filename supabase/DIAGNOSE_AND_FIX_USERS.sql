-- ============================================================================
-- DIAGNOSE AND FIX USER LOGIN ISSUES
-- ============================================================================
-- This script will help identify and fix the "Failed to load user profile" error
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK WHAT USERS EXIST IN AUTH
-- ============================================================================

SELECT 
    '=== USERS IN AUTH.USERS ===' as info,
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email IN ('razorrag.official@gmail.com', '15anuragsingh2003@gmail.com')
ORDER BY email;

-- Expected: Should see both users
-- If you DON'T see them, you need to create them in Supabase Dashboard → Authentication → Users

-- ============================================================================
-- STEP 2: CHECK WHAT PROFILES EXIST
-- ============================================================================

SELECT 
    '=== USERS IN PROFILES TABLE ===' as info,
    id,
    email,
    full_name,
    role,
    department_name,
    created_at
FROM public.profiles
WHERE email IN ('razorrag.official@gmail.com', '15anuragsingh2003@gmail.com')
ORDER BY email;

-- Expected: Should see both profiles
-- If you DON'T see them, the profiles weren't created - this is the problem!

-- ============================================================================
-- STEP 3: CHECK FOR ORPHANED AUTH USERS (Users without profiles)
-- ============================================================================

SELECT 
    '=== AUTH USERS WITHOUT PROFILES ===' as info,
    au.id,
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email IN ('razorrag.official@gmail.com', '15anuragsingh2003@gmail.com')
AND p.id IS NULL;

-- If this returns rows, those users exist in auth but NOT in profiles
-- This is why you get "Failed to load user profile"

-- ============================================================================
-- STEP 4: FIX - CREATE MISSING PROFILES
-- ============================================================================

-- Create profile for Admin user (if missing)
INSERT INTO public.profiles (id, email, full_name, role, department_name)
SELECT 
    au.id,
    au.email,
    'Admin User',
    'admin',
    NULL
FROM auth.users au
WHERE au.email = 'razorrag.official@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department_name = EXCLUDED.department_name,
    updated_at = NOW();

-- Create profile for Library staff user (if missing)
INSERT INTO public.profiles (id, email, full_name, role, department_name)
SELECT 
    au.id,
    au.email,
    'Library Staff',
    'department',
    'library'
FROM auth.users au
WHERE au.email = '15anuragsingh2003@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department_name = EXCLUDED.department_name,
    updated_at = NOW();

-- ============================================================================
-- STEP 5: VERIFY FIX - Check again
-- ============================================================================

SELECT 
    '=== VERIFICATION: MATCHED USERS ===' as info,
    au.id,
    au.email as auth_email,
    p.email as profile_email,
    p.full_name,
    p.role,
    p.department_name,
    CASE 
        WHEN p.id IS NOT NULL THEN '✅ Profile exists'
        ELSE '❌ Profile MISSING'
    END as status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email IN ('razorrag.official@gmail.com', '15anuragsingh2003@gmail.com')
ORDER BY au.email;

-- Expected output: Both users should show "✅ Profile exists"

-- ============================================================================
-- STEP 6: FINAL CHECK - Test login query
-- ============================================================================

-- This simulates what the login code does:
SELECT 
    '=== LOGIN SIMULATION ===' as info,
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.department_name
FROM auth.users au
INNER JOIN public.profiles p ON p.id = au.id
WHERE au.email = 'razorrag.official@gmail.com'  -- Change to test different user
AND p.role IN ('department', 'admin');

-- If this returns a row, login should work!
-- If this returns nothing, there's still a problem

-- ============================================================================
-- TROUBLESHOOTING NOTES
-- ============================================================================

-- Problem: "Failed to load user profile"
-- Cause: User exists in auth.users but NOT in public.profiles
-- Solution: Run STEP 4 above to create the missing profiles

-- Problem: "Access denied"
-- Cause: Profile exists but role is wrong
-- Solution: Update the role:
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'razorrag.official@gmail.com';
--   UPDATE public.profiles SET role = 'department', department_name = 'library' WHERE email = '15anuragsingh2003@gmail.com';

-- Problem: Still can't login after creating profiles
-- Cause: RLS policies blocking access
-- Solution: Check RLS is enabled and policies exist (should be created by MASTER_SCHEMA.sql)

-- ============================================================================