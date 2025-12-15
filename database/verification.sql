-- =====================================================
-- DATABASE VERIFICATION COMMANDS
-- Run these in Supabase SQL Editor to verify setup
-- =====================================================

-- =====================================================
-- 1. CHECK EMAIL QUEUE TABLE
-- =====================================================

-- Check if email_queue table exists
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public' 
  AND tablename = 'email_queue'
) as email_queue_exists;

-- Expected: email_queue_exists = true

-- View email_queue table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'email_queue'
ORDER BY ordinal_position;

-- Count emails in queue
SELECT 
  status,
  COUNT(*) as count
FROM email_queue
GROUP BY status
ORDER BY status;

-- View recent queued emails
SELECT 
  id,
  to_address,
  subject,
  status,
  retry_count,
  created_at,
  scheduled_for,
  sent_at,
  error_message
FROM email_queue
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 2. CHECK CONVOCATION TABLE
-- =====================================================

-- Check if convocation_eligible_students table exists
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public' 
  AND tablename = 'convocation_eligible_students'
) as convocation_table_exists;

-- Expected: convocation_table_exists = true

-- Count total students in convocation list
SELECT COUNT(*) as total_students 
FROM convocation_eligible_students;

-- Expected: total_students = 3181 (or your actual count)

-- View convocation table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'convocation_eligible_students'
ORDER BY ordinal_position;

-- Sample convocation data (first 10 students)
SELECT 
  registration_no,
  name,
  school,
  admission_year
FROM convocation_eligible_students
ORDER BY registration_no
LIMIT 10;

-- Check for specific registration number (test auto-fill)
SELECT 
  registration_no,
  name,
  school,
  admission_year
FROM convocation_eligible_students
WHERE registration_no = '22BCAN001';

-- Expected: Should return 1 row with student details

-- Count students by school
SELECT 
  school,
  COUNT(*) as student_count
FROM convocation_eligible_students
GROUP BY school
ORDER BY student_count DESC;

-- =====================================================
-- 3. CHECK NO DUES FORMS TABLE
-- =====================================================

-- Check if no_dues_forms table exists
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public' 
  AND tablename = 'no_dues_forms'
) as forms_table_exists;

-- Expected: forms_table_exists = true

-- Count forms by status
SELECT 
  status,
  COUNT(*) as count
FROM no_dues_forms
GROUP BY status
ORDER BY status;

-- View recent form submissions
SELECT 
  id,
  registration_no,
  student_name,
  school,
  course,
  branch,
  status,
  created_at
FROM no_dues_forms
ORDER BY created_at DESC
LIMIT 10;

-- Check for duplicate registrations
SELECT 
  registration_no,
  COUNT(*) as submission_count
FROM no_dues_forms
GROUP BY registration_no
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no duplicates)

-- =====================================================
-- 4. CHECK DEPARTMENT APPROVALS TABLE
-- =====================================================

-- Check if department_approvals table exists
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public' 
  AND tablename = 'department_approvals'
) as approvals_table_exists;

-- Count approvals by status
SELECT 
  status,
  COUNT(*) as count
FROM department_approvals
GROUP BY status;

-- View recent approvals
SELECT 
  form_id,
  department_name,
  status,
  approved_by,
  created_at,
  updated_at
FROM department_approvals
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 5. CHECK CONFIGURATION TABLES
-- =====================================================

-- Count active schools
SELECT COUNT(*) as active_schools
FROM config_schools
WHERE is_active = true;

-- List all schools
SELECT 
  id,
  name,
  code,
  is_active,
  display_order
FROM config_schools
ORDER BY display_order, name;

-- Count active courses
SELECT COUNT(*) as active_courses
FROM config_courses
WHERE is_active = true;

-- Count active branches
SELECT COUNT(*) as active_branches
FROM config_branches
WHERE is_active = true;

-- School → Course → Branch hierarchy sample
SELECT 
  s.name as school,
  c.name as course,
  COUNT(b.id) as branch_count
FROM config_schools s
LEFT JOIN config_courses c ON c.school_id = s.id
LEFT JOIN config_branches b ON b.course_id = c.id
WHERE s.is_active = true 
  AND c.is_active = true 
  AND b.is_active = true
GROUP BY s.name, c.name
ORDER BY s.name, c.name
LIMIT 20;

-- =====================================================
-- 6. CHECK STAFF PROFILES
-- =====================================================

-- Count staff by role
SELECT 
  role,
  COUNT(*) as count
FROM profiles
WHERE role IN ('admin', 'department', 'registrar')
GROUP BY role;

-- View department staff
SELECT 
  id,
  email,
  full_name,
  department_name,
  role,
  is_active
FROM profiles
WHERE role = 'department'
ORDER BY department_name, full_name;

-- Check HOD scope configuration
SELECT 
  email,
  full_name,
  department_name,
  school_id,
  COALESCE(array_length(school_ids, 1), 0) as schools_count,
  COALESCE(array_length(course_ids, 1), 0) as courses_count,
  COALESCE(array_length(branch_ids, 1), 0) as branches_count
FROM profiles
WHERE department_name = 'school_hod'
  AND is_active = true;

-- =====================================================
-- 7. CHECK RLS POLICIES
-- =====================================================

-- List all RLS policies for email_queue
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'email_queue';

-- Expected: service_role bypass policy

-- List all RLS policies for no_dues_forms
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'no_dues_forms';

-- List all RLS policies for convocation_eligible_students
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'convocation_eligible_students';

-- =====================================================
-- 8. CHECK VALIDATION RULES
-- =====================================================

-- Check if validation rules table exists
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public' 
  AND tablename = 'config_validation_rules'
) as validation_rules_exists;

-- List active validation rules
SELECT 
  rule_name,
  rule_pattern,
  error_message,
  is_active
FROM config_validation_rules
WHERE is_active = true
ORDER BY rule_name;

-- =====================================================
-- 9. DATABASE SIZE AND PERFORMANCE
-- =====================================================

-- Check database size
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Check indexes on key tables
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('no_dues_forms', 'email_queue', 'convocation_eligible_students', 'department_approvals')
ORDER BY tablename, indexname;

-- =====================================================
-- 10. FULL SYSTEM HEALTH CHECK
-- =====================================================

-- Comprehensive system status
SELECT 
  'email_queue' as table_name,
  (SELECT COUNT(*) FROM email_queue) as total_rows,
  (SELECT COUNT(*) FROM email_queue WHERE status = 'pending') as pending_count,
  (SELECT COUNT(*) FROM email_queue WHERE status = 'sent') as sent_count,
  (SELECT COUNT(*) FROM email_queue WHERE status = 'failed') as failed_count
UNION ALL
SELECT 
  'convocation_eligible_students',
  (SELECT COUNT(*) FROM convocation_eligible_students),
  NULL, NULL, NULL
UNION ALL
SELECT 
  'no_dues_forms',
  (SELECT COUNT(*) FROM no_dues_forms),
  (SELECT COUNT(*) FROM no_dues_forms WHERE status = 'pending'),
  (SELECT COUNT(*) FROM no_dues_forms WHERE status = 'approved'),
  (SELECT COUNT(*) FROM no_dues_forms WHERE status = 'rejected')
UNION ALL
SELECT 
  'department_approvals',
  (SELECT COUNT(*) FROM department_approvals),
  (SELECT COUNT(*) FROM department_approvals WHERE status = 'pending'),
  (SELECT COUNT(*) FROM department_approvals WHERE status = 'approved'),
  (SELECT COUNT(*) FROM department_approvals WHERE status = 'rejected')
UNION ALL
SELECT 
  'profiles (staff)',
  (SELECT COUNT(*) FROM profiles WHERE role IN ('admin', 'department', 'registrar')),
  (SELECT COUNT(*) FROM profiles WHERE role = 'department'),
  (SELECT COUNT(*) FROM profiles WHERE role = 'admin'),
  (SELECT COUNT(*) FROM profiles WHERE role = 'registrar')
UNION ALL
SELECT 
  'config_schools',
  (SELECT COUNT(*) FROM config_schools),
  (SELECT COUNT(*) FROM config_schools WHERE is_active = true),
  NULL, NULL
UNION ALL
SELECT 
  'config_courses',
  (SELECT COUNT(*) FROM config_courses),
  (SELECT COUNT(*) FROM config_courses WHERE is_active = true),
  NULL, NULL
UNION ALL
SELECT 
  'config_branches',
  (SELECT COUNT(*) FROM config_branches),
  (SELECT COUNT(*) FROM config_branches WHERE is_active = true),
  NULL, NULL;

-- =====================================================
-- 11. TEST QUERIES (Production Ready)
-- =====================================================

-- Test: Can service role insert into email_queue?
-- (This should work if RLS is configured correctly)
INSERT INTO email_queue (
  to_address,
  subject,
  html_content,
  text_content,
  status
) VALUES (
  'test@example.com',
  'Test Email',
  '<p>This is a test email</p>',
  'This is a test email',
  'pending'
) RETURNING id, created_at;

-- If above works, delete test email
DELETE FROM email_queue 
WHERE to_address = 'test@example.com' 
  AND subject = 'Test Email';

-- Test: Can we query convocation by registration number?
SELECT 
  registration_no,
  name,
  school,
  admission_year
FROM convocation_eligible_students
WHERE registration_no ILIKE '22BCAN%'
LIMIT 5;

-- Test: Can we insert a test form?
INSERT INTO no_dues_forms (
  registration_no,
  student_name,
  school_id,
  school,
  course_id,
  course,
  branch_id,
  branch,
  country_code,
  contact_no,
  personal_email,
  college_email,
  status
) VALUES (
  'TEST99999',
  'Test Student',
  (SELECT id FROM config_schools WHERE is_active = true LIMIT 1),
  (SELECT name FROM config_schools WHERE is_active = true LIMIT 1),
  (SELECT id FROM config_courses WHERE is_active = true LIMIT 1),
  (SELECT name FROM config_courses WHERE is_active = true LIMIT 1),
  (SELECT id FROM config_branches WHERE is_active = true LIMIT 1),
  (SELECT name FROM config_branches WHERE is_active = true LIMIT 1),
  '+91',
  '9876543210',
  'test@example.com',
  'test@jecrc.ac.in',
  'pending'
) RETURNING id, registration_no, created_at;

-- Delete test form
DELETE FROM no_dues_forms WHERE registration_no = 'TEST99999';

-- =====================================================
-- 12. PRODUCTION READINESS CHECKLIST
-- =====================================================

-- Run this final query to verify everything
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM email_queue) >= 0 THEN '✅'
    ELSE '❌'
  END || ' Email Queue Table' as check_1,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM convocation_eligible_students) > 3000 THEN '✅'
    ELSE '⚠️'
  END || ' Convocation Data (' || (SELECT COUNT(*) FROM convocation_eligible_students) || ' students)' as check_2,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM config_schools WHERE is_active = true) > 0 THEN '✅'
    ELSE '❌'
  END || ' Active Schools (' || (SELECT COUNT(*) FROM config_schools WHERE is_active = true) || ')' as check_3,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM config_courses WHERE is_active = true) > 0 THEN '✅'
    ELSE '❌'
  END || ' Active Courses (' || (SELECT COUNT(*) FROM config_courses WHERE is_active = true) || ')' as check_4,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM config_branches WHERE is_active = true) > 0 THEN '✅'
    ELSE '❌'
  END || ' Active Branches (' || (SELECT COUNT(*) FROM config_branches WHERE is_active = true) || ')' as check_5,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM profiles WHERE role = 'department' AND is_active = true) > 0 THEN '✅'
    ELSE '⚠️'
  END || ' Department Staff (' || (SELECT COUNT(*) FROM profiles WHERE role = 'department' AND is_active = true) || ')' as check_6;

-- Expected Output:
-- ✅ Email Queue Table
-- ✅ Convocation Data (3181 students)
-- ✅ Active Schools (13)
-- ✅ Active Courses (40+)
-- ✅ Active Branches (200+)
-- ✅ Department Staff (10+)

-- =====================================================
-- END OF VERIFICATION COMMANDS
-- =====================================================

-- NOTES:
-- - Run each section separately for better debugging
-- - If any check fails, refer to URGENT_PRODUCTION_FIXES_REQUIRED.md
-- - All ✅ means production ready
-- - Any ❌ means critical issue that must be fixed
-- - Any ⚠️ means warning but may be acceptable