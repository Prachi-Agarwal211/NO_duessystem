-- ============================================================
-- URGENT FIX: Enable Librarian Account Immediately
-- ============================================================
-- Run this SQL in Supabase SQL Editor to fix the librarian account
-- This populates the assigned_department_ids field
-- ============================================================

-- Fix the librarian account (15anuragsingh2003@gmail.com)
UPDATE public.profiles
SET assigned_department_ids = ARRAY(
    SELECT id FROM public.departments WHERE name = 'library'
)
WHERE email = '15anuragsingh2003@gmail.com'
AND role = 'department';

-- Verify the fix
SELECT 
    email,
    department_name,
    assigned_department_ids,
    (SELECT name FROM departments WHERE id = ANY(assigned_department_ids)) as assigned_dept_names
FROM public.profiles
WHERE email = '15anuragsingh2003@gmail.com';

-- Expected output:
-- email: 15anuragsingh2003@gmail.com
-- department_name: library
-- assigned_department_ids: {397c48e1-f242-4612-b0ec-fdb2e386d2d3}
-- assigned_dept_names: library

-- ============================================================
-- After running this, the dashboard should show:
-- ✅ Pending Applications will appear
-- ✅ Stats will show correct counts
-- ✅ Click on forms will work
-- ============================================================