-- ============================================================================
-- FIX INFINITE RECURSION IN PROFILES RLS POLICY
-- ============================================================================
-- This fixes the "infinite recursion detected" error when trying to login
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

-- Recreate it without the infinite recursion
-- This policy allows users to see their own profile OR any profile if they are admin
CREATE POLICY "Admin can view all profiles" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        role = 'admin'
    );

-- Verify the policy was created
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Expected output: Should see 3 policies including the fixed "Admin can view all profiles"