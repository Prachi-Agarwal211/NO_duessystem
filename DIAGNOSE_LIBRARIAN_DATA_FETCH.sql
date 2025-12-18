-- ============================================
-- COMPLETE LIBRARIAN DATA FETCH DIAGNOSTIC
-- ============================================
-- Run this in production Supabase SQL Editor

-- ============================================
-- STEP 1: CHECK LIBRARIAN PROFILE
-- ============================================
SELECT 
  '=== STEP 1: LIBRARIAN PROFILE ===' as step,
  p.id as user_id,
  p.email,
  p.full_name,
  p.role,
  p.department_name as dept_name_text,
  p.assigned_department_ids as dept_ids_array,
  p.school_ids,
  p.course_ids,
  p.branch_ids,
  p.is_active
FROM profiles p
WHERE p.email = '15anuragsingh2003@gmail.com';

-- ============================================
-- STEP 2: CHECK DEPARTMENTS TABLE
-- ============================================
SELECT 
  '=== STEP 2: DEPARTMENTS TABLE ===' as step,
  d.id as dept_id,
  d.name as dept_name,
  d.display_name,
  d.is_active,
  d.display_order
FROM departments d
WHERE d.name = 'library';

-- ============================================
-- STEP 3: VERIFY PROFILE HAS LIBRARY UUID
-- ============================================
SELECT 
  '=== STEP 3: UUID MAPPING CHECK ===' as step,
  p.email,
  d.id as library_dept_id,
  d.name as library_dept_name,
  p.assigned_department_ids,
  (p.assigned_department_ids @> ARRAY[d.id]) as "has_library_uuid",
  CASE 
    WHEN p.assigned_department_ids IS NULL THEN '❌ NULL - NEED TO FIX'
    WHEN p.assigned_department_ids = '{}' THEN '❌ EMPTY - NEED TO FIX'
    WHEN p.assigned_department_ids @> ARRAY[d.id] THEN '✅ CORRECT'
    ELSE '❌ WRONG UUID - NEED TO FIX'
  END as status
FROM profiles p
CROSS JOIN departments d
WHERE p.email = '15anuragsingh2003@gmail.com'
  AND d.name = 'library';

-- ============================================
-- STEP 4: CHECK ALL FORMS IN SYSTEM
-- ============================================
SELECT 
  '=== STEP 4: ALL FORMS ===' as step,
  COUNT(*) as total_forms,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_forms,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_forms,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_forms
FROM no_dues_forms;

-- ============================================
-- STEP 5: CHECK LIBRARY STATUS ROWS
-- ============================================
SELECT 
  '=== STEP 5: LIBRARY STATUS ROWS ===' as step,
  COUNT(*) as total_library_statuses,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
FROM no_dues_status
WHERE department_name = 'library';

-- ============================================
-- STEP 6: LIST ALL PENDING LIBRARY APPLICATIONS
-- ============================================
SELECT 
  '=== STEP 6: PENDING LIBRARY APPS ===' as step,
  s.id as status_id,
  s.form_id,
  s.department_name,
  s.status as dept_status,
  f.id as form_pk,
  f.registration_no,
  f.student_name,
  f.status as form_status,
  f.created_at
FROM no_dues_status s
INNER JOIN no_dues_forms f ON f.id = s.form_id
WHERE s.department_name = 'library'
  AND s.status = 'pending'
ORDER BY f.created_at DESC
LIMIT 10;

-- ============================================
-- STEP 7: CHECK WHAT API QUERY WOULD RETURN
-- ============================================
-- This simulates the exact query the dashboard API uses
WITH librarian_profile AS (
  SELECT 
    p.id as user_id,
    p.assigned_department_ids,
    p.school_ids,
    p.course_ids,
    p.branch_ids
  FROM profiles p
  WHERE p.email = '15anuragsingh2003@gmail.com'
),
librarian_departments AS (
  SELECT d.id, d.name, d.display_name
  FROM departments d, librarian_profile lp
  WHERE d.id = ANY(lp.assigned_department_ids)
)
SELECT 
  '=== STEP 7: API QUERY SIMULATION ===' as step,
  COUNT(*) as applications_api_would_return
FROM no_dues_status s
INNER JOIN no_dues_forms f ON f.id = s.form_id
CROSS JOIN librarian_departments ld
WHERE s.department_name IN (SELECT name FROM librarian_departments)
  AND s.status = 'pending';

-- ============================================
-- STEP 8: DETAILED DEPARTMENT STATUS BREAKDOWN
-- ============================================
SELECT 
  '=== STEP 8: ALL DEPT STATUSES ===' as step,
  s.department_name,
  COUNT(*) as total,
  COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved,
  COUNT(CASE WHEN s.status = 'rejected' THEN 1 END) as rejected
FROM no_dues_status s
GROUP BY s.department_name
ORDER BY s.department_name;

-- ============================================
-- STEP 9: CHECK IF PROFILE NEEDS FIX
-- ============================================
SELECT 
  '=== STEP 9: FIX NEEDED? ===' as step,
  CASE 
    WHEN p.assigned_department_ids IS NULL OR p.assigned_department_ids = '{}' THEN
      '❌ YES - Run: UPDATE profiles SET assigned_department_ids = ARRAY[(SELECT id FROM departments WHERE name = ''library'')] WHERE email = ''15anuragsingh2003@gmail.com'';'
    WHEN NOT (p.assigned_department_ids @> ARRAY[(SELECT id FROM departments WHERE name = 'library')]) THEN
      '❌ YES - Profile has wrong UUIDs. Run: UPDATE profiles SET assigned_department_ids = ARRAY[(SELECT id FROM departments WHERE name = ''library'')] WHERE email = ''15anuragsingh2003@gmail.com'';'
    ELSE
      '✅ NO - Profile is correctly configured'
  END as fix_status
FROM profiles p
WHERE p.email = '15anuragsingh2003@gmail.com';

-- ============================================
-- STEP 10: CHECK SPECIFIC TEST FORM
-- ============================================
SELECT 
  '=== STEP 10: TEST FORM STATUS ===' as step,
  f.id as form_id,
  f.registration_no,
  f.student_name,
  f.status as form_status,
  COUNT(s.id) as total_dept_statuses,
  COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_depts,
  COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved_depts,
  COUNT(CASE WHEN s.status = 'rejected' THEN 1 END) as rejected_depts,
  array_agg(s.department_name) FILTER (WHERE s.status = 'pending') as pending_dept_names,
  array_agg(s.department_name) FILTER (WHERE s.status = 'rejected') as rejected_dept_names
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON s.form_id = f.id
WHERE f.registration_no = '22BCOM1367'
GROUP BY f.id, f.registration_no, f.student_name, f.status;

-- ============================================
-- STEP 11: FINAL DIAGNOSIS
-- ============================================
SELECT 
  '=== STEP 11: FINAL DIAGNOSIS ===' as step,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE email = '15anuragsingh2003@gmail.com') THEN
      '❌ CRITICAL: Librarian profile doesn''t exist!'
    WHEN (SELECT assigned_department_ids FROM profiles WHERE email = '15anuragsingh2003@gmail.com') IS NULL THEN
      '❌ ISSUE: Profile has NULL assigned_department_ids - needs UPDATE'
    WHEN (SELECT assigned_department_ids FROM profiles WHERE email = '15anuragsingh2003@gmail.com') = '{}' THEN
      '❌ ISSUE: Profile has EMPTY assigned_department_ids - needs UPDATE'
    WHEN NOT (SELECT assigned_department_ids @> ARRAY[(SELECT id FROM departments WHERE name = 'library')] FROM profiles WHERE email = '15anuragsingh2003@gmail.com') THEN
      '❌ ISSUE: Profile has WRONG UUIDs in assigned_department_ids - needs UPDATE'
    WHEN (SELECT COUNT(*) FROM no_dues_status WHERE department_name = 'library' AND status = 'pending') = 0 THEN
      '✅ PROFILE OK - But NO PENDING applications exist (all processed or none submitted)'
    ELSE
      '✅ EVERYTHING OK - Profile configured correctly AND pending applications exist'
  END as diagnosis,
  (SELECT COUNT(*) FROM no_dues_status WHERE department_name = 'library' AND status = 'pending') as actual_pending_count;

-- ============================================
-- QUICK FIX (RUN ONLY IF STEP 9 SHOWS ISSUE)
-- ============================================
-- Uncomment and run ONLY if diagnosis shows profile issue:
/*
UPDATE profiles 
SET assigned_department_ids = ARRAY[(SELECT id FROM departments WHERE name = 'library')]
WHERE email = '15anuragsingh2003@gmail.com';

-- Verify fix:
SELECT 
  email,
  assigned_department_ids,
  (assigned_department_ids @> ARRAY[(SELECT id FROM departments WHERE name = 'library')]) as "has_library_uuid_now"
FROM profiles
WHERE email = '15anuragsingh2003@gmail.com';
*/