-- ============================================================================
-- VERIFICATION: Check if Database Has All 139 Branches
-- ============================================================================
-- Run this in Supabase SQL Editor to verify your database
-- ============================================================================

-- Check Total Counts
DO $$
DECLARE
    school_count INTEGER;
    course_count INTEGER;
    branch_count INTEGER;
    dept_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO school_count FROM public.config_schools;
    SELECT COUNT(*) INTO course_count FROM public.config_courses;
    SELECT COUNT(*) INTO branch_count FROM public.config_branches;
    SELECT COUNT(*) INTO dept_count FROM public.departments;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  DATABASE VERIFICATION RESULTS                        ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Current Database Statistics:';
    RAISE NOTICE '   - Schools: % (Expected: 13)', school_count;
    RAISE NOTICE '   - Courses: % (Expected: ~52)', course_count;
    RAISE NOTICE '   - Branches: % (Expected: 139)', branch_count;
    RAISE NOTICE '   - Departments: % (Expected: 10)', dept_count;
    RAISE NOTICE '';
    
    IF branch_count = 139 THEN
        RAISE NOTICE '🎉 SUCCESS! You have all 139 branches!';
    ELSIF branch_count = 95 THEN
        RAISE NOTICE '⚠️  WARNING: You only have 95 branches (44 missing)';
    ELSE
        RAISE NOTICE '⚠️  ATTENTION: You have % branches', branch_count;
    END IF;
    RAISE NOTICE '';
END $$;

-- Show Branch Count by School
SELECT 
    s.name AS school_name,
    COUNT(DISTINCT c.id) AS courses,
    COUNT(b.id) AS branches
FROM public.config_schools s
LEFT JOIN public.config_courses c ON c.school_id = s.id
LEFT JOIN public.config_branches b ON b.course_id = c.id
GROUP BY s.name, s.display_order
ORDER BY s.display_order;