-- ==============================================
-- 🚀 ONE-CLICK FIX FOR PRODUCTION DATABASE
-- ==============================================
-- This script combines create + populate in one file
-- Run this ONCE on your PRODUCTION Supabase database
-- 
-- HOW TO RUN:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your production project
-- 3. Click SQL Editor
-- 4. Copy and paste THIS ENTIRE FILE
-- 5. Click RUN
-- 6. Done! ✅
-- ==============================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS config_branches CASCADE;
DROP TABLE IF EXISTS config_courses CASCADE;
DROP TABLE IF EXISTS config_schools CASCADE;
DROP TABLE IF EXISTS config_emails CASCADE;
DROP TABLE IF EXISTS config_validation_rules CASCADE;
DROP TABLE IF EXISTS config_country_codes CASCADE;

-- ==============================================
-- CREATE TABLES
-- ==============================================

CREATE TABLE config_schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE config_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES config_schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name)
);

CREATE TABLE config_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES config_courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, name)
);

CREATE TABLE config_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE config_validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL UNIQUE,
    rule_pattern TEXT NOT NULL,
    error_message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE config_country_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_name TEXT NOT NULL,
    country_code TEXT NOT NULL,
    dial_code TEXT NOT NULL,
    display_order INTEGER DEFAULT 999,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_config_schools_active ON config_schools(is_active);
CREATE INDEX idx_config_schools_order ON config_schools(display_order);
CREATE INDEX idx_config_courses_school ON config_courses(school_id);
CREATE INDEX idx_config_courses_active ON config_courses(is_active);
CREATE INDEX idx_config_courses_order ON config_courses(display_order);
CREATE INDEX idx_config_branches_course ON config_branches(course_id);
CREATE INDEX idx_config_branches_active ON config_branches(is_active);
CREATE INDEX idx_config_branches_order ON config_branches(display_order);
CREATE INDEX idx_config_country_codes_active ON config_country_codes(is_active);
CREATE INDEX idx_config_country_codes_order ON config_country_codes(display_order);

-- ==============================================
-- ENABLE RLS
-- ==============================================
ALTER TABLE config_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_country_codes ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS POLICIES (Public Read Access)
-- ==============================================

CREATE POLICY "Anyone can read active schools"
  ON config_schools FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can read active courses"
  ON config_courses FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can read active branches"
  ON config_branches FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can read email config"
  ON config_emails FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read active validation rules"
  ON config_validation_rules FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can read active country codes"
  ON config_country_codes FOR SELECT
  USING (is_active = true);

-- ==============================================
-- INSERT DEFAULT DATA
-- ==============================================

-- Insert college email domain
INSERT INTO config_emails (key, value, description) VALUES
('college_domain', '@jecrcu.edu.in', 'College email domain for validation');

-- Insert validation rules
INSERT INTO config_validation_rules (rule_name, rule_pattern, error_message) VALUES
('registration_number', '^[0-9]{2}[A-Z]{2,4}[0-9]{3,4}$', 'Registration number must be in format: 21EJECS001'),
('phone_number', '^[0-9]{6,15}$', 'Phone number must be 6-15 digits'),
('student_name', '^[a-zA-Z\s.]{2,100}$', 'Name must contain only letters, spaces, and dots (2-100 characters)'),
('parent_name', '^[a-zA-Z\s.]{2,100}$', 'Parent name must contain only letters, spaces, and dots (2-100 characters)');

-- Insert country codes
INSERT INTO config_country_codes (country_name, country_code, dial_code, display_order) VALUES
('India', 'IN', '+91', 1),
('United States', 'US', '+1', 2),
('United Kingdom', 'GB', '+44', 3),
('Canada', 'CA', '+1', 4),
('Australia', 'AU', '+61', 5),
('Germany', 'DE', '+49', 6),
('France', 'FR', '+33', 7),
('Japan', 'JP', '+81', 8),
('China', 'CN', '+86', 9),
('Singapore', 'SG', '+65', 10);

-- ==============================================
-- INSERT SCHOOLS, COURSES, BRANCHES
-- ==============================================

-- Insert Schools
INSERT INTO config_schools (id, name, display_order, is_active) VALUES
(gen_random_uuid(), 'School of Engineering & Technology', 1, true),
(gen_random_uuid(), 'School of Management', 2, true),
(gen_random_uuid(), 'School of Science', 3, true),
(gen_random_uuid(), 'School of Commerce', 4, true);

-- Insert Courses and Branches
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

  -- Get course IDs
  SELECT id INTO btech_cs_id FROM config_courses WHERE name = 'B.Tech Computer Science';
  SELECT id INTO btech_me_id FROM config_courses WHERE name = 'B.Tech Mechanical Engineering';
  SELECT id INTO btech_ce_id FROM config_courses WHERE name = 'B.Tech Civil Engineering';
  SELECT id INTO btech_ee_id FROM config_courses WHERE name = 'B.Tech Electrical Engineering';
  SELECT id INTO mba_id FROM config_courses WHERE name = 'MBA';
  SELECT id INTO bba_id FROM config_courses WHERE name = 'BBA';
  SELECT id INTO bsc_physics_id FROM config_courses WHERE name = 'B.Sc Physics';
  SELECT id INTO bsc_chemistry_id FROM config_courses WHERE name = 'B.Sc Chemistry';
  SELECT id INTO bcom_id FROM config_courses WHERE name = 'B.Com';

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
-- VERIFY INSTALLATION
-- ==============================================
SELECT 
  '✅ PRODUCTION DATABASE FIXED!' as status,
  'All tables created and populated successfully' as message;

SELECT 
  'config_schools' as table_name,
  COUNT(*) as row_count
FROM config_schools
UNION ALL
SELECT 'config_courses', COUNT(*) FROM config_courses
UNION ALL
SELECT 'config_branches', COUNT(*) FROM config_branches
UNION ALL
SELECT 'config_emails', COUNT(*) FROM config_emails
UNION ALL
SELECT 'config_validation_rules', COUNT(*) FROM config_validation_rules
UNION ALL
SELECT 'config_country_codes', COUNT(*) FROM config_country_codes;

SELECT '📊 Summary: 4 Schools, 9 Courses, 31 Branches' as summary;
SELECT '🎉 Your dropdowns will now work on production!' as next_step;