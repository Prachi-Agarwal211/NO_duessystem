-- ============================================================
-- BACKFILL MISSING no_dues_status RECORDS
-- ============================================================
-- 
-- PROBLEM: Forms were submitted but no_dues_status records were never created
-- This caused staff dashboards to show nothing.
--
-- SOLUTION: This script creates missing status records for all existing forms
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ============================================================

-- Step 1: Check how many forms are missing status records
SELECT 
  f.id as form_id,
  f.registration_no,
  f.student_name,
  f.created_at,
  COUNT(s.id) as existing_status_count
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON f.id = s.form_id
GROUP BY f.id, f.registration_no, f.student_name, f.created_at
HAVING COUNT(s.id) = 0;

-- Step 2: Insert missing status records for ALL active departments
-- This will create 'pending' status for each department for each form that has none
INSERT INTO no_dues_status (form_id, department_name, status, created_at)
SELECT 
  f.id as form_id,
  d.name as department_name,
  'pending' as status,
  f.created_at as created_at
FROM no_dues_forms f
CROSS JOIN departments d
WHERE d.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM no_dues_status s 
  WHERE s.form_id = f.id AND s.department_name = d.name
);

-- Step 3: Verify the backfill worked
SELECT 
  f.registration_no,
  f.student_name,
  COUNT(s.id) as status_count,
  STRING_AGG(s.department_name, ', ' ORDER BY s.department_name) as departments
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON f.id = s.form_id
GROUP BY f.id, f.registration_no, f.student_name
ORDER BY f.created_at DESC
LIMIT 10;

-- ============================================================
-- After running this, all forms should have status records for all active departments
-- Staff dashboards will now show all pending requests
-- ============================================================
