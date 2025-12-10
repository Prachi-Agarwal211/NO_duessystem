-- ============================================================================
-- CREATE STAFF PROFILES FOR 5 ACCOUNTS (SIMPLE VERSION)
-- ============================================================================
-- This creates profiles for the 5 auth users you created
-- Run this AFTER creating auth users in Supabase Dashboard
-- ============================================================================

-- Profile 1: System Administrator
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    department_name,
    school_id,
    school_ids,
    course_ids,
    branch_ids,
    is_active
)
SELECT
    id,
    'admin@jecrcu.edu.in',
    'System Administrator',
    'admin',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    true
FROM auth.users
WHERE email = 'admin@jecrcu.edu.in'
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department_name = EXCLUDED.department_name,
    school_ids = EXCLUDED.school_ids,
    course_ids = EXCLUDED.course_ids,
    branch_ids = EXCLUDED.branch_ids,
    is_active = EXCLUDED.is_active;

-- Profile 2: TPO Staff (sees all students)
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    department_name,
    school_id,
    school_ids,
    course_ids,
    branch_ids,
    is_active
)
SELECT
    id,
    'razorrag.official@gmail.com',
    'Razorrag (TPO Staff)',
    'department',
    'tpo',
    NULL,
    NULL,
    NULL,
    NULL,
    true
FROM auth.users
WHERE email = 'razorrag.official@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department_name = EXCLUDED.department_name,
    school_ids = EXCLUDED.school_ids,
    course_ids = EXCLUDED.course_ids,
    branch_ids = EXCLUDED.branch_ids,
    is_active = EXCLUDED.is_active;

-- Profile 3: BCA/MCA HOD (School of Computer Applications only)
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    department_name,
    school_id,
    school_ids,
    course_ids,
    branch_ids,
    is_active
)
SELECT
    u.id,
    'prachiagarwal211@gmail.com',
    'Prachi Agarwal (HOD - BCA/MCA)',
    'department',
    'school_hod',
    s.id,
    ARRAY[s.id],
    ARRAY[
        (SELECT id FROM public.config_courses WHERE name = 'BCA' AND school_id = s.id),
        (SELECT id FROM public.config_courses WHERE name = 'MCA' AND school_id = s.id)
    ],
    NULL,
    true
FROM auth.users u
CROSS JOIN (SELECT id FROM public.config_schools WHERE name = 'School of Computer Applications') s
WHERE u.email = 'prachiagarwal211@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department_name = EXCLUDED.department_name,
    school_id = EXCLUDED.school_id,
    school_ids = EXCLUDED.school_ids,
    course_ids = EXCLUDED.course_ids,
    branch_ids = EXCLUDED.branch_ids,
    is_active = EXCLUDED.is_active;

-- Profile 4: B.Tech/M.Tech CSE HOD (16 CSE branches only)
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    department_name,
    school_id,
    school_ids,
    course_ids,
    branch_ids,
    is_active
)
SELECT
    u.id,
    '15anuragsingh2003@gmail.com',
    'Anurag Singh (HOD - B.Tech/M.Tech CSE)',
    'department',
    'school_hod',
    s.id,
    ARRAY[s.id],
    ARRAY[
        (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id),
        (SELECT id FROM public.config_courses WHERE name = 'M.Tech' AND school_id = s.id)
    ],
    ARRAY[
        -- B.Tech CSE branches (15 branches)
        (SELECT id FROM public.config_branches WHERE name = 'Computer Science and Engineering' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        (SELECT id FROM public.config_branches WHERE name = 'CSE - Artificial Intelligence and Data Science' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        (SELECT id FROM public.config_branches WHERE name = 'CSE - Generative AI (L&T EduTech)' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        (SELECT id FROM public.config_branches WHERE name = 'CSE - Software Product Engineering with Kalvium' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        (SELECT id FROM public.config_branches WHERE name = 'CSE - Artificial Intelligence and Machine Learning (Xebia)' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        (SELECT id FROM public.config_branches WHERE name = 'CSE - Full Stack Web Design and Development (Xebia)' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        (SELECT id FROM public.config_branches WHERE name = 'CSE - Artificial Intelligence and Machine Learning (Samatrix.io)' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        (SELECT id FROM public.config_branches WHERE name = 'CSE - Data Science and Data Analytics (Samatrix.io)' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        (SELECT id FROM public.config_branches WHERE name = 'CSE - Cyber Security (EC-Council, USA)' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        (SELECT id FROM public.config_branches WHERE name = 'Computer Science and Business Systems (CSBS) - TCS' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        (SELECT id FROM public.config_branches WHERE name = 'CSE - Artificial Intelligence and Machine Learning (IBM)' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        (SELECT id FROM public.config_branches WHERE name = 'CSE - Cloud Computing (Microsoft)' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        (SELECT id FROM public.config_branches WHERE name = 'CSE - Cloud Computing (AWS Verified Program)' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        (SELECT id FROM public.config_branches WHERE name = 'CSE - Blockchain (upGrad Campus)' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        (SELECT id FROM public.config_branches WHERE name = 'B.Tech Lateral Entry / Migration' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = s.id)),
        -- M.Tech CSE branch (1 branch)
        (SELECT id FROM public.config_branches WHERE name = 'Computer Science and Engineering' AND course_id = (SELECT id FROM public.config_courses WHERE name = 'M.Tech' AND school_id = s.id))
    ],
    true
FROM auth.users u
CROSS JOIN (SELECT id FROM public.config_schools WHERE name = 'School of Engineering & Technology') s
WHERE u.email = '15anuragsingh2003@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department_name = EXCLUDED.department_name,
    school_id = EXCLUDED.school_id,
    school_ids = EXCLUDED.school_ids,
    course_ids = EXCLUDED.course_ids,
    branch_ids = EXCLUDED.branch_ids,
    is_active = EXCLUDED.is_active;

-- Profile 5: Accounts Staff (sees all students)
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    department_name,
    school_id,
    school_ids,
    course_ids,
    branch_ids,
    is_active
)
SELECT
    id,
    'anurag.22bcom1367@jecrcu.edu.in',
    'Anurag Kumar (Accounts Staff)',
    'department',
    'accounts_department',
    NULL,
    NULL,
    NULL,
    NULL,
    true
FROM auth.users
WHERE email = 'anurag.22bcom1367@jecrcu.edu.in'
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department_name = EXCLUDED.department_name,
    school_ids = EXCLUDED.school_ids,
    course_ids = EXCLUDED.course_ids,
    branch_ids = EXCLUDED.branch_ids,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check how many profiles were created/updated
DO $$
DECLARE
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM public.profiles WHERE role IN ('admin', 'department');
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  STAFF PROFILES CREATED SUCCESSFULLY!                  ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Total profiles in database: %', profile_count;
    RAISE NOTICE '';
    RAISE NOTICE '📋 Staff Login Credentials:';
    RAISE NOTICE '';
    RAISE NOTICE '1. admin@jecrcu.edu.in / Admin@2025';
    RAISE NOTICE '   → Full system access';
    RAISE NOTICE '';
    RAISE NOTICE '2. razorrag.official@gmail.com / Razorrag@2025';
    RAISE NOTICE '   → TPO Department (sees all students)';
    RAISE NOTICE '';
    RAISE NOTICE '3. prachiagarwal211@gmail.com / Prachi@2025';
    RAISE NOTICE '   → HOD - BCA/MCA (22 branches)';
    RAISE NOTICE '';
    RAISE NOTICE '4. 15anuragsingh2003@gmail.com / Anurag@2025';
    RAISE NOTICE '   → HOD - CSE (16 branches)';
    RAISE NOTICE '';
    RAISE NOTICE '5. anurag.22bcom1367@jecrcu.edu.in / AnuragK@2025';
    RAISE NOTICE '   → Accounts Department (sees all students)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All staff can now login and see forms in their scope!';
    RAISE NOTICE '';
END $$;

-- Display created profiles
SELECT 
    email,
    full_name,
    role,
    department_name,
    CASE 
        WHEN school_ids IS NULL THEN 'All Schools'
        ELSE array_length(school_ids, 1)::text || ' school(s)'
    END as school_scope,
    CASE 
        WHEN course_ids IS NULL THEN 'All Courses'
        ELSE array_length(course_ids, 1)::text || ' course(s)'
    END as course_scope,
    CASE 
        WHEN branch_ids IS NULL THEN 'All Branches'
        ELSE array_length(branch_ids, 1)::text || ' branch(es)'
    END as branch_scope
FROM public.profiles
WHERE role IN ('admin', 'department')
ORDER BY 
    CASE role 
        WHEN 'admin' THEN 1
        WHEN 'department' THEN 2
    END,
    email;