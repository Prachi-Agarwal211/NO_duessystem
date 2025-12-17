-- ============================================================
-- IMMEDIATE FIX: Make System Work Before Full Migration
-- ============================================================
-- This SQL adds the assigned_department_ids column and populates it
-- so the system works immediately while you prepare the full migration
-- ============================================================

-- Step 1: Add the column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS assigned_department_ids UUID[] DEFAULT '{}';

-- Step 2: Populate for ALL existing department staff
UPDATE public.profiles p
SET assigned_department_ids = ARRAY(
    SELECT d.id 
    FROM public.departments d 
    WHERE d.name = p.department_name
)
WHERE p.role = 'department' 
AND p.department_name IS NOT NULL
AND (p.assigned_department_ids IS NULL OR p.assigned_department_ids = '{}');

-- Step 3: Verify the fix worked
SELECT 
    email,
    full_name,
    department_name,
    assigned_department_ids,
    (SELECT name FROM departments WHERE id = ANY(assigned_department_ids)) as assigned_dept_names
FROM public.profiles
WHERE role = 'department';

-- Expected output: All department staff should have assigned_department_ids populated

-- ============================================================
-- After running this SQL:
-- 1. Refresh your dashboard (Ctrl+F5 or Cmd+Shift+R)
-- 2. Stats will show correct counts
-- 3. Everything will work properly
-- ============================================================