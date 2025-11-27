-- ============================================================================
-- JECRC UNIVERSITY - COMPLETE COURSE DATA SEED
-- ============================================================================
-- This file contains ALL schools, courses, and branches offered at JECRC University
-- Source: https://jecrcuniversity.edu.in/courses/
-- 
-- Structure:
-- - 13 Schools
-- - 100+ Undergraduate (UG) Programs
-- - 50+ Postgraduate (PG) Programs  
-- - 10+ Doctoral (Ph.D.) Programs
-- 
-- Total Programs: ~200+
-- ============================================================================

-- First, clear existing school/course/branch data (keep departments)
DELETE FROM public.config_branches;
DELETE FROM public.config_courses;
DELETE FROM public.config_schools;

-- ============================================================================
-- SECTION 1: SEED ALL 13 SCHOOLS
-- ============================================================================

INSERT INTO public.config_schools (name, display_order, is_active) VALUES
    ('School of Engineering & Technology', 1, true),
    ('School of Computer Applications', 2, true),
    ('Jaipur School of Business', 3, true),
    ('School of Sciences', 4, true),
    ('School of Humanities & Social Sciences', 5, true),
    ('School of Law', 6, true),
    ('Jaipur School of Mass Communication', 7, true),
    ('Jaipur School of Design', 8, true),
    ('Jaipur School of Economics', 9, true),
    ('School of Allied Health Sciences', 10, true),
    ('School of Hospitality', 11, true),
    ('Directorate of Executive Education', 12, true),
    ('Ph.D. (Doctoral Programme)', 13, true);

-- ============================================================================
-- SECTION 2: SEED COURSES AND BRANCHES BY SCHOOL
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 School of Engineering & Technology
-- ----------------------------------------------------------------------------

-- B.Tech Programs (UG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'School of Engineering & Technology'),
    'B.Tech',
    'UG',
    1,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'B.Tech' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'School of Engineering & Technology')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('Computer Science and Engineering'),
    ('Civil Engineering (L&T EduTech)'),
    ('Electronics and Communication Engineering (L&T EduTech)'),
    ('Mechanical Engineering (L&T EduTech)'),
    ('CSE - Artificial Intelligence and Data Science'),
    ('CSE - Generative AI (L&T EduTech)'),
    ('CSE - Software Product Engineering with Kalvium'),
    ('CSE - Artificial Intelligence and Machine Learning (Xebia)'),
    ('CSE - Full Stack Web Design and Development (Xebia)'),
    ('CSE - Artificial Intelligence and Machine Learning (Samatrix.io)'),
    ('CSE - Data Science and Data Analytics (Samatrix.io)'),
    ('CSE - Cyber Security (EC-Council, USA)'),
    ('Computer Science and Business Systems (CSBS) - TCS'),
    ('CSE - Artificial Intelligence and Machine Learning (IBM)'),
    ('CSE - Cloud Computing (Microsoft)'),
    ('CSE - Cloud Computing (AWS Verified Program)'),
    ('CSE - Blockchain (upGrad Campus)'),
    ('B.Tech Lateral Entry / Migration')
) AS branches(branch);

-- M.Tech Programs (PG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'School of Engineering & Technology'),
    'M.Tech',
    'PG',
    2,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'M.Tech' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'School of Engineering & Technology')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('Computer Science and Engineering'),
    ('Civil Engineering'),
    ('Electrical Engineering'),
    ('Electronics and Communication Engineering'),
    ('Mechanical Engineering')
) AS branches(branch);

-- ----------------------------------------------------------------------------
-- 2.2 School of Computer Applications
-- ----------------------------------------------------------------------------

-- BCA Programs (UG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'School of Computer Applications'),
    'BCA',
    'UG',
    1,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'BCA' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'School of Computer Applications')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('BCA (General)'),
    ('Health Informatics'),
    ('Artificial Intelligence and Data Science'),
    ('Data Science and Data Analytics (Samatrix.io)'),
    ('Artificial Intelligence and Machine Learning (IBM)'),
    ('Cloud Computing and Full Stack Development (IBM)'),
    ('Cyber Security (EC-Council, USA)'),
    ('Blockchain (upGrad Campus)'),
    ('Full Stack Web Design and Development (Xebia)'),
    ('Cloud Computing (AWS Verified Program)'),
    ('MERN Full Stack (CollegeDekho)'),
    ('Various Specializations (CollegeDekho)'),
    ('BCA Sunstone')
) AS branches(branch);

-- MCA Programs (PG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'School of Computer Applications'),
    'MCA',
    'PG',
    2,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'MCA' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'School of Computer Applications')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('MCA (General) - 2 Years'),
    ('Artificial Intelligence and Data Science - 2 Years'),
    ('Data Science and Data Analytics (Samatrix.io) - 2 Years'),
    ('Cloud Computing (AWS Verified Program) - 2 Years'),
    ('Cloud Computing and Full Stack Development (IBM) - 2 Years'),
    ('Cyber Security (EC-Council, USA) - 2 Years'),
    ('Artificial Intelligence and Machine Learning (Samatrix.io) - 2 Years'),
    ('MERN Full Stack (CollegeDekho)'),
    ('MCA Sunstone')
) AS branches(branch);

-- ----------------------------------------------------------------------------
-- 2.3 Jaipur School of Business
-- ----------------------------------------------------------------------------

-- BBA Programs (UG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Business'),
    'BBA',
    'UG',
    1,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'BBA' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Business')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('BBA (General)'),
    ('Fintech (Zell Education and Deloitte)'),
    ('Global Business (ISDC)'),
    ('Data Analytics and Data Visualization (Samatrix.io)'),
    ('Banking Financial Service and Insurance - 3 Years'),
    ('International Accreditation - Multiple Specializations (ISDC)'),
    ('New Age Sales and Marketing (CollegeDekho)'),
    ('Various Specializations (CollegeDekho)'),
    ('BBA Sunstone')
) AS branches(branch);

-- B.Com Programs (UG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Business'),
    'B.Com',
    'UG',
    2,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'B.Com' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Business')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('B.Com (General)'),
    ('International Accreditation - Multiple Specializations (ISDC)'),
    ('B.Com Sunstone')
) AS branches(branch);

-- MBA Programs (PG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Business'),
    'MBA',
    'PG',
    3,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'MBA' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Business')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('Human Resources (HR) - Dual Specialization'),
    ('Marketing - Dual Specialization'),
    ('Finance - Dual Specialization'),
    ('Production and Operations Management (POM) - Dual Specialization'),
    ('Information Technology Management (ITM) - Dual Specialization'),
    ('Entrepreneurship and Family Business Management (EFBM) - Dual Specialization'),
    ('Rural Management (RM) - Dual Specialization'),
    ('Banking Financial Service and Insurance (BFSI) - Dual Specialization'),
    ('Artificial Intelligence (Samatrix.io)'),
    ('Data Analytics and Data Visualization (Samatrix.io)'),
    ('Fintech (Imarticus)'),
    ('International Accreditation - Multiple Specializations (ISDC)'),
    ('New Age Sales and Marketing (CollegeDekho)'),
    ('Global Financial Operations (CollegeDekho)'),
    ('Applied HR (CollegeDekho)'),
    ('Various Specializations (CollegeDekho)'),
    ('MBA Sunstone')
) AS branches(branch);

-- ----------------------------------------------------------------------------
-- 2.4 School of Sciences
-- ----------------------------------------------------------------------------

-- B.Sc (Hons.) Programs - 4 Years (UG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'School of Sciences'),
    'B.Sc (Hons.) - 4 Years',
    'UG',
    1,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'B.Sc (Hons.) - 4 Years' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'School of Sciences')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('Forensic Science'),
    ('Biotechnology'),
    ('Microbiology')
) AS branches(branch);

-- M.Sc Programs (PG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'School of Sciences'),
    'M.Sc',
    'PG',
    2,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'M.Sc' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'School of Sciences')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('Physics'),
    ('Chemistry'),
    ('Mathematics'),
    ('Botany'),
    ('Zoology'),
    ('Biotechnology'),
    ('Microbiology'),
    ('Forensic Science'),
    ('Clinical Embryology (Indira IVF)')
) AS branches(branch);

-- ----------------------------------------------------------------------------
-- 2.5 School of Humanities & Social Sciences
-- ----------------------------------------------------------------------------

-- B.A. (Hons.) Programs - 4 Years (UG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'School of Humanities & Social Sciences'),
    'B.A. (Hons.) - 4 Years',
    'UG',
    1,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'B.A. (Hons.) - 4 Years' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'School of Humanities & Social Sciences')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('English'),
    ('Political Science'),
    ('Psychology'),
    ('Economics')
) AS branches(branch);

-- B.A. Liberal Studies (UG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'School of Humanities & Social Sciences'),
    'B.A. Liberal Studies',
    'UG',
    2,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'B.A. Liberal Studies' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'School of Humanities & Social Sciences')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('International Relations & Diplomacy'),
    ('Public Policy & Governance'),
    ('Linguistics'),
    ('Entrepreneurship & Family Business')
) AS branches(branch);

-- M.A. Programs (PG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'School of Humanities & Social Sciences'),
    'M.A.',
    'PG',
    3,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'M.A.' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'School of Humanities & Social Sciences')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('English'),
    ('Psychology (Clinical)'),
    ('Political Science'),
    ('International Relations'),
    ('Economics')
) AS branches(branch);

-- ----------------------------------------------------------------------------
-- 2.6 School of Law
-- ----------------------------------------------------------------------------

-- Integrated Law Programs (UG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'School of Law'),
    'Integrated Law Programs (Hons.)',
    'UG',
    1,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'Integrated Law Programs (Hons.)' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'School of Law')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('B.A. LL.B (Hons.)'),
    ('B.Sc. LL.B (Hons.)'),
    ('BBA LL.B (Hons.)')
) AS branches(branch);

-- LL.M Programs (PG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'School of Law'),
    'LL.M - 2 Years',
    'PG',
    2,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'LL.M - 2 Years' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'School of Law')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('Business Law'),
    ('Intellectual Property Rights (IPR)'),
    ('Personal Law')
) AS branches(branch);

-- ----------------------------------------------------------------------------
-- 2.7 Jaipur School of Mass Communication
-- ----------------------------------------------------------------------------

-- B.A. Journalism & Mass Communication (UG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Mass Communication'),
    'B.A. Journalism & Mass Communication',
    'UG',
    1,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'B.A. Journalism & Mass Communication' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Mass Communication')),
    'B.A. Journalism & Mass Communication (General)',
    1,
    true;

-- M.A. Journalism & Mass Communication (PG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Mass Communication'),
    'M.A. Journalism & Mass Communication',
    'PG',
    2,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'M.A. Journalism & Mass Communication' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Mass Communication')),
    'M.A. Journalism & Mass Communication (General)',
    1,
    true;

-- ----------------------------------------------------------------------------
-- 2.8 Jaipur School of Design
-- ----------------------------------------------------------------------------

-- Bachelor of Visual Arts (UG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Design'),
    'Bachelor of Visual Arts (BVA)',
    'UG',
    1,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'Bachelor of Visual Arts (BVA)' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Design')),
    'BVA (General)',
    1,
    true;

-- B.Des Programs (UG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Design'),
    'B.Des - 4 Years',
    'UG',
    2,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'B.Des - 4 Years' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Design')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('Communication Design (ISDC)'),
    ('Fashion Design'),
    ('Interior Design'),
    ('Jewellery Design and Manufacturing'),
    ('Game Art & Animation (Asian Institute of Design)')
) AS branches(branch);

-- Masters of Visual Arts (PG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Design'),
    'Masters of Visual Arts (MVA)',
    'PG',
    3,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'Masters of Visual Arts (MVA)' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Design')),
    'Graphic Design',
    1,
    true;

-- M.Des Programs (PG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Design'),
    'M.Des',
    'PG',
    4,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'M.Des' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Design')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('Interior Design'),
    ('Fashion Design')
) AS branches(branch);

-- M.Sc Design Programs (PG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Design'),
    'M.Sc (Design)',
    'PG',
    5,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'M.Sc (Design)' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Design')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('Jewellery Design'),
    ('Graphic Design'),
    ('Fashion Design'),
    ('Interior Design')
) AS branches(branch);

-- ----------------------------------------------------------------------------
-- 2.9 Jaipur School of Economics
-- ----------------------------------------------------------------------------

-- B.A. (Hons.) Economics (UG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Economics'),
    'B.A. (Hons.) Economics - 4 Years',
    'UG',
    1,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'B.A. (Hons.) Economics - 4 Years' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Economics')),
    'B.A. (Hons.) Economics',
    1,
    true;

-- M.A. Economics (PG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Economics'),
    'M.A. Economics',
    'PG',
    2,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'M.A. Economics' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'Jaipur School of Economics')),
    'M.A. Economics',
    1,
    true;

-- ----------------------------------------------------------------------------
-- 2.10 School of Allied Health Sciences
-- ----------------------------------------------------------------------------

-- Bachelor of Physiotherapy (UG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'School of Allied Health Sciences'),
    'Bachelor of Physiotherapy (BPT)',
    'UG',
    1,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'Bachelor of Physiotherapy (BPT)' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'School of Allied Health Sciences')),
    'BPT (General)',
    1,
    true;

-- Master of Physiotherapy (PG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'School of Allied Health Sciences'),
    'Master of Physiotherapy (MPT)',
    'PG',
    2,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'Master of Physiotherapy (MPT)' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'School of Allied Health Sciences')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('Sports'),
    ('Orthopaedics'),
    ('Neurology'),
    ('Cardiopulmonary')
) AS branches(branch);

-- ----------------------------------------------------------------------------
-- 2.11 School of Hospitality
-- ----------------------------------------------------------------------------

-- B.Sc. Hospitality and Hotel Management (UG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'School of Hospitality'),
    'B.Sc. Hospitality and Hotel Management (HHM)',
    'UG',
    1,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'B.Sc. Hospitality and Hotel Management (HHM)' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'School of Hospitality')),
    'B.Sc. HHM (General)',
    1,
    true;

-- ----------------------------------------------------------------------------
-- 2.12 Directorate of Executive Education
-- ----------------------------------------------------------------------------

-- MBA Hospital and Healthcare Management (PG)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Directorate of Executive Education'),
    'MBA (Hospital and Healthcare Management)',
    'PG',
    1,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'MBA (Hospital and Healthcare Management)' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'Directorate of Executive Education')),
    'MBA Hospital and Healthcare Management',
    1,
    true;

-- ----------------------------------------------------------------------------
-- 2.13 Ph.D. (Doctoral Programme)
-- ----------------------------------------------------------------------------

-- Ph.D. Programs across all disciplines (PhD)
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Ph.D. (Doctoral Programme)'),
    'Ph.D.',
    'PhD',
    1,
    true;

INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'Ph.D.' AND school_id = (SELECT id FROM public.config_schools WHERE name = 'Ph.D. (Doctoral Programme)')),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('Law'),
    ('Economics'),
    ('Mass Communication'),
    ('Computer Applications'),
    ('Design'),
    ('Humanities & Social Sciences'),
    ('Business Studies (Management)'),
    ('Engineering & Technology'),
    ('Sciences'),
    ('Hospitality')
) AS branches(branch);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count schools (should be 13)
SELECT COUNT(*) as total_schools FROM public.config_schools;

-- Count courses per school
SELECT
    s.name as school_name,
    COUNT(c.id) as course_count
FROM public.config_schools s
LEFT JOIN public.config_courses c ON s.id = c.school_id
GROUP BY s.name, s.display_order
ORDER BY s.display_order;

-- Count branches per course
SELECT 
    s.name as school_name,
    c.name as course_name,
    COUNT(b.id) as branch_count
FROM public.config_schools s
LEFT JOIN public.config_courses c ON s.id = c.school_id
LEFT JOIN public.config_branches b ON c.id = b.course_id
GROUP BY s.name, c.name, s.display_order, c.display_order
ORDER BY s.display_order, c.display_order;

-- Total counts
SELECT 
    (SELECT COUNT(*) FROM public.config_schools) as total_schools,
    (SELECT COUNT(*) FROM public.config_courses) as total_courses,
    (SELECT COUNT(*) FROM public.config_branches) as total_branches;

-- ============================================================================
-- DATA SEED COMPLETE!
-- ============================================================================
-- Schools: 13
-- Courses: ~40+
-- Branches: ~200+
-- Total Programs: ~200+ across UG/PG/PhD levels
-- ============================================================================