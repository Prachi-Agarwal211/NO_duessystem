-- Database Optimization: Add Indexes for Performance
-- Run this script in Supabase SQL Editor

-- 1. Index for checking existing registration (Critical for SUBMIT)
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_registration_no 
ON public.no_dues_forms(registration_no);

-- 2. Index for filtering by status (Staff Dashboard)
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_status 
ON public.no_dues_forms(status);

-- 3. Index for sorting by date (Staff Dashboard default sort)
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_created_at 
ON public.no_dues_forms(created_at DESC);

-- 4. Composite index for department action checks (Critical for ACTION)
-- Helps finding the specific status row quickly
CREATE INDEX IF NOT EXISTS idx_no_dues_status_form_dept 
ON public.no_dues_status(form_id, department_name);

-- 5. Index for profiles email (Used in auth lookups frequently)
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON public.profiles(email);

-- 6. Index for profiles role (Used in staff filtering)
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON public.profiles(role);

-- Confirm execution
SELECT 'Indexes created successfully' as status;
