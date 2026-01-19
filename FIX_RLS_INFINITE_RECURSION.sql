-- ============================================================================
-- FIX RLS INFINITE RECURSION - COMPREHENSIVE FIX FOR ALL TABLES
-- ============================================================================
-- 
-- PROBLEM:
-- "infinite recursion detected in policy for relation no_dues_forms"
-- 
-- ROOT CAUSE:
-- The RLS policies on `no_dues_forms` (and other tables) query the `profiles`
-- table to check user roles. But `profiles` also has RLS policies that query
-- `profiles`. When Supabase tries to evaluate the policies, it creates a
-- circular dependency that causes infinite recursion.
--
-- AFFECTED TABLES:
-- - no_dues_forms (main issue)
-- - profiles (self-referencing)
-- - no_dues_status
-- - config_schools, config_courses, config_branches
-- - departments
-- - reminder_logs
-- - no_dues_messages
-- - support_tickets
--
-- SOLUTION:
-- 1. Create SECURITY DEFINER helper functions that bypass RLS
-- 2. Replace all policies that query profiles with function calls
-- 3. Simplify policies to avoid circular dependencies
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING PROBLEMATIC POLICIES ON ALL TABLES
-- ============================================================================

-- Drop policies on no_dues_forms
DROP POLICY IF EXISTS "Students can create forms" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Students can read own forms" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Staff/Admin read all forms" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Admin manage all forms" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Public read no_dues_forms" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Allow admin update" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Allow admin delete" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Authenticated users create forms" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Students read own forms" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Staff and Admin read all forms" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Admin update forms" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Admin delete forms" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Students update own pending forms" ON public.no_dues_forms;

-- Drop policies on profiles that may cause recursion
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role manages profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff read own profile" ON public.profiles;

-- Drop policies on no_dues_status
DROP POLICY IF EXISTS "Public read status" ON public.no_dues_status;
DROP POLICY IF EXISTS "Staff manage own department status" ON public.no_dues_status;
DROP POLICY IF EXISTS "Public read no_dues_status" ON public.no_dues_status;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.no_dues_status;
DROP POLICY IF EXISTS "Authenticated read status" ON public.no_dues_status;
DROP POLICY IF EXISTS "Staff update status" ON public.no_dues_status;
DROP POLICY IF EXISTS "Admin manage status" ON public.no_dues_status;

-- Drop policies on config tables
DROP POLICY IF EXISTS "Admin manage config_schools" ON public.config_schools;
DROP POLICY IF EXISTS "Public read config_schools" ON public.config_schools;
DROP POLICY IF EXISTS "Admin manage config_courses" ON public.config_courses;
DROP POLICY IF EXISTS "Public read config_courses" ON public.config_courses;
DROP POLICY IF EXISTS "Admin manage config_branches" ON public.config_branches;
DROP POLICY IF EXISTS "Public read config_branches" ON public.config_branches;
DROP POLICY IF EXISTS "Admin manage departments" ON public.departments;
DROP POLICY IF EXISTS "Public read departments" ON public.departments;

-- Drop policies on reminder_logs
DROP POLICY IF EXISTS "Admin manage reminder_logs" ON public.reminder_logs;

-- Drop policies on no_dues_messages (if table exists)
DO $$ BEGIN
    -- Drop old policy names
    DROP POLICY IF EXISTS "Students can read own messages" ON public.no_dues_messages;
    DROP POLICY IF EXISTS "Students can send messages" ON public.no_dues_messages;
    DROP POLICY IF EXISTS "Staff can read department messages" ON public.no_dues_messages;
    DROP POLICY IF EXISTS "Staff can send department messages" ON public.no_dues_messages;
    DROP POLICY IF EXISTS "Staff can mark as read" ON public.no_dues_messages;
    
    -- Drop new policy names (to allow re-running this script)
    DROP POLICY IF EXISTS "Students read own messages" ON public.no_dues_messages;
    DROP POLICY IF EXISTS "Students send own messages" ON public.no_dues_messages;
    DROP POLICY IF EXISTS "Staff read messages" ON public.no_dues_messages;
    DROP POLICY IF EXISTS "Staff send messages" ON public.no_dues_messages;
    DROP POLICY IF EXISTS "Staff update messages" ON public.no_dues_messages;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop policies on support_tickets
DROP POLICY IF EXISTS "Admin manage support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users read own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admin manage tickets" ON public.support_tickets; -- Added to fix error

-- ============================================================================
-- STEP 2: CREATE SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================
-- These functions run with elevated privileges (SECURITY DEFINER) meaning
-- they bypass RLS when querying the profiles table. This breaks the recursion
-- because the RLS policies use these functions instead of direct queries.

-- Helper function to get user role from profiles (BYPASSES RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM public.profiles 
    WHERE id = user_id;
    RETURN COALESCE(user_role, 'anonymous');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_user_role(user_id) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user is staff (department) or admin
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    user_role := public.get_user_role(user_id);
    RETURN user_role IN ('admin', 'department');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to get user's form_id (for students)
CREATE OR REPLACE FUNCTION public.get_user_form_id(user_id UUID)
RETURNS UUID AS $$
DECLARE
    form_id UUID;
BEGIN
    SELECT id INTO form_id 
    FROM public.no_dues_forms 
    WHERE user_id = get_user_form_id.user_id
    ORDER BY created_at DESC 
    LIMIT 1;
    RETURN form_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 3: CREATE NEW RLS POLICIES FOR PROFILES (NO RECURSION)
-- ============================================================================

-- Policy 1: Anyone authenticated can read their own profile
-- Uses direct auth.uid() comparison, no sub-queries needed
CREATE POLICY "Users read own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

-- Policy 2: Users can update their own profile
CREATE POLICY "Users update own profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy 3: Admin can read ALL profiles
-- Uses our SECURITY DEFINER function to avoid recursion
CREATE POLICY "Admin read all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Policy 4: Admin can manage (insert/update/delete) all profiles
CREATE POLICY "Admin manage profiles" 
ON public.profiles 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Policy 5: Staff can read their own profile (for dashboard)
CREATE POLICY "Staff read own profile" 
ON public.profiles 
FOR SELECT 
USING (
    id = auth.uid() 
    AND public.get_user_role(auth.uid()) = 'department'
);

-- ============================================================================
-- STEP 4: CREATE NEW RLS POLICIES FOR NO_DUES_FORMS (NO RECURSION)
-- ============================================================================

-- Policy 1: Any authenticated user can INSERT (create form)
-- Students create forms, so we allow all authenticated users
CREATE POLICY "Authenticated users create forms" 
ON public.no_dues_forms 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Policy 2: Students can read their OWN forms only
-- Uses user_id match - no recursion as we don't query profiles
CREATE POLICY "Students read own forms" 
ON public.no_dues_forms 
FOR SELECT 
USING (user_id = auth.uid());

-- Policy 3: Staff and Admin can read ALL forms
-- Uses SECURITY DEFINER function - no recursion
CREATE POLICY "Staff and Admin read all forms" 
ON public.no_dues_forms 
FOR SELECT 
USING (public.is_staff_or_admin(auth.uid()));

-- Policy 4: Admin can UPDATE any form
CREATE POLICY "Admin update forms" 
ON public.no_dues_forms 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- Policy 5: Admin can DELETE forms
CREATE POLICY "Admin delete forms" 
ON public.no_dues_forms 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Policy 6: Students can update their own pending forms (for reapplication)
CREATE POLICY "Students update own pending forms" 
ON public.no_dues_forms 
FOR UPDATE 
USING (
    user_id = auth.uid() 
    AND status IN ('pending', 'rejected')
);

-- ============================================================================
-- STEP 5: CREATE NEW RLS POLICIES FOR NO_DUES_STATUS (NO RECURSION)
-- ============================================================================

-- Policy 1: Anyone authenticated can read status
-- Status is not sensitive, students need to see their own status
CREATE POLICY "Authenticated read status" 
ON public.no_dues_status 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Policy 2: Staff can update status for their department
CREATE POLICY "Staff update status" 
ON public.no_dues_status 
FOR UPDATE 
USING (public.get_user_role(auth.uid()) = 'department');

-- Policy 3: Admin can manage all status records
CREATE POLICY "Admin manage status" 
ON public.no_dues_status 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- ============================================================================
-- STEP 6: CREATE NEW RLS POLICIES FOR CONFIG TABLES (NO RECURSION)
-- ============================================================================

-- Config Schools - Public read, Admin manage
CREATE POLICY "Public read config_schools" 
ON public.config_schools 
FOR SELECT 
USING (true);

CREATE POLICY "Admin manage config_schools" 
ON public.config_schools 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Config Courses - Public read, Admin manage
CREATE POLICY "Public read config_courses" 
ON public.config_courses 
FOR SELECT 
USING (true);

CREATE POLICY "Admin manage config_courses" 
ON public.config_courses 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Config Branches - Public read, Admin manage
CREATE POLICY "Public read config_branches" 
ON public.config_branches 
FOR SELECT 
USING (true);

CREATE POLICY "Admin manage config_branches" 
ON public.config_branches 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Departments - Public read, Admin manage
CREATE POLICY "Public read departments" 
ON public.departments 
FOR SELECT 
USING (true);

CREATE POLICY "Admin manage departments" 
ON public.departments 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- ============================================================================
-- STEP 7: CREATE NEW RLS POLICIES FOR REMINDER_LOGS (NO RECURSION)
-- ============================================================================

-- Only admin can access reminder_logs
DO $$ BEGIN
    CREATE POLICY "Admin manage reminder_logs" 
    ON public.reminder_logs 
    FOR ALL 
    USING (public.is_admin(auth.uid()));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- STEP 8: CREATE NEW RLS POLICIES FOR SUPPORT_TICKETS (NO RECURSION)
-- ============================================================================

-- Users can create tickets
CREATE POLICY "Users create tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Users can read their own tickets
CREATE POLICY "Users read own tickets" 
ON public.support_tickets 
FOR SELECT 
USING (user_email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- Admin can manage all tickets
CREATE POLICY "Admin manage tickets" 
ON public.support_tickets 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- ============================================================================
-- STEP 9: CREATE NEW RLS POLICIES FOR NO_DUES_MESSAGES (NO RECURSION)
-- ============================================================================
-- Only create if table exists (it's from a migration)

DO $$ 
BEGIN
    -- Students can read their own messages (via form ownership)
    CREATE POLICY "Students read own messages" 
    ON public.no_dues_messages 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.no_dues_forms ndf
            WHERE ndf.id = no_dues_messages.form_id
            AND ndf.user_id = auth.uid()
        )
    );

    -- Students can send messages for their forms
    CREATE POLICY "Students send own messages" 
    ON public.no_dues_messages 
    FOR INSERT 
    WITH CHECK (
        sender_type = 'student'
        AND EXISTS (
            SELECT 1 FROM public.no_dues_forms ndf
            WHERE ndf.id = no_dues_messages.form_id
            AND ndf.user_id = auth.uid()
        )
    );

    -- Staff can read messages for forms (using function to avoid recursion)
    CREATE POLICY "Staff read messages" 
    ON public.no_dues_messages 
    FOR SELECT 
    USING (public.is_staff_or_admin(auth.uid()));

    -- Staff can send messages
    CREATE POLICY "Staff send messages" 
    ON public.no_dues_messages 
    FOR INSERT 
    WITH CHECK (
        sender_type = 'department'
        AND public.get_user_role(auth.uid()) = 'department'
    );

    -- Staff can mark messages as read
    CREATE POLICY "Staff update messages" 
    ON public.no_dues_messages 
    FOR UPDATE 
    USING (public.is_staff_or_admin(auth.uid()));

EXCEPTION WHEN undefined_table THEN 
    RAISE NOTICE 'no_dues_messages table does not exist, skipping message policies';
END $$;

-- ============================================================================
-- STEP 10: GRANT EXECUTE PERMISSIONS ON HELPER FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_form_id(UUID) TO authenticated;

-- ============================================================================
-- STEP 11: VERIFY THE POLICIES ARE CORRECT
-- ============================================================================

-- Show all policies on key tables
SELECT tablename, policyname, cmd, qual::text
FROM pg_policies
WHERE tablename IN (
    'no_dues_forms', 
    'profiles', 
    'no_dues_status',
    'config_schools',
    'config_courses',
    'config_branches',
    'departments',
    'support_tickets',
    'no_dues_messages'
)
ORDER BY tablename, policyname;

-- ============================================================================
-- TROUBLESHOOTING NOTES
-- ============================================================================
-- 
-- If you still see recursion errors after running this script:
-- 
-- 1. Make sure ALL old policies are dropped. Run this to check:
--    SELECT tablename, policyname FROM pg_policies 
--    WHERE tablename IN ('no_dues_forms', 'profiles', 'no_dues_status');
-- 
-- 2. Verify the helper functions exist: 
--    SELECT proname FROM pg_proc 
--    WHERE proname IN ('get_user_role', 'is_admin', 'is_staff_or_admin');
-- 
-- 3. Check that RLS is enabled on the tables:
--    SELECT tablename, rowsecurity FROM pg_tables 
--    WHERE tablename IN ('no_dues_forms', 'profiles', 'no_dues_status');
-- 
-- 4. Test the fix by running these queries as an admin user:
--    SELECT * FROM no_dues_forms LIMIT 1;
--    SELECT * FROM profiles LIMIT 1;
--    SELECT * FROM no_dues_status LIMIT 1;
-- 
-- 5. If policies are duplicated, drop them all and re-run this script:
--    -- You can drop all policies on a table with:
--    -- DO $$ DECLARE pol RECORD; BEGIN
--    --   FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'no_dues_forms'
--    --   LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.no_dues_forms', pol.policyname);
--    --   END LOOP;
--    -- END $$;
-- 
-- ============================================================================
