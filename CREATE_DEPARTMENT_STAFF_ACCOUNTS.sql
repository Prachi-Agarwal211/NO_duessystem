-- ============================================================================
-- CREATE DEPARTMENT STAFF ACCOUNTS
-- ============================================================================
-- This script creates 7 department staff accounts for the JECRC No Dues System
-- Each staff member is assigned to their respective department
-- 
-- IMPORTANT: Run this AFTER the department migration (UPDATE_DEPARTMENTS_MIGRATION.sql)
-- ============================================================================

-- Department Staff Accounts:
-- 1. Library: vishal.tiwari@jecrcu.edu.in
-- 2. IT Department: seniormanager.it@jecrcu.edu.in
-- 3. Mess: sailendra.trivedi@jecrcu.edu.in
-- 4. Hostel: akshar.bhardwaj@jecrcu.edu.in
-- 5. Alumni: anurag.sharma@jecrcu.edu.in
-- 6. Registrar: coe@jecrcu.edu.in
-- 7. Canteen: umesh.sharma@jecrcu.edu.in

-- ============================================================================
-- STEP 1: CREATE AUTH USERS
-- ============================================================================
-- NOTE: This section uses Supabase auth functions
-- Password for all accounts: Test@1234
-- ============================================================================

DO $$
DECLARE
    library_user_id UUID;
    it_user_id UUID;
    mess_user_id UUID;
    hostel_user_id UUID;
    alumni_user_id UUID;
    registrar_user_id UUID;
    canteen_user_id UUID;
    user_password TEXT := 'Test@1234';
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║   CREATING DEPARTMENT STAFF ACCOUNTS                      ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Password for all accounts: Test@1234';
    RAISE NOTICE '';

    -- ============================================================================
    -- IMPORTANT: You must create these users manually in Supabase Dashboard first!
    -- Go to: Authentication → Users → Add User
    -- For each email below, create user with password: Test@1234
    -- Then run this script to create their profiles
    -- ============================================================================

    -- Check if users exist in auth.users
    SELECT id INTO library_user_id FROM auth.users WHERE email = 'vishal.tiwari@jecrcu.edu.in';
    SELECT id INTO it_user_id FROM auth.users WHERE email = 'seniormanager.it@jecrcu.edu.in';
    SELECT id INTO mess_user_id FROM auth.users WHERE email = 'sailendra.trivedi@jecrcu.edu.in';
    SELECT id INTO hostel_user_id FROM auth.users WHERE email = 'akshar.bhardwaj@jecrcu.edu.in';
    SELECT id INTO alumni_user_id FROM auth.users WHERE email = 'anurag.sharma@jecrcu.edu.in';
    SELECT id INTO registrar_user_id FROM auth.users WHERE email = 'coe@jecrcu.edu.in';
    SELECT id INTO canteen_user_id FROM auth.users WHERE email = 'umesh.sharma@jecrcu.edu.in';

    -- ============================================================================
    -- STEP 2: CREATE PROFILES FOR EACH STAFF MEMBER
    -- ============================================================================

    -- 1. Library Staff (Vishal Tiwari)
    IF library_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (
            id, email, full_name, role, department_name,
            school_id, school_ids, course_ids, branch_ids, is_active
        ) VALUES (
            library_user_id,
            'vishal.tiwari@jecrcu.edu.in',
            'Vishal Tiwari',
            'department',
            'library',
            NULL, NULL, NULL, NULL,  -- NULL = sees all students (Library is not school-specific)
            true
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            department_name = EXCLUDED.department_name,
            school_ids = EXCLUDED.school_ids,
            course_ids = EXCLUDED.course_ids,
            branch_ids = EXCLUDED.branch_ids,
            updated_at = NOW();
        
        RAISE NOTICE '✅ Created: vishal.tiwari@jecrcu.edu.in (Library)';
    ELSE
        RAISE NOTICE '⚠️  Skipped: vishal.tiwari@jecrcu.edu.in - Create user in Supabase Dashboard first';
    END IF;

    -- 2. IT Department Staff (Senior Manager IT)
    IF it_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (
            id, email, full_name, role, department_name,
            school_id, school_ids, course_ids, branch_ids, is_active
        ) VALUES (
            it_user_id,
            'seniormanager.it@jecrcu.edu.in',
            'IT Department Manager',
            'department',
            'it_department',
            NULL, NULL, NULL, NULL,  -- NULL = sees all students
            true
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            department_name = EXCLUDED.department_name,
            school_ids = EXCLUDED.school_ids,
            course_ids = EXCLUDED.course_ids,
            branch_ids = EXCLUDED.branch_ids,
            updated_at = NOW();
        
        RAISE NOTICE '✅ Created: seniormanager.it@jecrcu.edu.in (IT Department)';
    ELSE
        RAISE NOTICE '⚠️  Skipped: seniormanager.it@jecrcu.edu.in - Create user in Supabase Dashboard first';
    END IF;

    -- 3. Mess Staff (Sailendra Trivedi)
    IF mess_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (
            id, email, full_name, role, department_name,
            school_id, school_ids, course_ids, branch_ids, is_active
        ) VALUES (
            mess_user_id,
            'sailendra.trivedi@jecrcu.edu.in',
            'Sailendra Trivedi',
            'department',
            'mess',
            NULL, NULL, NULL, NULL,  -- NULL = sees all students
            true
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            department_name = EXCLUDED.department_name,
            school_ids = EXCLUDED.school_ids,
            course_ids = EXCLUDED.course_ids,
            branch_ids = EXCLUDED.branch_ids,
            updated_at = NOW();
        
        RAISE NOTICE '✅ Created: sailendra.trivedi@jecrcu.edu.in (Mess)';
    ELSE
        RAISE NOTICE '⚠️  Skipped: sailendra.trivedi@jecrcu.edu.in - Create user in Supabase Dashboard first';
    END IF;

    -- 4. Hostel Staff (Akshar Bhardwaj)
    IF hostel_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (
            id, email, full_name, role, department_name,
            school_id, school_ids, course_ids, branch_ids, is_active
        ) VALUES (
            hostel_user_id,
            'akshar.bhardwaj@jecrcu.edu.in',
            'Akshar Bhardwaj',
            'department',
            'hostel',
            NULL, NULL, NULL, NULL,  -- NULL = sees all students
            true
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            department_name = EXCLUDED.department_name,
            school_ids = EXCLUDED.school_ids,
            course_ids = EXCLUDED.course_ids,
            branch_ids = EXCLUDED.branch_ids,
            updated_at = NOW();
        
        RAISE NOTICE '✅ Created: akshar.bhardwaj@jecrcu.edu.in (Hostel)';
    ELSE
        RAISE NOTICE '⚠️  Skipped: akshar.bhardwaj@jecrcu.edu.in - Create user in Supabase Dashboard first';
    END IF;

    -- 5. Alumni Association Staff (Anurag Sharma)
    IF alumni_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (
            id, email, full_name, role, department_name,
            school_id, school_ids, course_ids, branch_ids, is_active
        ) VALUES (
            alumni_user_id,
            'anurag.sharma@jecrcu.edu.in',
            'Anurag Sharma',
            'department',
            'alumni_association',
            NULL, NULL, NULL, NULL,  -- NULL = sees all students
            true
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            department_name = EXCLUDED.department_name,
            school_ids = EXCLUDED.school_ids,
            course_ids = EXCLUDED.course_ids,
            branch_ids = EXCLUDED.branch_ids,
            updated_at = NOW();
        
        RAISE NOTICE '✅ Created: anurag.sharma@jecrcu.edu.in (Alumni Association)';
    ELSE
        RAISE NOTICE '⚠️  Skipped: anurag.sharma@jecrcu.edu.in - Create user in Supabase Dashboard first';
    END IF;

    -- 6. Registrar Staff (COE)
    IF registrar_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (
            id, email, full_name, role, department_name,
            school_id, school_ids, course_ids, branch_ids, is_active
        ) VALUES (
            registrar_user_id,
            'coe@jecrcu.edu.in',
            'Controller of Examinations',
            'department',
            'registrar',
            NULL, NULL, NULL, NULL,  -- NULL = sees all students
            true
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            department_name = EXCLUDED.department_name,
            school_ids = EXCLUDED.school_ids,
            course_ids = EXCLUDED.course_ids,
            branch_ids = EXCLUDED.branch_ids,
            updated_at = NOW();
        
        RAISE NOTICE '✅ Created: coe@jecrcu.edu.in (Registrar)';
    ELSE
        RAISE NOTICE '⚠️  Skipped: coe@jecrcu.edu.in - Create user in Supabase Dashboard first';
    END IF;

    -- 7. Canteen Staff (Umesh Sharma)
    IF canteen_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (
            id, email, full_name, role, department_name,
            school_id, school_ids, course_ids, branch_ids, is_active
        ) VALUES (
            canteen_user_id,
            'umesh.sharma@jecrcu.edu.in',
            'Umesh Sharma',
            'department',
            'canteen',
            NULL, NULL, NULL, NULL,  -- NULL = sees all students
            true
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            department_name = EXCLUDED.department_name,
            school_ids = EXCLUDED.school_ids,
            course_ids = EXCLUDED.course_ids,
            branch_ids = EXCLUDED.branch_ids,
            updated_at = NOW();
        
        RAISE NOTICE '✅ Created: umesh.sharma@jecrcu.edu.in (Canteen)';
    ELSE
        RAISE NOTICE '⚠️  Skipped: umesh.sharma@jecrcu.edu.in - Create user in Supabase Dashboard first';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    created_count INTEGER;
    pending_count INTEGER;
BEGIN
    -- Count successfully created profiles
    SELECT COUNT(*) INTO created_count
    FROM public.profiles
    WHERE email IN (
        'vishal.tiwari@jecrcu.edu.in',
        'seniormanager.it@jecrcu.edu.in',
        'sailendra.trivedi@jecrcu.edu.in',
        'akshar.bhardwaj@jecrcu.edu.in',
        'anurag.sharma@jecrcu.edu.in',
        'coe@jecrcu.edu.in',
        'umesh.sharma@jecrcu.edu.in'
    );
    
    pending_count := 7 - created_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║   VERIFICATION SUMMARY                                    ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Profiles Created: %', created_count;
    RAISE NOTICE '⏳ Pending (need auth users): %', pending_count;
    RAISE NOTICE '';
    
    IF pending_count > 0 THEN
        RAISE NOTICE '📋 TO CREATE PENDING ACCOUNTS:';
        RAISE NOTICE '   1. Go to Supabase Dashboard → Authentication → Users';
        RAISE NOTICE '   2. Click "Add User" for each pending email';
        RAISE NOTICE '   3. Set password: Test@1234';
        RAISE NOTICE '   4. Re-run this script to create their profiles';
        RAISE NOTICE '';
    END IF;
    
    IF created_count = 7 THEN
        RAISE NOTICE '🎉 All 7 department staff accounts created successfully!';
    ELSIF created_count > 0 THEN
        RAISE NOTICE '⚠️  Partial success - % accounts created', created_count;
    ELSE
        RAISE NOTICE '❌ No accounts created - Create auth users first!';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- Display created staff accounts
SELECT
    email,
    full_name,
    department_name,
    role,
    is_active,
    created_at
FROM public.profiles
WHERE email IN (
    'vishal.tiwari@jecrcu.edu.in',
    'seniormanager.it@jecrcu.edu.in',
    'sailendra.trivedi@jecrcu.edu.in',
    'akshar.bhardwaj@jecrcu.edu.in',
    'anurag.sharma@jecrcu.edu.in',
    'coe@jecrcu.edu.in',
    'umesh.sharma@jecrcu.edu.in'
)
ORDER BY department_name;

-- ============================================================================
-- ACCOUNT CREDENTIALS SUMMARY
-- ============================================================================
-- 
-- All accounts use password: Test@1234
-- 
-- 1. Library:
--    Email: vishal.tiwari@jecrcu.edu.in
--    Name: Vishal Tiwari
--    Department: library
-- 
-- 2. IT Department:
--    Email: seniormanager.it@jecrcu.edu.in
--    Name: IT Department Manager
--    Department: it_department
-- 
-- 3. Mess:
--    Email: sailendra.trivedi@jecrcu.edu.in
--    Name: Sailendra Trivedi
--    Department: mess
-- 
-- 4. Hostel:
--    Email: akshar.bhardwaj@jecrcu.edu.in
--    Name: Akshar Bhardwaj
--    Department: hostel
-- 
-- 5. Alumni Association:
--    Email: anurag.sharma@jecrcu.edu.in
--    Name: Anurag Sharma
--    Department: alumni_association
-- 
-- 6. Registrar:
--    Email: coe@jecrcu.edu.in
--    Name: Controller of Examinations
--    Department: registrar
-- 
-- 7. Canteen:
--    Email: umesh.sharma@jecrcu.edu.in
--    Name: Umesh Sharma
--    Department: canteen
-- 
-- ============================================================================
-- Login URL: https://no-duessystem.vercel.app/staff/login
-- ============================================================================