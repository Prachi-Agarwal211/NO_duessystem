-- ============================================================================
-- CRITICAL DATABASE SCHEMA FIX - Add Missing Columns
-- ============================================================================
-- Run this in Supabase SQL Editor to fix schema inconsistencies
-- Date: December 3, 2025
-- ============================================================================

-- 1. Add missing column to no_dues_forms table
ALTER TABLE public.no_dues_forms 
ADD COLUMN IF NOT EXISTS final_certificate_generated BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.no_dues_forms.final_certificate_generated 
IS 'Indicates if final PDF certificate has been generated and stored';

-- 2. Ensure scope columns exist in profiles (from add-staff-scope.sql)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS school_ids UUID[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS course_ids UUID[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS branch_ids UUID[] DEFAULT NULL;

-- Add column comments
COMMENT ON COLUMN public.profiles.school_ids IS 'Array of school IDs staff can access. NULL = all schools';
COMMENT ON COLUMN public.profiles.course_ids IS 'Array of course IDs staff can access. NULL = all courses';
COMMENT ON COLUMN public.profiles.branch_ids IS 'Array of branch IDs staff can access. NULL = all branches';

-- 3. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_forms_final_cert 
ON public.no_dues_forms(final_certificate_generated);

CREATE INDEX IF NOT EXISTS idx_profiles_school_ids 
ON public.profiles USING GIN(school_ids);

CREATE INDEX IF NOT EXISTS idx_profiles_course_ids 
ON public.profiles USING GIN(course_ids);

CREATE INDEX IF NOT EXISTS idx_profiles_branch_ids 
ON public.profiles USING GIN(branch_ids);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if columns were added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'no_dues_forms' 
AND column_name = 'final_certificate_generated';

SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('school_ids', 'course_ids', 'branch_ids');

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('no_dues_forms', 'profiles')
AND indexname LIKE '%final_cert%' OR indexname LIKE '%_ids%';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================