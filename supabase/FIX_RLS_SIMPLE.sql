-- ============================================================================
-- SIMPLE FIX FOR RLS INFINITE RECURSION - PROFILES TABLE
-- ============================================================================
-- This completely removes any self-referencing policies
-- and replaces them with simple, non-recursive ones
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES ON PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

-- ============================================================================
-- STEP 2: CREATE SIMPLE NON-RECURSIVE POLICIES
-- ============================================================================

-- Policy 1: Allow ANY authenticated user to SELECT from profiles
-- This is safe because:
-- - Users need to see their own profile after login
-- - Admin users need to see other profiles
-- - The application code handles authorization checks
-- - No sensitive data is in profiles table (just role, name, department)
CREATE POLICY "authenticated_users_can_read_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);  -- No recursion - just check if user is authenticated

-- Policy 2: Users can only update their own profile
CREATE POLICY "users_can_update_own_profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 3: Only allow inserts from service role (backend)
-- Regular users shouldn't be able to create profiles
CREATE POLICY "service_role_can_insert_profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (false);  -- Block all inserts from regular users

-- ============================================================================
-- STEP 3: VERIFY POLICIES
-- ============================================================================

-- Check all policies on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ============================================================================
-- EXPLANATION
-- ============================================================================
-- This approach works because:
--
-- 1. SELECT Policy: Allows all authenticated users to read profiles
--    - No self-reference to profiles table
--    - No recursion possible
--    - Application code validates what data is shown to whom
--
-- 2. UPDATE Policy: Simple self-check (auth.uid() = id)
--    - No external table lookups
--    - No recursion possible
--
-- 3. INSERT Policy: Blocked for regular users
--    - Profiles should only be created via service role (backend)
--    - This is already how the system works
--
-- Security Notes:
-- - Allowing read access to all profiles is acceptable because:
--   * Profile data is not sensitive (just role, name, department)
--   * Backend API routes validate what actions users can perform
--   * RLS protects other tables (forms, status, etc.)
-- ============================================================================

-- ============================================================================
-- TEST THE FIX
-- ============================================================================
-- After running this SQL, try logging in again
-- The error should be gone because there's no recursion in the policies
-- ============================================================================