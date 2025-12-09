-- ==============================================
-- COMPREHENSIVE TEST DATA SETUP SCRIPT
-- ==============================================
-- Purpose: Create complete test environment for JECRC No Dues System
-- Date: December 9, 2025
-- Run this after clean database setup
-- ==============================================

-- Step 1: Clean existing data (CAUTION!)
TRUNCATE TABLE no_dues_status CASCADE;
TRUNCATE TABLE no_dues_forms CASCADE;
TRUNCATE TABLE manual_entries CASCADE;
TRUNCATE TABLE profiles CASCADE;

-- Reset sequences
ALTER SEQUENCE no_dues_forms_id_seq RESTART WITH 1;

-- ==============================================
-- STEP 2: CREATE SCHOOLS, COURSES, BRANCHES
-- ==============================================

-- Insert test schools
INSERT INTO schools (name, code, is_active) VALUES
('School of Engineering', 'SOE', true),
('School of Management', 'SOM', true),
('School of Science', 'SOS', true)
ON CONFLICT (code) DO NOTHING;

-- Get school IDs for reference
DO $$
DECLARE
  soe_id UUID;
  som_id UUID;
  sos_id UUID;
  cs_course_id UUID;
  me_course_id UUID;
  mba_course_id UUID;
  phy_course_id UUID;
BEGIN
  -- Get school IDs
  SELECT id INTO soe_id FROM schools WHERE code = 'SOE';
  SELECT id INTO som_id FROM schools WHERE code = 'SOM';
  SELECT id INTO sos_id FROM schools WHERE code = 'SOS';

  -- Insert courses
  INSERT INTO courses (name, code, school_id, is_active) VALUES
  ('B.Tech Computer Science', 'BTECHCS', soe_id, true),
  ('B.Tech Mechanical', 'BTECHME', soe_id, true),
  ('MBA', 'MBA', som_id, true),
  ('B.Sc Physics', 'BSCPHY', sos_id, true)
  ON CONFLICT (code) DO NOTHING;

  -- Get course IDs
  SELECT id INTO cs_course_id FROM courses WHERE code = 'BTECHCS';
  SELECT id INTO me_course_id FROM courses WHERE code = 'BTECHME';
  SELECT id INTO mba_course_id FROM courses WHERE code = 'MBA';
  SELECT id INTO phy_course_id FROM courses WHERE code = 'BSCPHY';

  -- Insert branches for CS course
  INSERT INTO branches (name, code, course_id, is_active) VALUES
  ('First Year', '1ST', cs_course_id, true),
  ('Second Year', '2ND', cs_course_id, true),
  ('Third Year', '3RD', cs_course_id, true),
  ('Fourth Year', '4TH', cs_course_id, true)
  ON CONFLICT (code) DO NOTHING;

  -- Insert branches for Mechanical
  INSERT INTO branches (name, code, course_id, is_active) VALUES
  ('First Year ME', '1ST_ME', me_course_id, true),
  ('Second Year ME', '2ND_ME', me_course_id, true)
  ON CONFLICT (code) DO NOTHING;

  -- Insert branches for MBA
  INSERT INTO branches (name, code, course_id, is_active) VALUES
  ('First Year MBA', '1ST_MBA', mba_course_id, true),
  ('Second Year MBA', '2ND_MBA', mba_course_id, true)
  ON CONFLICT (code) DO NOTHING;

END $$;

-- ==============================================
-- STEP 3: CREATE TEST USERS (ADMIN + 11 STAFF)
-- ==============================================

-- Admin User
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@jecrc.ac.in',
  crypt('Admin@123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"admin"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, full_name, email, role) VALUES
('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin@jecrc.ac.in', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Staff Users (11 departments)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role) VALUES
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000000', 'library@jecrc.ac.in', crypt('Staff@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"staff"}', 'authenticated', 'authenticated'),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000000', 'hostel@jecrc.ac.in', crypt('Staff@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"staff"}', 'authenticated', 'authenticated'),
('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000000', 'accounts@jecrc.ac.in', crypt('Staff@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"staff"}', 'authenticated', 'authenticated'),
('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000000', 'exam@jecrc.ac.in', crypt('Staff@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"staff"}', 'authenticated', 'authenticated'),
('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000000', 'training@jecrc.ac.in', crypt('Staff@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"staff"}', 'authenticated', 'authenticated'),
('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000000', 'sports@jecrc.ac.in', crypt('Staff@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"staff"}', 'authenticated', 'authenticated'),
('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000000', 'canteen@jecrc.ac.in', crypt('Staff@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"staff"}', 'authenticated', 'authenticated'),
('00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000000', 'transport@jecrc.ac.in', crypt('Staff@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"staff"}', 'authenticated', 'authenticated'),
('00000000-0000-0000-0000-000000000109', '00000000-0000-0000-0000-000000000000', 'admin.dept@jecrc.ac.in', crypt('Staff@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"staff"}', 'authenticated', 'authenticated'),
('00000000-0000-0000-0000-000000000110', '00000000-0000-0000-0000-000000000000', 'dept@jecrc.ac.in', crypt('Staff@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"staff"}', 'authenticated', 'authenticated'),
('00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000000', 'security@jecrc.ac.in', crypt('Staff@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"staff"}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Staff Profiles with Department Assignments
INSERT INTO profiles (id, full_name, email, role, department_name, school, course, branch) VALUES
('00000000-0000-0000-0000-000000000101', 'Library Staff', 'library@jecrc.ac.in', 'staff', 'Library', NULL, NULL, NULL),
('00000000-0000-0000-0000-000000000102', 'Hostel Staff', 'hostel@jecrc.ac.in', 'staff', 'Hostel', 'School of Engineering', NULL, NULL),
('00000000-0000-0000-0000-000000000103', 'Accounts Staff', 'accounts@jecrc.ac.in', 'staff', 'Accounts', NULL, NULL, NULL),
('00000000-0000-0000-0000-000000000104', 'Exam Cell Staff', 'exam@jecrc.ac.in', 'staff', 'Exam Cell', NULL, NULL, NULL),
('00000000-0000-0000-0000-000000000105', 'Training Staff', 'training@jecrc.ac.in', 'staff', 'Training & Placement', NULL, NULL, NULL),
('00000000-0000-0000-0000-000000000106', 'Sports Staff', 'sports@jecrc.ac.in', 'staff', 'Sports', NULL, NULL, NULL),
('00000000-0000-0000-0000-000000000107', 'Canteen Staff', 'canteen@jecrc.ac.in', 'staff', 'Canteen', NULL, NULL, NULL),
('00000000-0000-0000-0000-000000000108', 'Transport Staff', 'transport@jecrc.ac.in', 'staff', 'Transport', NULL, NULL, NULL),
('00000000-0000-0000-0000-000000000109', 'Administration Staff', 'admin.dept@jecrc.ac.in', 'staff', 'Administration', NULL, NULL, NULL),
('00000000-0000-0000-0000-000000000110', 'Department Staff', 'dept@jecrc.ac.in', 'staff', 'Department', 'School of Engineering', 'B.Tech Computer Science', NULL),
('00000000-0000-0000-0000-000000000111', 'Security Staff', 'security@jecrc.ac.in', 'staff', 'Security', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- STEP 4: CREATE TEST APPLICATIONS
-- ==============================================

-- Application 1: Fresh submission (All departments pending)
INSERT INTO no_dues_forms (
  registration_no, student_name, email, phone,
  school, course, branch, semester,
  reason_for_request, id_card_path,
  status, created_at
) VALUES (
  '21EJECS001', 'Test Student 1', 'student1@test.com', '9876543210',
  'School of Engineering', 'B.Tech Computer Science', 'Fourth Year', '8',
  'Semester End', '/uploads/id1.pdf',
  'pending', NOW()
);

-- Application 2: In Progress (Some approved, some pending)
INSERT INTO no_dues_forms (
  registration_no, student_name, email, phone,
  school, course, branch, semester,
  reason_for_request, id_card_path,
  status, created_at
) VALUES (
  '21EJECS002', 'Test Student 2', 'student2@test.com', '9876543211',
  'School of Engineering', 'B.Tech Computer Science', 'Fourth Year', '8',
  'Degree Completion', '/uploads/id2.pdf',
  'in_progress', NOW() - INTERVAL '2 days'
);

-- Application 3: Rejected by one department
INSERT INTO no_dues_forms (
  registration_no, student_name, email, phone,
  school, course, branch, semester,
  reason_for_request, id_card_path,
  status, created_at
) VALUES (
  '21EJECS003', 'Test Student 3', 'student3@test.com', '9876543212',
  'School of Engineering', 'B.Tech Computer Science', 'Third Year', '6',
  'Semester End', '/uploads/id3.pdf',
  'rejected', NOW() - INTERVAL '5 days'
);

-- Application 4: Completed (All approved)
INSERT INTO no_dues_forms (
  registration_no, student_name, email, phone,
  school, course, branch, semester,
  reason_for_request, id_card_path,
  status, created_at
) VALUES (
  '21EJECS004', 'Test Student 4', 'student4@test.com', '9876543213',
  'School of Engineering', 'B.Tech Computer Science', 'Fourth Year', '8',
  'Degree Completion', '/uploads/id4.pdf',
  'completed', NOW() - INTERVAL '10 days'
);

-- Application 5: MBA Student (Different school - to test department scope)
INSERT INTO no_dues_forms (
  registration_no, student_name, email, phone,
  school, course, branch, semester,
  reason_for_request, id_card_path,
  status, created_at
) VALUES (
  '21EJMBA001', 'MBA Test Student', 'mba1@test.com', '9876543214',
  'School of Management', 'MBA', 'First Year', '2',
  'Semester End', '/uploads/id5.pdf',
  'pending', NOW()
);

-- Application 6: Mechanical Engineering Student
INSERT INTO no_dues_forms (
  registration_no, student_name, email, phone,
  school, course, branch, semester,
  reason_for_request, id_card_path,
  status, created_at
) VALUES (
  '21EJEME001', 'Mechanical Test Student', 'me1@test.com', '9876543215',
  'School of Engineering', 'B.Tech Mechanical', 'Second Year ME', '4',
  'Semester End', '/uploads/id6.pdf',
  'pending', NOW()
);

-- ==============================================
-- STEP 5: CREATE DEPARTMENT STATUS RECORDS
-- ==============================================

DO $$
DECLARE
  form_id INTEGER;
  dept_name TEXT;
  dept_names TEXT[] := ARRAY[
    'Library', 'Hostel', 'Accounts', 'Exam Cell', 
    'Training & Placement', 'Sports', 'Canteen', 
    'Transport', 'Administration', 'Department', 'Security'
  ];
BEGIN
  -- For Application 1 (21EJECS001) - All pending
  SELECT id INTO form_id FROM no_dues_forms WHERE registration_no = '21EJECS001';
  FOREACH dept_name IN ARRAY dept_names LOOP
    INSERT INTO no_dues_status (form_id, department_name, status, updated_at)
    VALUES (form_id, dept_name, 'pending', NOW());
  END LOOP;

  -- For Application 2 (21EJECS002) - 5 approved, 6 pending
  SELECT id INTO form_id FROM no_dues_forms WHERE registration_no = '21EJECS002';
  INSERT INTO no_dues_status (form_id, department_name, status, comment, updated_at) VALUES
  (form_id, 'Library', 'approved', 'All books returned', NOW() - INTERVAL '1 day'),
  (form_id, 'Hostel', 'approved', 'Room cleared', NOW() - INTERVAL '1 day'),
  (form_id, 'Accounts', 'approved', 'Fees paid', NOW() - INTERVAL '1 day'),
  (form_id, 'Exam Cell', 'approved', 'No pending exams', NOW() - INTERVAL '1 day'),
  (form_id, 'Training & Placement', 'approved', 'Clear', NOW() - INTERVAL '1 day'),
  (form_id, 'Sports', 'pending', NULL, NOW()),
  (form_id, 'Canteen', 'pending', NULL, NOW()),
  (form_id, 'Transport', 'pending', NULL, NOW()),
  (form_id, 'Administration', 'pending', NULL, NOW()),
  (form_id, 'Department', 'pending', NULL, NOW()),
  (form_id, 'Security', 'pending', NULL, NOW());

  -- For Application 3 (21EJECS003) - Rejected by Accounts
  SELECT id INTO form_id FROM no_dues_forms WHERE registration_no = '21EJECS003';
  INSERT INTO no_dues_status (form_id, department_name, status, comment, rejection_reason, updated_at) VALUES
  (form_id, 'Library', 'approved', 'Clear', NULL, NOW() - INTERVAL '4 days'),
  (form_id, 'Hostel', 'approved', 'Clear', NULL, NOW() - INTERVAL '4 days'),
  (form_id, 'Accounts', 'rejected', NULL, 'Outstanding fees of Rs. 5000', NOW() - INTERVAL '3 days'),
  (form_id, 'Exam Cell', 'pending', NULL, NULL, NOW()),
  (form_id, 'Training & Placement', 'pending', NULL, NULL, NOW()),
  (form_id, 'Sports', 'pending', NULL, NULL, NOW()),
  (form_id, 'Canteen', 'pending', NULL, NULL, NOW()),
  (form_id, 'Transport', 'pending', NULL, NULL, NOW()),
  (form_id, 'Administration', 'pending', NULL, NULL, NOW()),
  (form_id, 'Department', 'pending', NULL, NULL, NOW()),
  (form_id, 'Security', 'pending', NULL, NULL, NOW());

  -- For Application 4 (21EJECS004) - All approved
  SELECT id INTO form_id FROM no_dues_forms WHERE registration_no = '21EJECS004';
  FOREACH dept_name IN ARRAY dept_names LOOP
    INSERT INTO no_dues_status (form_id, department_name, status, comment, updated_at)
    VALUES (form_id, dept_name, 'approved', 'Clear', NOW() - INTERVAL '8 days');
  END LOOP;

  -- For Application 5 (21EJMBA001) - All pending
  SELECT id INTO form_id FROM no_dues_forms WHERE registration_no = '21EJMBA001';
  FOREACH dept_name IN ARRAY dept_names LOOP
    INSERT INTO no_dues_status (form_id, department_name, status, updated_at)
    VALUES (form_id, dept_name, 'pending', NOW());
  END LOOP;

  -- For Application 6 (21EJEME001) - All pending
  SELECT id INTO form_id FROM no_dues_forms WHERE registration_no = '21EJEME001';
  FOREACH dept_name IN ARRAY dept_names LOOP
    INSERT INTO no_dues_status (form_id, department_name, status, updated_at)
    VALUES (form_id, dept_name, 'pending', NOW());
  END LOOP;

END $$;

-- ==============================================
-- STEP 6: VERIFICATION QUERIES
-- ==============================================

-- Verify test data creation
SELECT 
  'SCHOOLS' as entity,
  COUNT(*) as count 
FROM schools
UNION ALL
SELECT 'COURSES', COUNT(*) FROM courses
UNION ALL
SELECT 'BRANCHES', COUNT(*) FROM branches
UNION ALL
SELECT 'PROFILES', COUNT(*) FROM profiles
UNION ALL
SELECT 'FORMS', COUNT(*) FROM no_dues_forms
UNION ALL
SELECT 'STATUSES', COUNT(*) FROM no_dues_status;

-- Display test credentials
SELECT 
  'TEST CREDENTIALS' as info,
  '==================' as separator
UNION ALL
SELECT 'Admin:', 'admin@jecrc.ac.in / Admin@123'
UNION ALL
SELECT 'Library Staff:', 'library@jecrc.ac.in / Staff@123'
UNION ALL
SELECT 'Hostel Staff:', 'hostel@jecrc.ac.in / Staff@123'
UNION ALL
SELECT 'All Staff:', '[department]@jecrc.ac.in / Staff@123';

-- ==============================================
-- COMPLETE! TEST ENVIRONMENT READY
-- ==============================================

/*
SUMMARY:
✅ 3 Schools created
✅ 4 Courses created  
✅ 8 Branches created
✅ 1 Admin account
✅ 11 Staff accounts (one per department)
✅ 6 Test applications (various statuses)
✅ 66 Department status records

CREDENTIALS:
- Admin: admin@jecrc.ac.in / Admin@123
- Staff: [library|hostel|accounts|exam|training|sports|canteen|transport|admin.dept|dept|security]@jecrc.ac.in / Staff@123

TEST APPLICATIONS:
1. 21EJECS001 - Pending (all departments)
2. 21EJECS002 - In Progress (5 approved, 6 pending)
3. 21EJECS003 - Rejected (by Accounts)
4. 21EJECS004 - Completed (all approved)
5. 21EJMBA001 - Pending (MBA student, tests scope filtering)
6. 21EJEME001 - Pending (Mechanical student)

NEXT STEPS:
1. Run this script in Supabase SQL Editor
2. Verify data with queries above
3. Start testing with credentials provided
4. Follow COMPREHENSIVE_TESTING_GUIDE.md for test cases
*/