-- ============================================================================
-- CHECK AND FIX RLS POLICIES
-- ============================================================================
-- This checks if RLS is blocking the API from reading config tables
-- ============================================================================

-- First, check current RLS policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles::text,
    cmd,
    qual::text as using_expression,
    with_check::text as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('config_schools', 'config_courses', 'config_branches', 'no_dues_forms')
ORDER BY tablename, policyname;

-- Check if service role can read schools
SET ROLE service_role;
SELECT id, name FROM config_schools LIMIT 3;
RESET ROLE;

-- If above query fails, we need to fix RLS policies for service_role

-- Drop existing policies if they're blocking service_role
DROP POLICY IF EXISTS "Allow public read access to schools" ON config_schools;
DROP POLICY IF EXISTS "Allow public read access to courses" ON config_courses;
DROP POLICY IF EXISTS "Allow public read access to branches" ON config_branches;

-- Create proper policies that allow service_role (used by API)
CREATE POLICY "Enable read access for all users" 
ON config_schools FOR SELECT 
USING (true);

CREATE POLICY "Enable read access for all users" 
ON config_courses FOR SELECT 
USING (true);

CREATE POLICY "Enable read access for all users" 
ON config_branches FOR SELECT 
USING (true);

-- Also ensure service_role can insert into no_dues_forms
DROP POLICY IF EXISTS "Allow public insert to forms" ON no_dues_forms;
DROP POLICY IF EXISTS "Allow public read own forms" ON no_dues_forms;

CREATE POLICY "Enable insert for all users" 
ON no_dues_forms FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable read for all users" 
ON no_dues_forms FOR SELECT 
USING (true);

-- Verify policies are created
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('config_schools', 'config_courses', 'config_branches', 'no_dues_forms')
ORDER BY tablename;

-- Test that service_role can now read and write
SET ROLE service_role;
SELECT 'Service role can read schools:' as test, COUNT(*) as school_count FROM config_schools;
SELECT 'Service role can read courses:' as test, COUNT(*) as course_count FROM config_courses;
SELECT 'Service role can read branches:' as test, COUNT(*) as branch_count FROM config_branches;
RESET ROLE;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS policies fixed!';
    RAISE NOTICE '';
    RAISE NOTICE 'Service role (API) can now:';
    RAISE NOTICE '  - Read all schools, courses, branches';
    RAISE NOTICE '  - Insert into no_dues_forms';
    RAISE NOTICE '  - Read from no_dues_forms';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Try submitting the form again!';
    RAISE NOTICE '';
END $$;