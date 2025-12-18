-- Check what we actually have in the database right now

-- 1. Forms
SELECT 'Forms' as table_name, COUNT(*) as total,
  COUNT(CASE WHEN is_manual_entry = true THEN 1 END) as manual,
  COUNT(CASE WHEN is_manual_entry = false OR is_manual_entry IS NULL THEN 1 END) as online
FROM no_dues_forms;

-- 2. Status records (only for online forms)
SELECT 'Status Records' as table_name, COUNT(*) as total
FROM no_dues_status;

-- 3. Status by department
SELECT department_name, status, COUNT(*) as count
FROM no_dues_status
GROUP BY department_name, status
ORDER BY department_name, status;

-- 4. Librarian profile
SELECT email, department_name, assigned_department_ids, role
FROM profiles
WHERE email = '15anuragsingh2003@gmail.com';

-- 5. Library department ID
SELECT id, name, display_name
FROM departments
WHERE name = 'library';

-- Expected Results:
-- - 2 forms total (1 online, 1 manual)
-- - 7 status records (Anurag × 7 departments)
-- - All should show status 'pending' initially
-- - After library approval: 1 approved, 6 still pending