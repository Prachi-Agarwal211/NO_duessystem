-- ============================================================================
-- STAFF ACCESS SCOPE ENHANCEMENT
-- ============================================================================
-- This migration adds scope filtering to staff accounts without changing
-- the existing department-based system.
--
-- Purpose: Allow admins to configure which schools/courses/branches
--          each staff member can access.
--
-- Usage: Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- Add scope columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS school_ids UUID[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS course_ids UUID[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS branch_ids UUID[] DEFAULT NULL;

-- Add column comments for documentation
COMMENT ON COLUMN profiles.school_ids IS 'Array of school IDs staff can access. NULL = all schools';
COMMENT ON COLUMN profiles.course_ids IS 'Array of course IDs staff can access. NULL = all courses';
COMMENT ON COLUMN profiles.branch_ids IS 'Array of branch IDs staff can access. NULL = all branches';

-- Create GIN indexes for array columns (faster lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_school_ids 
ON profiles USING GIN(school_ids);

CREATE INDEX IF NOT EXISTS idx_profiles_course_ids 
ON profiles USING GIN(course_ids);

CREATE INDEX IF NOT EXISTS idx_profiles_branch_ids 
ON profiles USING GIN(branch_ids);

-- ============================================================================
-- HELPER FUNCTION: Check if staff can see a form
-- ============================================================================
-- This function checks if a staff member has access to view a specific form
-- based on their configured scope (schools, courses, branches)
--
-- Returns: TRUE if staff can see the form, FALSE otherwise
-- ============================================================================

CREATE OR REPLACE FUNCTION can_staff_see_form(
  p_staff_user_id UUID,
  p_form_school_id UUID,
  p_form_course_id UUID,
  p_form_branch_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_staff_schools UUID[];
  v_staff_courses UUID[];
  v_staff_branches UUID[];
BEGIN
  -- Get staff access scope
  SELECT school_ids, course_ids, branch_ids 
  INTO v_staff_schools, v_staff_courses, v_staff_branches
  FROM profiles 
  WHERE id = p_staff_user_id;
  
  -- If all scope fields are NULL, staff has access to everything
  IF v_staff_schools IS NULL AND v_staff_courses IS NULL AND v_staff_branches IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check school access (if scope is set)
  IF v_staff_schools IS NOT NULL THEN
    IF NOT (p_form_school_id = ANY(v_staff_schools)) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Check course access (if scope is set)
  IF v_staff_courses IS NOT NULL THEN
    IF NOT (p_form_course_id = ANY(v_staff_courses)) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Check branch access (if scope is set)
  IF v_staff_branches IS NOT NULL THEN
    IF NOT (p_form_branch_id = ANY(v_staff_branches)) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- All checks passed
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to function
COMMENT ON FUNCTION can_staff_see_form IS 'Check if staff member can access a specific form based on their scope configuration';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration was successful:

-- 1. Check if columns were added
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name IN ('school_ids', 'course_ids', 'branch_ids');

-- 2. Check if indexes were created
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'profiles' 
-- AND indexname LIKE 'idx_profiles_%_ids';

-- 3. Check if function exists
-- SELECT proname, prosrc 
-- FROM pg_proc 
-- WHERE proname = 'can_staff_see_form';

-- ============================================================================
-- EXAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Uncomment to insert test data:

/*
-- Example 1: Library staff (sees everyone)
-- UPDATE profiles SET 
--   school_ids = NULL,
--   course_ids = NULL,
--   branch_ids = NULL
-- WHERE email = 'library@jecrc.ac.in';

-- Example 2: CSE HOD (sees only Engineering B.Tech CSE)
-- UPDATE profiles SET 
--   school_ids = ARRAY[(SELECT id FROM config_schools WHERE name = 'Engineering')],
--   course_ids = ARRAY[(SELECT id FROM config_courses WHERE name = 'B.Tech')],
--   branch_ids = ARRAY[(SELECT id FROM config_branches WHERE name = 'CSE')]
-- WHERE email = 'cse.hod@jecrc.ac.in';

-- Example 3: Engineering Dean (sees all Engineering students)
-- UPDATE profiles SET 
--   school_ids = ARRAY[(SELECT id FROM config_schools WHERE name = 'Engineering')],
--   course_ids = NULL,
--   branch_ids = NULL
-- WHERE email = 'dean.engg@jecrc.ac.in';
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Update backend APIs to handle scope fields
-- 2. Update frontend to show scope selection
-- 3. Test with sample staff accounts
-- ============================================================================