-- ============================================================================
-- DIAGNOSTIC SCRIPT: Inspect Profiles Table and Authentication Flow
-- ============================================================================
-- Run this in Supabase SQL Editor to understand what's in profiles table
-- and why staff might not be able to login
-- ============================================================================

-- ============================================================================
-- PART 1: INSPECT PROFILES TABLE STRUCTURE
-- ============================================================================

SELECT 
    '═══════════════════════════════════════════════════════' as divider,
    'PART 1: PROFILES TABLE STRUCTURE' as section;

-- Show all columns in profiles table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ============================================================================
-- PART 2: CHECK ALL PROFILES IN DATABASE
-- ============================================================================

SELECT 
    '═══════════════════════════════════════════════════════' as divider,
    'PART 2: ALL PROFILES IN DATABASE' as section;

-- Show all profiles with full details
SELECT 
    id,
    email,
    full_name,
    role,
    department_name,
    school_id,
    school_ids,
    course_ids,
    branch_ids,
    is_active,
    created_at
FROM public.profiles
ORDER BY 
    CASE role 
        WHEN 'admin' THEN 1
        WHEN 'department' THEN 2
        ELSE 3
    END,
    email;

-- ============================================================================
-- PART 3: CHECK AUTH USERS VS PROFILES
-- ============================================================================

SELECT 
    '═══════════════════════════════════════════════════════' as divider,
    'PART 3: AUTH USERS VS PROFILES COMPARISON' as section;

-- Show auth users and whether they have profiles
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    u.created_at as user_created_at,
    CASE 
        WHEN p.id IS NOT NULL THEN 'HAS PROFILE ✅'
        ELSE 'NO PROFILE ❌'
    END as profile_status,
    p.role,
    p.department_name,
    p.is_active
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- ============================================================================
-- PART 4: CHECK DEPARTMENT STAFF PROFILES
-- ============================================================================

SELECT 
    '═══════════════════════════════════════════════════════' as divider,
    'PART 4: DEPARTMENT STAFF DETAILS' as section;

-- Show all department staff with scoping details
SELECT 
    p.email,
    p.full_name,
    p.department_name,
    CASE 
        WHEN p.school_ids IS NULL THEN 'All Schools (NULL)'
        WHEN array_length(p.school_ids, 1) IS NULL THEN 'Empty Array'
        ELSE array_length(p.school_ids, 1)::text || ' school(s)'
    END as school_scope,
    CASE 
        WHEN p.course_ids IS NULL THEN 'All Courses (NULL)'
        WHEN array_length(p.course_ids, 1) IS NULL THEN 'Empty Array'
        ELSE array_length(p.course_ids, 1)::text || ' course(s)'
    END as course_scope,
    CASE 
        WHEN p.branch_ids IS NULL THEN 'All Branches (NULL)'
        WHEN array_length(p.branch_ids, 1) IS NULL THEN 'Empty Array'
        ELSE array_length(p.branch_ids, 1)::text || ' branch(es)'
    END as branch_scope,
    p.is_active,
    u.email_confirmed_at IS NOT NULL as can_login
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role = 'department'
ORDER BY p.email;

-- ============================================================================
-- PART 5: CHECK ADMIN PROFILES
-- ============================================================================

SELECT 
    '═══════════════════════════════════════════════════════' as divider,
    'PART 5: ADMIN PROFILES' as section;

-- Show admin accounts
SELECT 
    p.email,
    p.full_name,
    p.role,
    p.is_active,
    u.email_confirmed_at IS NOT NULL as can_login,
    u.created_at as account_created
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin'
ORDER BY p.email;

-- ============================================================================
-- PART 6: CHECK FOR ORPHANED RECORDS
-- ============================================================================

SELECT 
    '═══════════════════════════════════════════════════════' as divider,
    'PART 6: ORPHANED RECORDS CHECK' as section;

-- Check for auth users without profiles
SELECT 
    'Auth users without profiles:' as check_type,
    COUNT(*) as count
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Check for profiles without auth users (shouldn't happen due to FK)
SELECT 
    'Profiles without auth users:' as check_type,
    COUNT(*) as count
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- ============================================================================
-- PART 7: CHECK STAFF LOGIN QUERY SIMULATION
-- ============================================================================

SELECT 
    '═══════════════════════════════════════════════════════' as divider,
    'PART 7: SIMULATE STAFF LOGIN QUERY' as section;

-- This simulates what happens when staff tries to login
-- Replace 'test@example.com' with actual staff email to test
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.department_name,
    p.is_active,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    CASE 
        WHEN p.role = 'department' AND p.department_name IS NULL THEN 'MISSING DEPARTMENT ❌'
        WHEN p.role = 'department' AND p.department_name IS NOT NULL THEN 'Department OK ✅'
        WHEN p.role = 'admin' THEN 'Admin OK ✅'
        ELSE 'Unknown role ❌'
    END as status
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.email IN (
    'admin@jecrcu.edu.in',
    'razorrag.official@gmail.com',
    'prachiagarwal211@gmail.com',
    '15anuragsingh2003@gmail.com',
    'anurag.22bcom1367@jecrcu.edu.in'
)
ORDER BY p.role, p.email;

-- ============================================================================
-- PART 8: CHECK DEPARTMENTS TABLE
-- ============================================================================

SELECT 
    '═══════════════════════════════════════════════════════' as divider,
    'PART 8: DEPARTMENTS TABLE' as section;

-- Show all departments
SELECT 
    name,
    display_name,
    email,
    display_order,
    is_school_specific,
    is_active
FROM public.departments
ORDER BY display_order;

-- ============================================================================
-- PART 9: CHECK IF STAFF CAN SEE FORMS
-- ============================================================================

SELECT 
    '═══════════════════════════════════════════════════════' as divider,
    'PART 9: FORMS VISIBILITY TEST' as section;

-- Count forms each staff member should see (based on their scoping)
SELECT 
    p.email,
    p.department_name,
    COUNT(f.id) as forms_in_scope,
    CASE 
        WHEN p.school_ids IS NULL THEN 'Sees all schools'
        ELSE 'Filtered by school'
    END as school_filter,
    CASE 
        WHEN p.course_ids IS NULL THEN 'Sees all courses'
        ELSE 'Filtered by course'
    END as course_filter
FROM public.profiles p
LEFT JOIN public.no_dues_forms f ON (
    -- If staff has no school filter, they see all forms
    p.school_ids IS NULL 
    OR 
    -- If staff has school filter, form must match
    f.school_id = ANY(p.school_ids)
)
AND (
    -- If staff has no course filter, they see all forms (within school)
    p.course_ids IS NULL 
    OR 
    -- If staff has course filter, form must match
    f.course_id = ANY(p.course_ids)
)
AND (
    -- If staff has no branch filter, they see all forms (within course)
    p.branch_ids IS NULL 
    OR 
    -- If staff has branch filter, form must match
    f.branch_id = ANY(p.branch_ids)
)
WHERE p.role = 'department'
GROUP BY p.email, p.department_name, p.school_ids, p.course_ids
ORDER BY p.email;

-- ============================================================================
-- PART 10: SUMMARY AND RECOMMENDATIONS
-- ============================================================================

DO $$
DECLARE
    auth_count INTEGER;
    profile_count INTEGER;
    staff_count INTEGER;
    admin_count INTEGER;
    orphaned_auth INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    SELECT COUNT(*) INTO staff_count FROM public.profiles WHERE role = 'department';
    SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
    
    SELECT COUNT(*) INTO orphaned_auth 
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  DIAGNOSTIC SUMMARY                                    ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Statistics:';
    RAISE NOTICE '   - Auth users: %', auth_count;
    RAISE NOTICE '   - Profiles: %', profile_count;
    RAISE NOTICE '   - Admin profiles: %', admin_count;
    RAISE NOTICE '   - Staff profiles: %', staff_count;
    RAISE NOTICE '   - Orphaned auth users: %', orphaned_auth;
    RAISE NOTICE '';
    
    IF orphaned_auth > 0 THEN
        RAISE NOTICE '⚠️  WARNING: % auth user(s) without profiles!', orphaned_auth;
        RAISE NOTICE '   → These users cannot login to the system';
        RAISE NOTICE '   → Run CREATE_STAFF_PROFILES_SIMPLE.sql to fix';
        RAISE NOTICE '';
    END IF;
    
    IF staff_count = 0 THEN
        RAISE NOTICE '❌ CRITICAL: No staff profiles found!';
        RAISE NOTICE '   → Staff cannot login without profiles';
        RAISE NOTICE '   → Run CREATE_STAFF_PROFILES_SIMPLE.sql';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '✅ Staff profiles exist';
        RAISE NOTICE '';
    END IF;
    
    IF admin_count = 0 THEN
        RAISE NOTICE '⚠️  WARNING: No admin profiles found!';
        RAISE NOTICE '   → Run CREATE_STAFF_PROFILES_SIMPLE.sql';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '✅ Admin profile(s) exist';
        RAISE NOTICE '';
    END IF;
END $$;