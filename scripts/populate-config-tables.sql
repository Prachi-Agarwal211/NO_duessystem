-- ==============================================
-- POPULATE CONFIGURATION TABLES FOR DROPDOWNS
-- ==============================================
-- This script populates the config tables needed for the student form dropdowns

-- Clear existing config data
DELETE FROM config_branches;
DELETE FROM config_courses;
DELETE FROM config_schools;

-- ==============================================
-- INSERT SCHOOLS
-- ==============================================
INSERT INTO config_schools (id, name, display_order, is_active) VALUES
(gen_random_uuid(), 'School of Engineering & Technology', 1, true),
(gen_random_uuid(), 'School of Management', 2, true),
(gen_random_uuid(), 'School of Science', 3, true),
(gen_random_uuid(), 'School of Commerce', 4, true);

-- ==============================================
-- INSERT COURSES (linked to schools)
-- ==============================================

-- Get school IDs for reference
DO $$
DECLARE
  engineering_school_id UUID;
  management_school_id UUID;
  science_school_id UUID;
  commerce_school_id UUID;
  btech_cs_id UUID;
  btech_me_id UUID;
  btech_ce_id UUID;
  btech_ee_id UUID;
  mba_id UUID;
  bba_id UUID;
  bsc_physics_id UUID;
  bsc_chemistry_id UUID;
  bcom_id UUID;
BEGIN
  -- Get school IDs
  SELECT id INTO engineering_school_id FROM config_schools WHERE name = 'School of Engineering & Technology';
  SELECT id INTO management_school_id FROM config_schools WHERE name = 'School of Management';
  SELECT id INTO science_school_id FROM config_schools WHERE name = 'School of Science';
  SELECT id INTO commerce_school_id FROM config_schools WHERE name = 'School of Commerce';

  -- Engineering Courses
  INSERT INTO config_courses (id, school_id, name, display_order, is_active) VALUES
  (gen_random_uuid(), engineering_school_id, 'B.Tech Computer Science', 1, true),
  (gen_random_uuid(), engineering_school_id, 'B.Tech Mechanical Engineering', 2, true),
  (gen_random_uuid(), engineering_school_id, 'B.Tech Civil Engineering', 3, true),
  (gen_random_uuid(), engineering_school_id, 'B.Tech Electrical Engineering', 4, true);

  -- Management Courses
  INSERT INTO config_courses (id, school_id, name, display_order, is_active) VALUES
  (gen_random_uuid(), management_school_id, 'MBA', 1, true),
  (gen_random_uuid(), management_school_id, 'BBA', 2, true);

  -- Science Courses
  INSERT INTO config_courses (id, school_id, name, display_order, is_active) VALUES
  (gen_random_uuid(), science_school_id, 'B.Sc Physics', 1, true),
  (gen_random_uuid(), science_school_id, 'B.Sc Chemistry', 2, true);

  -- Commerce Courses
  INSERT INTO config_courses (id, school_id, name, display_order, is_active) VALUES
  (gen_random_uuid(), commerce_school_id, 'B.Com', 1, true);

  -- Get course IDs for branches
  SELECT id INTO btech_cs_id FROM config_courses WHERE name = 'B.Tech Computer Science';
  SELECT id INTO btech_me_id FROM config_courses WHERE name = 'B.Tech Mechanical Engineering';
  SELECT id INTO btech_ce_id FROM config_courses WHERE name = 'B.Tech Civil Engineering';
  SELECT id INTO btech_ee_id FROM config_courses WHERE name = 'B.Tech Electrical Engineering';
  SELECT id INTO mba_id FROM config_courses WHERE name = 'MBA';
  SELECT id INTO bba_id FROM config_courses WHERE name = 'BBA';
  SELECT id INTO bsc_physics_id FROM config_courses WHERE name = 'B.Sc Physics';
  SELECT id INTO bsc_chemistry_id FROM config_courses WHERE name = 'B.Sc Chemistry';
  SELECT id INTO bcom_id FROM config_courses WHERE name = 'B.Com';

  -- ==============================================
  -- INSERT BRANCHES (linked to courses)
  -- ==============================================

  -- B.Tech CS Branches
  INSERT INTO config_branches (id, course_id, name, display_order, is_active) VALUES
  (gen_random_uuid(), btech_cs_id, 'First Year', 1, true),
  (gen_random_uuid(), btech_cs_id, 'Second Year', 2, true),
  (gen_random_uuid(), btech_cs_id, 'Third Year', 3, true),
  (gen_random_uuid(), btech_cs_id, 'Fourth Year', 4, true);

  -- B.Tech ME Branches
  INSERT INTO config_branches (id, course_id, name, display_order, is_active) VALUES
  (gen_random_uuid(), btech_me_id, 'First Year', 1, true),
  (gen_random_uuid(), btech_me_id, 'Second Year', 2, true),
  (gen_random_uuid(), btech_me_id, 'Third Year', 3, true),
  (gen_random_uuid(), btech_me_id, 'Fourth Year', 4, true);

  -- B.Tech CE Branches
  INSERT INTO config_branches (id, course_id, name, display_order, is_active) VALUES
  (gen_random_uuid(), btech_ce_id, 'First Year', 1, true),
  (gen_random_uuid(), btech_ce_id, 'Second Year', 2, true),
  (gen_random_uuid(), btech_ce_id, 'Third Year', 3, true),
  (gen_random_uuid(), btech_ce_id, 'Fourth Year', 4, true);

  -- B.Tech EE Branches
  INSERT INTO config_branches (id, course_id, name, display_order, is_active) VALUES
  (gen_random_uuid(), btech_ee_id, 'First Year', 1, true),
  (gen_random_uuid(), btech_ee_id, 'Second Year', 2, true),
  (gen_random_uuid(), btech_ee_id, 'Third Year', 3, true),
  (gen_random_uuid(), btech_ee_id, 'Fourth Year', 4, true);

  -- MBA Branches
  INSERT INTO config_branches (id, course_id, name, display_order, is_active) VALUES
  (gen_random_uuid(), mba_id, 'First Year', 1, true),
  (gen_random_uuid(), mba_id, 'Second Year', 2, true);

  -- BBA Branches
  INSERT INTO config_branches (id, course_id, name, display_order, is_active) VALUES
  (gen_random_uuid(), bba_id, 'First Year', 1, true),
  (gen_random_uuid(), bba_id, 'Second Year', 2, true),
  (gen_random_uuid(), bba_id, 'Third Year', 3, true);

  -- B.Sc Physics Branches
  INSERT INTO config_branches (id, course_id, name, display_order, is_active) VALUES
  (gen_random_uuid(), bsc_physics_id, 'First Year', 1, true),
  (gen_random_uuid(), bsc_physics_id, 'Second Year', 2, true),
  (gen_random_uuid(), bsc_physics_id, 'Third Year', 3, true);

  -- B.Sc Chemistry Branches
  INSERT INTO config_branches (id, course_id, name, display_order, is_active) VALUES
  (gen_random_uuid(), bsc_chemistry_id, 'First Year', 1, true),
  (gen_random_uuid(), bsc_chemistry_id, 'Second Year', 2, true),
  (gen_random_uuid(), bsc_chemistry_id, 'Third Year', 3, true);

  -- B.Com Branches
  INSERT INTO config_branches (id, course_id, name, display_order, is_active) VALUES
  (gen_random_uuid(), bcom_id, 'First Year', 1, true),
  (gen_random_uuid(), bcom_id, 'Second Year', 2, true),
  (gen_random_uuid(), bcom_id, 'Third Year', 3, true);

END $$;

-- ==============================================
-- VERIFY DATA
-- ==============================================
SELECT 'Schools' as entity, COUNT(*) as count FROM config_schools
UNION ALL
SELECT 'Courses', COUNT(*) FROM config_courses
UNION ALL
SELECT 'Branches', COUNT(*) FROM config_branches;

SELECT
  s.name as school,
  c.name as course,
  COUNT(b.id) as branch_count
FROM config_schools s
LEFT JOIN config_courses c ON c.school_id = s.id
LEFT JOIN config_branches b ON b.course_id = c.id
GROUP BY s.name, s.display_order, c.name, c.display_order
ORDER BY s.display_order, c.display_order;

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================
SELECT '✅ Configuration tables populated successfully!' as status;
SELECT '📊 Schools: 4, Courses: 9, Branches: 31' as summary;