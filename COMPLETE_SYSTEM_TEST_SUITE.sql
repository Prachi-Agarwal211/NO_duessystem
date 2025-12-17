-- ========================================
-- COMPLETE SYSTEM TEST SUITE
-- ========================================
-- This script creates test data, tests all workflows, and cleans up
-- Run each section step by step and verify results

-- ========================================
-- PART 1: CREATE TEST CONVOCATION DATA
-- ========================================

-- Add 2 test students to convocation list
INSERT INTO convocation_students (
  registration_no,
  name,
  school,
  course,
  branch,
  admission_year
) VALUES
  ('22TEST001', 'Test Student Alpha', 'School of Engineering and Technology', 'B.Tech', 'Computer Science', '2022'),
  ('22TEST002', 'Test Student Beta', 'School of Management', 'MBA', NULL, '2022')
ON CONFLICT (registration_no) DO NOTHING;

-- Verify convocation data inserted
SELECT 
  registration_no,
  name,
  school,
  course,
  branch,
  admission_year,
  is_eligible,
  created_at
FROM convocation_students
WHERE registration_no IN ('22TEST001', '22TEST002');

-- ========================================
-- PART 2: CREATE TEST EMAIL ACCOUNTS
-- ========================================

-- Test Account Structure:
-- 1. test.student1@jecrcu.edu.in (Regular student - convocation eligible)
-- 2. test.student2@jecrcu.edu.in (Regular student - not in convocation)
-- 3. test.student3@jecrcu.edu.in (Manual entry user)
-- 4. test.hod@jecrcu.edu.in (HOD - School of Engineering)
-- 5. test.library@jecrcu.edu.in (Library staff)
-- 6. test.hostel@jecrcu.edu.in (Hostel staff)
-- 7. test.admin@jecrcu.edu.in (Admin user)

-- Note: These accounts need to be created in Supabase Auth
-- You cannot create auth users via SQL directly for security reasons
-- Use the Supabase Dashboard or Auth API

-- After creating auth accounts manually, run this to create profiles:

-- Get the auth UIDs first (replace with actual UUIDs after creating in Supabase Auth)
-- Example: Copy the UUID from Supabase Auth → Users after creating each account

-- Create test profiles (run AFTER creating auth accounts)
INSERT INTO profiles (
  id, -- Use the auth.users.id from Supabase Auth
  full_name,
  email,
  role,
  department_id
) VALUES
  -- Test Student 1 (Replace 'uuid-here-1' with actual UUID)
  ('00000000-0000-0000-0000-000000000001', 'Test Student Alpha', 'test.student1@jecrcu.edu.in', 'student', NULL),
  
  -- Test Student 2 (Replace 'uuid-here-2' with actual UUID)
  ('00000000-0000-0000-0000-000000000002', 'Test Student Beta', 'test.student2@jecrcu.edu.in', 'student', NULL),
  
  -- Test Student 3 (Manual Entry) (Replace 'uuid-here-3' with actual UUID)
  ('00000000-0000-0000-0000-000000000003', 'Test Student Gamma', 'test.student3@jecrcu.edu.in', 'student', NULL),
  
  -- Test HOD (Replace 'uuid-here-4' with actual UUID)
  ('00000000-0000-0000-0000-000000000004', 'Test HOD', 'test.hod@jecrcu.edu.in', 'hod',
    (SELECT id FROM departments WHERE name = 'School HOD' LIMIT 1)),
  
  -- Test Library Staff (Replace 'uuid-here-5' with actual UUID)
  ('00000000-0000-0000-0000-000000000005', 'Test Librarian', 'test.library@jecrcu.edu.in', 'department',
    (SELECT id FROM departments WHERE name = 'Library' LIMIT 1)),
  
  -- Test Hostel Staff (Replace 'uuid-here-6' with actual UUID)
  ('00000000-0000-0000-0000-000000000006', 'Test Hostel Manager', 'test.hostel@jecrcu.edu.in', 'department',
    (SELECT id FROM departments WHERE name = 'Hostel' LIMIT 1)),
  
  -- Test Admin (Replace 'uuid-here-7' with actual UUID)
  ('00000000-0000-0000-0000-000000000007', 'Test Admin', 'test.admin@jecrcu.edu.in', 'admin', NULL)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  department_id = EXCLUDED.department_id;

-- Verify test accounts created
SELECT 
  id,
  full_name,
  email,
  role,
  department_id,
  created_at
FROM profiles
WHERE email LIKE 'test.%@jecrcu.edu.in'
ORDER BY email;

-- ========================================
-- PART 3: TESTING WORKFLOW SCRIPTS
-- ========================================

-- TEST 1: Regular Form Submission (Convocation Eligible)
-- --------------------------------------------------------
-- Action: Student submits form using registration_no: 22TEST001
-- Expected: Should auto-fill name, school from convocation data
-- Verify with:

SELECT 
  f.id,
  f.registration_no,
  f.student_name,
  f.school,
  f.course,
  f.branch,
  f.personal_email,
  f.status,
  f.is_manual_entry,
  f.created_at
FROM student_forms f
WHERE f.registration_no = '22TEST001'
ORDER BY f.created_at DESC
LIMIT 1;

-- Check department statuses created
SELECT 
  ds.form_id,
  d.name as department,
  ds.status,
  ds.created_at
FROM department_statuses ds
JOIN departments d ON ds.department_id = d.id
WHERE ds.form_id = (
  SELECT id FROM student_forms 
  WHERE registration_no = '22TEST001' 
  ORDER BY created_at DESC 
  LIMIT 1
)
ORDER BY d.approval_order;

-- TEST 2: Regular Form Submission (Not in Convocation)
-- --------------------------------------------------------
-- Action: Student submits form using registration_no: 22TEST003
-- Expected: Should allow submission but no auto-fill
-- Verify with:

SELECT 
  f.id,
  f.registration_no,
  f.student_name,
  f.school,
  f.course,
  f.status,
  f.is_manual_entry,
  f.created_at
FROM student_forms f
WHERE f.registration_no = '22TEST003'
ORDER BY f.created_at DESC
LIMIT 1;

-- TEST 3: Manual Entry Submission
-- --------------------------------------------------------
-- Action: Student uploads certificate via manual entry page
-- Expected: Form created with is_manual_entry=true, status='pending_verification'
-- Verify with:

SELECT 
  f.id,
  f.registration_no,
  f.student_name,
  f.school,
  f.course,
  f.certificate_url,
  f.status,
  f.is_manual_entry,
  f.created_at
FROM student_forms f
WHERE f.is_manual_entry = true
AND f.registration_no LIKE '22TEST%'
ORDER BY f.created_at DESC
LIMIT 1;

-- TEST 4: Department Approval Workflow
-- --------------------------------------------------------
-- Action: HOD approves a form
-- Expected: Department status changes to 'approved', form status updates
-- Get form ID first:

SELECT id, registration_no, status 
FROM student_forms 
WHERE registration_no = '22TEST001'
ORDER BY created_at DESC 
LIMIT 1;

-- After HOD approves via UI, verify:
SELECT 
  ds.form_id,
  d.name as department,
  ds.status,
  ds.remarks,
  ds.approved_by,
  p.full_name as approved_by_name,
  ds.approved_at
FROM department_statuses ds
JOIN departments d ON ds.department_id = d.id
LEFT JOIN profiles p ON ds.approved_by = p.id
WHERE ds.form_id = (
  SELECT id FROM student_forms 
  WHERE registration_no = '22TEST001' 
  ORDER BY created_at DESC 
  LIMIT 1
)
ORDER BY d.approval_order;

-- TEST 5: Rejection Cascade
-- --------------------------------------------------------
-- Action: Library staff rejects a form
-- Expected: Form status becomes 'rejected', subsequent departments blocked
-- Verify cascade:

SELECT 
  f.id,
  f.registration_no,
  f.status,
  ds.department_id,
  d.name as department,
  ds.status as dept_status,
  ds.remarks
FROM student_forms f
JOIN department_statuses ds ON f.id = ds.form_id
JOIN departments d ON ds.department_id = d.id
WHERE f.registration_no = '22TEST001'
ORDER BY d.approval_order;

-- TEST 6: Check Status (Student View)
-- --------------------------------------------------------
-- Action: Student checks their application status
-- Expected: Shows all department approvals and overall status
-- Verify data returned:

SELECT 
  f.id,
  f.registration_no,
  f.student_name,
  f.school,
  f.course,
  f.branch,
  f.status,
  f.is_manual_entry,
  json_agg(
    json_build_object(
      'department', d.name,
      'status', ds.status,
      'remarks', ds.remarks,
      'approved_at', ds.approved_at,
      'approved_by', p.full_name
    ) ORDER BY d.approval_order
  ) as department_statuses
FROM student_forms f
JOIN department_statuses ds ON f.id = ds.form_id
JOIN departments d ON ds.department_id = d.id
LEFT JOIN profiles p ON ds.approved_by = p.id
WHERE f.registration_no = '22TEST001'
GROUP BY f.id;

-- TEST 7: Reapplication After Rejection
-- --------------------------------------------------------
-- Action: Student reapplies after fixing rejection reasons
-- Expected: New form created, old form marked 'reapplied'
-- Verify:

SELECT 
  id,
  registration_no,
  student_name,
  status,
  is_manual_entry,
  created_at,
  reapplied_at
FROM student_forms
WHERE registration_no = '22TEST001'
ORDER BY created_at DESC;

-- Check that only latest form has status != 'reapplied'
SELECT 
  COUNT(*) as total_forms,
  COUNT(CASE WHEN status = 'reapplied' THEN 1 END) as old_forms,
  COUNT(CASE WHEN status != 'reapplied' THEN 1 END) as active_forms
FROM student_forms
WHERE registration_no = '22TEST001';

-- TEST 8: Certificate Generation (Fully Approved)
-- --------------------------------------------------------
-- Action: After all departments approve, generate certificate
-- Expected: Certificate generated with unique number
-- Verify:

SELECT 
  f.id,
  f.registration_no,
  f.student_name,
  f.status,
  f.certificate_number,
  f.certificate_url,
  f.certificate_generated_at
FROM student_forms f
WHERE f.registration_no = '22TEST001'
AND f.status = 'approved'
ORDER BY f.created_at DESC
LIMIT 1;

-- TEST 9: Admin Dashboard Stats
-- --------------------------------------------------------
-- Action: Admin views dashboard statistics
-- Expected: Counts include test data
-- Verify stats:

SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'under_review') as under_review_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE is_manual_entry = true) as manual_entry_count,
  COUNT(*) FILTER (WHERE is_manual_entry = false) as regular_form_count,
  COUNT(DISTINCT registration_no) as unique_students
FROM student_forms;

-- TEST 10: Manual Entry Approval (Admin Only)
-- --------------------------------------------------------
-- Action: Admin approves manual entry certificate
-- Expected: is_manual_entry_verified changes to true, normal workflow starts
-- Verify:

SELECT 
  id,
  registration_no,
  student_name,
  is_manual_entry,
  is_manual_entry_verified,
  status,
  certificate_url,
  created_at,
  updated_at
FROM student_forms
WHERE is_manual_entry = true
AND registration_no LIKE '22TEST%'
ORDER BY created_at DESC;

-- After admin approval, check department statuses created:
SELECT 
  ds.form_id,
  d.name as department,
  ds.status,
  d.approval_order
FROM department_statuses ds
JOIN departments d ON ds.department_id = d.id
WHERE ds.form_id IN (
  SELECT id FROM student_forms 
  WHERE is_manual_entry = true 
  AND registration_no LIKE '22TEST%'
)
ORDER BY ds.form_id, d.approval_order;

-- ========================================
-- PART 4: PERFORMANCE AND DATA INTEGRITY CHECKS
-- ========================================

-- Check for duplicate forms (should be 0)
SELECT 
  registration_no,
  COUNT(*) as form_count,
  COUNT(CASE WHEN status != 'reapplied' THEN 1 END) as active_forms
FROM student_forms
GROUP BY registration_no
HAVING COUNT(CASE WHEN status != 'reapplied' THEN 1 END) > 1;

-- Check orphaned department statuses (should be 0)
SELECT COUNT(*) as orphaned_statuses
FROM department_statuses ds
WHERE NOT EXISTS (
  SELECT 1 FROM student_forms f WHERE f.id = ds.form_id
);

-- Check forms without department statuses (should be 0 for non-manual-entry)
SELECT 
  f.id,
  f.registration_no,
  f.is_manual_entry,
  f.is_manual_entry_verified,
  f.status
FROM student_forms f
WHERE f.is_manual_entry_verified = true
AND NOT EXISTS (
  SELECT 1 FROM department_statuses ds WHERE ds.form_id = f.id
);

-- Check database indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('student_forms', 'department_statuses', 'profiles', 'convocation_students')
ORDER BY tablename, indexname;

-- ========================================
-- PART 5: CLEANUP - DELETE ALL TEST DATA
-- ========================================
-- WARNING: Run this ONLY after all tests are complete!

BEGIN;

-- Delete department statuses for test forms
DELETE FROM department_statuses
WHERE form_id IN (
  SELECT id FROM student_forms 
  WHERE registration_no LIKE '22TEST%'
);

-- Delete test student forms
DELETE FROM student_forms
WHERE registration_no LIKE '22TEST%';

-- Delete test convocation data
DELETE FROM convocation_students
WHERE registration_no IN ('22TEST001', '22TEST002');

-- Delete test profiles (but keep auth accounts for manual deletion)
DELETE FROM profiles
WHERE email LIKE 'test.%@jecrc.ac.in';

-- Verify cleanup
SELECT COUNT(*) as remaining_test_forms 
FROM student_forms 
WHERE registration_no LIKE '22TEST%';

SELECT COUNT(*) as remaining_test_convocation 
FROM convocation_students 
WHERE registration_no LIKE '22TEST%';

SELECT COUNT(*) as remaining_test_profiles 
FROM profiles 
WHERE email LIKE 'test.%@jecrc.ac.in';

COMMIT;

-- ========================================
-- PART 6: MANUAL AUTH ACCOUNT DELETION
-- ========================================
-- These accounts must be deleted manually in Supabase Dashboard:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Search for: test.student1@jecrc.ac.in
-- 3. Click "..." → Delete user
-- 4. Repeat for all 7 test accounts:
--    - test.student1@jecrc.ac.in
--    - test.student2@jecrc.ac.in
--    - test.student3@jecrc.ac.in
--    - test.hod@jecrc.ac.in
--    - test.library@jecrc.ac.in
--    - test.hostel@jecrc.ac.in
--    - test.admin@jecrc.ac.in

-- ========================================
-- TESTING COMPLETE!
-- ========================================