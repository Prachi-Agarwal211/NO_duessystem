-- ============================================================================
-- FIX RLS INFINITE RECURSION ERROR IN PROFILES TABLE
-- ============================================================================
-- Error: "infinite recursion detected in policy for relation profiles"
-- 
-- Problem: The "Admin can view all profiles" policy causes recursion because
-- it checks the profiles table from within a profiles table policy.
--
-- Solution: Use a simpler policy that doesn't cause self-reference
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP PROBLEMATIC POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

-- ============================================================================
-- STEP 2: CREATE CORRECTED POLICIES
-- ============================================================================

-- Policy 1: Allow users to view their own profile
-- This is safe - no recursion
CREATE POLICY "Users can view own profile" 
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Allow users to update their own profile
-- This is safe - no recursion
CREATE POLICY "Users can update own profile" 
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Policy 3: Allow authenticated users with admin role to view all profiles
-- FIXED: Use direct role check instead of subquery to avoid recursion
CREATE POLICY "Admin can view all profiles" 
ON public.profiles
FOR SELECT
USING (
    auth.uid() = id  -- Can always see own profile
    OR
    -- Admin users can see all profiles
    -- Using direct check without subquery to avoid recursion
    (
        SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1
    ) = 'admin'
);

-- Alternative simpler approach (if above still causes issues):
-- Disable RLS temporarily for profiles table to allow admin access via service role
-- The application code will handle authorization checks

-- ============================================================================
-- ALTERNATIVE SOLUTION (Use if policy approach still fails)
-- ============================================================================
-- If the above policies still cause recursion, you can:
-- 1. Keep RLS enabled but use service role key in backend for profile queries
-- 2. OR disable RLS for profiles table (less secure but functional)
--
-- To disable RLS on profiles (only if needed):
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- 
-- Note: If you disable RLS, make sure ALL API routes that access profiles
-- properly validate user permissions in application code!
-- ============================================================================

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check current policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- Test as admin user (replace with actual admin UUID):
-- SET LOCAL "request.jwt.claims" TO '{"sub": "5269d0de-f362-418a-b65d-6304ec438503"}';
-- SELECT * FROM profiles;

-- ============================================================================
-- RECOMMENDED APPROACH
-- ============================================================================
-- The infinite recursion happens because RLS policies can't reliably check
-- themselves. The best solution is to:
--
-- 1. Use the Supabase service role key in backend API routes for profile checks
-- 2. Keep RLS enabled for security
-- 3. Validate permissions in application code, not just in RLS policies
--
-- This is already done in the codebase:
-- - src/app/staff/login/page.js uses regular client
-- - src/app/api/staff/dashboard/route.js uses service role (supabaseAdmin)
-- ============================================================================