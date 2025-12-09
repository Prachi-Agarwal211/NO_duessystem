-- ==============================================
-- CREATE CONFIGURATION TABLES
-- ==============================================
-- These tables store the school/course/branch data for student form dropdowns
-- Run this script FIRST before populate-config-tables.sql

-- Drop existing tables if they exist (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS config_branches CASCADE;
DROP TABLE IF EXISTS config_courses CASCADE;
DROP TABLE IF EXISTS config_schools CASCADE;
DROP TABLE IF EXISTS config_emails CASCADE;
DROP TABLE IF EXISTS config_validation_rules CASCADE;
DROP TABLE IF EXISTS config_country_codes CASCADE;

-- ==============================================
-- TABLE: config_schools
-- ==============================================
CREATE TABLE config_schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_config_schools_active ON config_schools(is_active);
CREATE INDEX idx_config_schools_order ON config_schools(display_order);

-- ==============================================
-- TABLE: config_courses
-- ==============================================
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

CREATE INDEX idx_config_courses_school ON config_courses(school_id);
CREATE INDEX idx_config_courses_active ON config_courses(is_active);
CREATE INDEX idx_config_courses_order ON config_courses(display_order);

-- ==============================================
-- TABLE: config_branches
-- ==============================================
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

CREATE INDEX idx_config_branches_course ON config_branches(course_id);
CREATE INDEX idx_config_branches_active ON config_branches(is_active);
CREATE INDEX idx_config_branches_order ON config_branches(display_order);

-- ==============================================
-- TABLE: config_emails
-- ==============================================
CREATE TABLE config_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default college email domain
INSERT INTO config_emails (key, value, description) VALUES
('college_domain', '@jecrcu.edu.in', 'College email domain for validation');

-- ==============================================
-- TABLE: config_validation_rules
-- ==============================================
CREATE TABLE config_validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL UNIQUE,
    rule_pattern TEXT NOT NULL,
    error_message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default validation rules
INSERT INTO config_validation_rules (rule_name, rule_pattern, error_message) VALUES
('registration_number', '^[0-9]{2}[A-Z]{2,4}[0-9]{3,4}$', 'Registration number must be in format: 21EJECS001'),
('phone_number', '^[0-9]{6,15}$', 'Phone number must be 6-15 digits'),
('student_name', '^[a-zA-Z\s.]{2,100}$', 'Name must contain only letters, spaces, and dots (2-100 characters)'),
('parent_name', '^[a-zA-Z\s.]{2,100}$', 'Parent name must contain only letters, spaces, and dots (2-100 characters)');

-- ==============================================
-- TABLE: config_country_codes
-- ==============================================
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

CREATE INDEX idx_config_country_codes_active ON config_country_codes(is_active);
CREATE INDEX idx_config_country_codes_order ON config_country_codes(display_order);

-- Insert common country codes
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
-- ENABLE RLS (Row Level Security)
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
-- These tables need to be publicly readable for the student form

-- config_schools policies
CREATE POLICY "Anyone can read active schools"
  ON config_schools FOR SELECT
  USING (is_active = true);

-- config_courses policies
CREATE POLICY "Anyone can read active courses"
  ON config_courses FOR SELECT
  USING (is_active = true);

-- config_branches policies
CREATE POLICY "Anyone can read active branches"
  ON config_branches FOR SELECT
  USING (is_active = true);

-- config_emails policies
CREATE POLICY "Anyone can read email config"
  ON config_emails FOR SELECT
  USING (true);

-- config_validation_rules policies
CREATE POLICY "Anyone can read active validation rules"
  ON config_validation_rules FOR SELECT
  USING (is_active = true);

-- config_country_codes policies
CREATE POLICY "Anyone can read active country codes"
  ON config_country_codes FOR SELECT
  USING (is_active = true);

-- Admin policies (for INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage schools"
  ON config_schools FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage courses"
  ON config_courses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage branches"
  ON config_branches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage email config"
  ON config_emails FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage validation rules"
  ON config_validation_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage country codes"
  ON config_country_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ==============================================
-- VERIFY TABLES CREATED
-- ==============================================
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

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================
SELECT '✅ Configuration tables created successfully!' as status;
SELECT '📝 Next step: Run populate-config-tables.sql to add school/course/branch data' as next_step;