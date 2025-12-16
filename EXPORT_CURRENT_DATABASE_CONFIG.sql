-- ============================================================================
-- EXPORT CURRENT DATABASE CONFIGURATION
-- ============================================================================
-- Run this in Supabase SQL Editor and copy the output
-- This will show you EXACTLY what branches you have in your database
-- ============================================================================

-- Export All Branches (Formatted for easy reading)
SELECT 
    ROW_NUMBER() OVER (ORDER BY s.display_order, c.name, b.name) AS row_num,
    s.name AS school,
    c.name AS course,
    b.name AS branch,
    b.id AS branch_id
FROM public.config_branches b
JOIN public.config_courses c ON b.course_id = c.id
JOIN public.config_schools s ON c.school_id = s.id
ORDER BY s.display_order, c.name, b.name;

-- Also export in SQL INSERT format (to update ULTIMATE_DATABASE_SETUP.sql)
SELECT 
    '-- ' || s.name || ' > ' || c.name || CHR(10) ||
    'INSERT INTO public.config_branches (course_id, name) VALUES ' || CHR(10) ||
    '  ((SELECT id FROM public.config_courses WHERE name = ''' || c.name || '''), ''' || b.name || ''');'
    AS sql_insert
FROM public.config_branches b
JOIN public.config_courses c ON b.course_id = c.id
JOIN public.config_schools s ON c.school_id = s.id
ORDER BY s.display_order, c.name, b.name;

-- Export Branch Count Summary
SELECT 
    s.name AS school,
    COUNT(DISTINCT c.id) AS total_courses,
    COUNT(b.id) AS total_branches,
    STRING_AGG(DISTINCT c.name, ', ' ORDER BY c.name) AS course_list
FROM public.config_schools s
LEFT JOIN public.config_courses c ON c.school_id = s.id
LEFT JOIN public.config_branches b ON b.course_id = c.id
GROUP BY s.name, s.display_order
ORDER BY s.display_order;