-- ========================================================================
-- SYNC DEPARTMENT IDS IN PROFILES TABLE
-- ========================================================================
-- This script syncs the department_name field with assigned_department_ids
-- to ensure staff members can see forms in their dashboards
-- ========================================================================

-- Step 1: Update assigned_department_ids based on department_name
-- This handles the case where profiles have department_name but no assigned_department_ids

UPDATE public.profiles p
SET assigned_department_ids = ARRAY[d.id]
FROM public.departments d
WHERE p.department_name = d.name
  AND (p.assigned_department_ids IS NULL OR p.assigned_department_ids = '{}');

-- Step 2: For school_hod department, we need to verify they have proper department assignment
-- List all profiles that still need manual review
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.department_name,
    p.assigned_department_ids,
    p.school_ids,
    p.course_ids
FROM public.profiles p
WHERE p.role = 'department'
  AND (p.assigned_department_ids IS NULL OR p.assigned_department_ids = '{}')
ORDER BY p.department_name, p.email;

-- Step 3: Verify the sync worked
SELECT 
    p.email,
    p.department_name,
    p.assigned_department_ids,
    d.name as dept_name,
    d.display_name
FROM public.profiles p
LEFT JOIN public.departments d ON d.id = ANY(p.assigned_department_ids)
WHERE p.role = 'department'
ORDER BY p.department_name, p.email;

-- Step 4: Create index on assigned_department_ids for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_departments 
ON public.profiles USING GIN (assigned_department_ids);

-- Step 5: Add a check constraint to ensure assigned_department_ids is not empty for department role
-- (This is optional - uncomment if you want to enforce this)
-- ALTER TABLE public.profiles
-- ADD CONSTRAINT profiles_dept_has_assignments_check 
-- CHECK (
--   role != 'department' OR 
--   (assigned_department_ids IS NOT NULL AND array_length(assigned_department_ids, 1) > 0)
-- );