-- ============================================
-- CHECK PENDING APPLICATIONS FOR LIBRARY
-- ============================================

-- 1. Verify the UUID matches
SELECT 
  '=== STEP 1: UUID VERIFICATION ===' as step,
  d.id as library_uuid,
  d.name as dept_name,
  d.display_name,
  CASE 
    WHEN d.id = '397c48e1-f242-4612-b0ec-fdb2e386d2d3' THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as uuid_check
FROM departments d
WHERE d.name = 'library';

-- 2. Count ALL library statuses by status type
SELECT 
  '=== STEP 2: ALL LIBRARY STATUSES ===' as step,
  status,
  COUNT(*) as count
FROM no_dues_status
WHERE department_name = 'library'
GROUP BY status
ORDER BY status;

-- 3. List ALL pending library applications with details
SELECT 
  '=== STEP 3: PENDING LIBRARY APPLICATIONS ===' as step,
  s.id as status_id,
  s.form_id,
  s.department_name,
  s.status as dept_status,
  f.registration_no,
  f.student_name,
  f.status as form_status,
  f.created_at,
  f.updated_at
FROM no_dues_status s
INNER JOIN no_dues_forms f ON f.id = s.form_id
WHERE s.department_name = 'library'
  AND s.status = 'pending'
ORDER BY f.created_at DESC;

-- 4. Check the test form specifically
SELECT 
  '=== STEP 4: TEST FORM (22BCOM1367) ===' as step,
  f.id as form_id,
  f.registration_no,
  f.student_name,
  f.status as form_status,
  s.id as status_id,
  s.department_name,
  s.status as dept_status,
  s.action_at,
  s.action_by_user_id
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON s.form_id = f.id
WHERE f.registration_no = '22BCOM1367'
ORDER BY 
  CASE s.department_name
    WHEN 'school_hod' THEN 1
    WHEN 'library' THEN 2
    WHEN 'it_department' THEN 3
    WHEN 'hostel' THEN 4
    WHEN 'alumni_association' THEN 5
    WHEN 'accounts_department' THEN 6
    WHEN 'registrar' THEN 7
  END;

-- 5. Get EXACT dashboard query result
WITH user_depts AS (
  SELECT name FROM departments 
  WHERE id = '397c48e1-f242-4612-b0ec-fdb2e386d2d3'
)
SELECT 
  '=== STEP 5: DASHBOARD QUERY SIMULATION ===' as step,
  COUNT(*) as applications_in_dashboard,
  array_agg(f.registration_no) as registration_numbers
FROM no_dues_status s
INNER JOIN no_dues_forms f ON f.id = s.form_id
WHERE s.department_name IN (SELECT name FROM user_depts)
  AND s.status = 'pending';

-- 6. DIAGNOSIS
SELECT 
  '=== STEP 6: DIAGNOSIS ===' as step,
  CASE 
    WHEN (SELECT COUNT(*) FROM no_dues_status WHERE department_name = 'library' AND status = 'pending') = 0 THEN
      '❌ NO PENDING APPLICATIONS - All forms have been processed or none submitted. Need to either: 1) Submit new form, 2) Reset test form to pending'
    ELSE
      '✅ PENDING APPLICATIONS EXIST - Should appear in dashboard. Check API logs for errors.'
  END as diagnosis,
  (SELECT COUNT(*) FROM no_dues_status WHERE department_name = 'library' AND status = 'pending') as pending_count,
  (SELECT COUNT(*) FROM no_dues_status WHERE department_name = 'library' AND status = 'approved') as approved_count,
  (SELECT COUNT(*) FROM no_dues_status WHERE department_name = 'library' AND status = 'rejected') as rejected_count;

-- 7. QUICK FIX: Reset test form to pending (if needed)
-- Uncomment ONLY if Step 6 shows 0 pending:
/*
UPDATE no_dues_status 
SET 
  status = 'pending',
  action_at = NULL,
  action_by_user_id = NULL,
  rejection_reason = NULL
WHERE form_id = (SELECT id FROM no_dues_forms WHERE registration_no = '22BCOM1367')
  AND department_name = 'library';

UPDATE no_dues_forms 
SET status = 'pending',
    rejection_reason = NULL,
    rejection_context = NULL
WHERE registration_no = '22BCOM1367';

-- Verify the fix
SELECT 
  'AFTER FIX' as check,
  COUNT(*) as pending_library_count
FROM no_dues_status 
WHERE department_name = 'library' AND status = 'pending';
*/