-- ============================================================================
-- ADD MISSING 44 INDUSTRY PARTNERSHIP BRANCHES
-- ============================================================================
-- Run this in Supabase SQL Editor to add the missing specialized branches
-- These are industry partnership programs from your old SQL file
-- ============================================================================

-- ============================================================================
-- SCHOOL 1: Engineering & Technology (Add 9 more branches)
-- ============================================================================
DO $$
DECLARE
    school_eng UUID;
    course_btech UUID;
BEGIN
    SELECT id INTO school_eng FROM public.config_schools WHERE name = 'School of Engineering & Technology';
    SELECT id INTO course_btech FROM public.config_courses WHERE school_id = school_eng AND name = 'B.Tech';
    
    -- Add L&T EduTech specializations
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_btech, 'Computer Science & Engineering - L&T EduTech', 11, true),
        (course_btech, 'Artificial Intelligence & Machine Learning - L&T EduTech', 12, true),
        (course_btech, 'Data Science - L&T EduTech', 13, true);
    
    -- Add IBM Cloud specializations
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_btech, 'Computer Science & Engineering - IBM Cloud Computing', 14, true),
        (course_btech, 'Information Technology - IBM Cloud Computing', 15, true);
    
    -- Add AWS specializations
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_btech, 'Computer Science & Engineering - AWS Cloud', 16, true),
        (course_btech, 'Data Science - AWS Cloud', 17, true);
    
    -- Add IoT specialization
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_btech, 'Electronics & Communication - IoT', 18, true),
        (course_btech, 'Automobile Engineering', 19, true);
    
    RAISE NOTICE '✅ Added 9 Engineering branches (Total: 26)';
END $$;

-- ============================================================================
-- SCHOOL 2: Computer Applications (Add 18 more branches)
-- ============================================================================
DO $$
DECLARE
    school_ca UUID;
    course_bca UUID;
    course_mca UUID;
BEGIN
    SELECT id INTO school_ca FROM public.config_schools WHERE name = 'School of Computer Applications';
    SELECT id INTO course_bca FROM public.config_courses WHERE school_id = school_ca AND name = 'BCA';
    SELECT id INTO course_mca FROM public.config_courses WHERE school_id = school_ca AND name = 'MCA';
    
    -- Add BCA Samatrix.io specializations (8 branches)
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_bca, 'Computer Applications - Samatrix Full Stack Development', 4, true),
        (course_bca, 'Computer Applications - Samatrix Data Science', 5, true),
        (course_bca, 'Computer Applications - Samatrix AI & ML', 6, true),
        (course_bca, 'Computer Applications - Samatrix Cloud Computing', 7, true),
        (course_bca, 'Computer Applications - Samatrix Cyber Security', 8, true),
        (course_bca, 'Computer Applications - Samatrix Mobile App Development', 9, true),
        (course_bca, 'Computer Applications - Samatrix DevOps', 10, true),
        (course_bca, 'Computer Applications - Samatrix Blockchain', 11, true);
    
    -- Add BCA Xebia Academy specializations (2 branches)
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_bca, 'Computer Applications - Xebia Software Engineering', 12, true),
        (course_bca, 'Computer Applications - Xebia Cloud Native', 13, true);
    
    -- Add BCA upGrad Campus specializations (2 branches)
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_bca, 'Computer Applications - upGrad Data Science', 14, true),
        (course_bca, 'Computer Applications - upGrad Software Development', 15, true);
    
    -- Add BCA TCS specialization (1 branch)
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_bca, 'Computer Applications - TCS CSBS', 16, true);
    
    -- Add BCA EC-Council specializations (3 branches)
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_bca, 'Computer Applications - EC-Council Ethical Hacking', 17, true),
        (course_bca, 'Computer Applications - EC-Council Cyber Security', 18, true),
        (course_bca, 'Computer Applications - EC-Council Network Security', 19, true);
    
    -- Add MCA specialization (1 branch)
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_mca, 'Computer Applications - Cloud Computing & DevOps', 2, true);
    
    -- Add BCA CollegeDekho variants (1 branch for now - add more if needed)
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_bca, 'Computer Applications - CollegeDekho Assured', 20, true);
    
    RAISE NOTICE '✅ Added 18 Computer Applications branches (Total: 25)';
END $$;

-- ============================================================================
-- SCHOOL 3: Business (Add 15 more branches)
-- ============================================================================
DO $$
DECLARE
    school_jsb UUID;
    course_bba UUID;
    course_mba UUID;
    course_bcom UUID;
BEGIN
    SELECT id INTO school_jsb FROM public.config_schools WHERE name = 'Jaipur School of Business';
    SELECT id INTO course_bba FROM public.config_courses WHERE school_id = school_jsb AND name = 'BBA';
    SELECT id INTO course_mba FROM public.config_courses WHERE school_id = school_jsb AND name = 'MBA';
    SELECT id INTO course_bcom FROM public.config_courses WHERE school_id = school_jsb AND name = 'B.Com';
    
    -- Add BBA Sunstone specializations (3 branches)
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_bba, 'General Management - Sunstone Program', 6, true),
        (course_bba, 'Digital Marketing - Sunstone Program', 7, true),
        (course_bba, 'Entrepreneurship - Sunstone Program', 8, true);
    
    -- Add BBA ISDC International (2 branches)
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_bba, 'International Business - ISDC Program', 9, true),
        (course_bba, 'Global Marketing - ISDC Program', 10, true);
    
    -- Add MBA specializations (5 branches)
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_mba, 'Digital Marketing & E-Commerce', 7, true),
        (course_mba, 'Supply Chain Management', 8, true),
        (course_mba, 'Banking & Financial Services', 9, true),
        (course_mba, 'Healthcare Management', 10, true),
        (course_mba, 'Entrepreneurship', 11, true);
    
    -- Add B.Com specializations (5 branches)
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_bcom, 'E-Commerce & Digital Business', 4, true),
        (course_bcom, 'Financial Markets', 5, true),
        (course_bcom, 'International Business', 6, true),
        (course_bcom, 'Cost & Management Accounting', 7, true),
        (course_bcom, 'Corporate Accounting', 8, true);
    
    RAISE NOTICE '✅ Added 15 Business branches (Total: 30)';
END $$;

-- ============================================================================
-- SCHOOL 4: Sciences (Add 3 more branches)
-- ============================================================================
DO $$
DECLARE
    school_sci UUID;
    course_bsc UUID;
BEGIN
    SELECT id INTO school_sci FROM public.config_schools WHERE name = 'School of Sciences';
    SELECT id INTO course_bsc FROM public.config_courses WHERE school_id = school_sci AND name = 'B.Sc.';
    
    -- Add specialized science branches
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_bsc, 'Zoology', 7, true),
        (course_bsc, 'Botany', 8, true),
        (course_bsc, 'Forensic Science', 9, true);
    
    RAISE NOTICE '✅ Added 3 Sciences branches (Total: 13)';
END $$;

-- ============================================================================
-- SCHOOL 5: Humanities (Add 3 more branches)
-- ============================================================================
DO $$
DECLARE
    school_hss UUID;
    course_ba UUID;
    course_ma UUID;
BEGIN
    SELECT id INTO school_hss FROM public.config_schools WHERE name = 'School of Humanities & Social Sciences';
    SELECT id INTO course_ba FROM public.config_courses WHERE school_id = school_hss AND name = 'B.A.';
    
    -- Add additional humanities branches
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_ba, 'Philosophy', 7, true),
        (course_ba, 'Geography', 8, true),
        (course_ba, 'Public Administration', 9, true);
    
    RAISE NOTICE '✅ Added 3 Humanities branches (Total: 12)';
END $$;

-- ============================================================================
-- SCHOOL 6: Design (Add 2 more branches)
-- ============================================================================
DO $$
DECLARE
    school_jsd UUID;
    course_bdes UUID;
BEGIN
    SELECT id INTO school_jsd FROM public.config_schools WHERE name = 'Jaipur School of Design';
    SELECT id INTO course_bdes FROM public.config_courses WHERE school_id = school_jsd AND name = 'B.Des';
    
    -- Add UX/UI and Animation branches
    INSERT INTO public.config_branches (course_id, name, display_order, is_active) VALUES
        (course_bdes, 'UX/UI Design', 6, true),
        (course_bdes, 'Animation & Motion Graphics', 7, true);
    
    RAISE NOTICE '✅ Added 2 Design branches (Total: 9)';
END $$;

-- ============================================================================
-- VERIFICATION: Check Total Branch Count
-- ============================================================================
DO $$
DECLARE
    total_branches INTEGER;
    eng_branches INTEGER;
    ca_branches INTEGER;
    business_branches INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_branches FROM public.config_branches;
    
    SELECT COUNT(*) INTO eng_branches 
    FROM public.config_branches b
    JOIN public.config_courses c ON b.course_id = c.id
    JOIN public.config_schools s ON c.school_id = s.id
    WHERE s.name = 'School of Engineering & Technology';
    
    SELECT COUNT(*) INTO ca_branches 
    FROM public.config_branches b
    JOIN public.config_courses c ON b.course_id = c.id
    JOIN public.config_schools s ON c.school_id = s.id
    WHERE s.name = 'School of Computer Applications';
    
    SELECT COUNT(*) INTO business_branches 
    FROM public.config_branches b
    JOIN public.config_courses c ON b.course_id = c.id
    JOIN public.config_schools s ON c.school_id = s.id
    WHERE s.name = 'Jaipur School of Business';
    
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  44 INDUSTRY PARTNERSHIP BRANCHES ADDED SUCCESSFULLY  ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Branch Count Verification:';
    RAISE NOTICE '   - Total Branches: % (Expected: 139)', total_branches;
    RAISE NOTICE '   - Engineering: % (Expected: 26)', eng_branches;
    RAISE NOTICE '   - Computer Applications: % (Expected: 25)', ca_branches;
    RAISE NOTICE '   - Business: % (Expected: 30)', business_branches;
    RAISE NOTICE '';
    
    IF total_branches = 139 THEN
        RAISE NOTICE '🎉 SUCCESS! Database now has all 139 branches!';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Expected 139 branches, got %', total_branches;
    END IF;
    RAISE NOTICE '';
END $$;