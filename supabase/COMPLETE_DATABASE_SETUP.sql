-- ============================================================================
-- JECRC NO DUES SYSTEM - COMPLETE DATABASE SETUP
-- ============================================================================
-- This is the SINGLE SOURCE OF TRUTH for the entire database
-- Run this ONCE in Supabase SQL Editor to set up EVERYTHING
-- 
-- This script includes:
-- 1. Complete cleanup of existing database
-- 2. Core tables (profiles, departments, forms, status, audit, notifications)
-- 3. Configuration tables (schools, courses, branches, email settings)
-- 4. All indexes for performance
-- 5. All functions and triggers
-- 6. Row Level Security (RLS) policies
-- 7. Initial data seeding
-- ============================================================================

-- ============================================================================
-- SECTION 1: CLEANUP - Remove ALL existing data and objects
-- ============================================================================

-- Drop configuration tables (new)
DROP TABLE IF EXISTS public.config_country_codes CASCADE;
DROP TABLE IF EXISTS public.config_validation_rules CASCADE;
DROP TABLE IF EXISTS public.config_branches CASCADE;
DROP TABLE IF EXISTS public.config_courses CASCADE;
DROP TABLE IF EXISTS public.config_schools CASCADE;
DROP TABLE IF EXISTS public.config_emails CASCADE;

-- Drop core tables
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.no_dues_status CASCADE;
DROP TABLE IF EXISTS public.no_dues_forms CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS get_overall_stats() CASCADE;
DROP FUNCTION IF EXISTS get_form_statistics() CASCADE;
DROP FUNCTION IF EXISTS get_department_workload() CASCADE;
DROP FUNCTION IF EXISTS get_admin_summary_stats() CASCADE;
DROP FUNCTION IF EXISTS calculate_response_time(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS create_department_statuses() CASCADE;
DROP FUNCTION IF EXISTS initialize_form_status_records() CASCADE;
DROP FUNCTION IF EXISTS update_form_status_on_department_action() CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 2: CREATE CONFIGURATION TABLES (NEW)
-- ============================================================================

-- 2.1 Schools Configuration
CREATE TABLE public.config_schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Courses Configuration (linked to schools) with UG/PG/PhD levels
CREATE TABLE public.config_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.config_schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('UG', 'PG', 'PhD')),
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name)
);

-- 2.3 Branches Configuration (linked to courses)
CREATE TABLE public.config_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.config_courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, name)
);

-- 2.4 Email Configuration
CREATE TABLE public.config_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

-- 2.5 Validation Rules Configuration
CREATE TABLE public.config_validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT UNIQUE NOT NULL,
    rule_pattern TEXT NOT NULL,
    error_message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Country Codes Configuration
CREATE TABLE public.config_country_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_name TEXT NOT NULL,
    country_code TEXT NOT NULL,
    dial_code TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(country_code)
);

-- ============================================================================
-- SECTION 3: CREATE CORE TABLES
-- ============================================================================

-- 3.1 Profiles Table (Staff/Admin users with school filtering support)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('department', 'admin')),
    department_name TEXT,
    school_id UUID REFERENCES public.config_schools(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 Departments Table (11 JECRC clearance departments)
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT,
    display_order INTEGER NOT NULL,
    is_school_specific BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 No Dues Forms Table (Student submissions with NEW email fields and country code)
CREATE TABLE public.no_dues_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    registration_no TEXT UNIQUE NOT NULL,
    student_name TEXT NOT NULL,
    personal_email TEXT NOT NULL,
    college_email TEXT NOT NULL,
    session_from TEXT,
    session_to TEXT,
    parent_name TEXT,
    school_id UUID REFERENCES public.config_schools(id),
    course_id UUID REFERENCES public.config_courses(id),
    branch_id UUID REFERENCES public.config_branches(id),
    school TEXT NOT NULL,
    course TEXT,
    branch TEXT,
    country_code TEXT NOT NULL DEFAULT '+91',
    contact_no TEXT NOT NULL,
    alumni_screenshot_url TEXT,
    certificate_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_personal_email_format CHECK (personal_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT check_college_email_format CHECK (college_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- 3.4 No Dues Status Table (Individual department statuses)
CREATE TABLE public.no_dues_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.no_dues_forms(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL REFERENCES public.departments(name),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    action_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(form_id, department_name)
);

-- 3.5 Audit Log Table (Track all actions)
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    action_details JSONB,
    table_name TEXT,
    record_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.6 Notifications Table (Email tracking)
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.no_dues_forms(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL,
    email_to TEXT NOT NULL,
    email_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Configuration table indexes
CREATE INDEX idx_config_schools_active ON public.config_schools(is_active);
CREATE INDEX idx_config_courses_school ON public.config_courses(school_id);
CREATE INDEX idx_config_courses_active ON public.config_courses(is_active);
CREATE INDEX idx_config_branches_course ON public.config_branches(course_id);
CREATE INDEX idx_config_branches_active ON public.config_branches(is_active);
CREATE INDEX idx_config_validation_rules_active ON public.config_validation_rules(is_active);
CREATE INDEX idx_config_country_codes_active ON public.config_country_codes(is_active);

-- Core table indexes
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_department ON public.profiles(department_name);
CREATE INDEX idx_profiles_school ON public.profiles(school_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

CREATE INDEX idx_departments_active ON public.departments(is_active);

CREATE INDEX idx_forms_registration ON public.no_dues_forms(registration_no);
CREATE INDEX idx_forms_status ON public.no_dues_forms(status);
CREATE INDEX idx_forms_created ON public.no_dues_forms(created_at DESC);
CREATE INDEX idx_forms_personal_email ON public.no_dues_forms(personal_email);
CREATE INDEX idx_forms_college_email ON public.no_dues_forms(college_email);
CREATE INDEX idx_forms_school_id ON public.no_dues_forms(school_id);
CREATE INDEX idx_forms_course_id ON public.no_dues_forms(course_id);
CREATE INDEX idx_forms_branch_id ON public.no_dues_forms(branch_id);

CREATE INDEX idx_status_form ON public.no_dues_status(form_id);
CREATE INDEX idx_status_department ON public.no_dues_status(department_name);
CREATE INDEX idx_status_status ON public.no_dues_status(status);

CREATE INDEX idx_audit_log_created ON public.audit_log(created_at);
CREATE INDEX idx_notifications_form ON public.notifications(form_id);

-- ============================================================================
-- SECTION 5: CREATE FUNCTIONS
-- ============================================================================

-- 5.1 Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Function: Auto-create department statuses when form is submitted
CREATE OR REPLACE FUNCTION create_department_statuses()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.no_dues_status (form_id, department_name, status)
    SELECT NEW.id, name, 'pending'
    FROM public.departments
    WHERE is_active = true
    ORDER BY display_order;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.3 Function: Update form status when all departments approve
CREATE OR REPLACE FUNCTION update_form_status_on_department_action()
RETURNS TRIGGER AS $$
DECLARE
    total_depts INTEGER;
    approved_depts INTEGER;
    rejected_depts INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_depts
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id;
    
    SELECT COUNT(*) INTO approved_depts
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id AND status = 'approved';
    
    SELECT COUNT(*) INTO rejected_depts
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id AND status = 'rejected';
    
    IF rejected_depts > 0 THEN
        UPDATE public.no_dues_forms
        SET status = 'rejected'
        WHERE id = NEW.form_id;
    ELSIF approved_depts = total_depts THEN
        UPDATE public.no_dues_forms
        SET status = 'completed'
        WHERE id = NEW.form_id;
    ELSE
        UPDATE public.no_dues_forms
        SET status = 'pending'
        WHERE id = NEW.form_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.4 Function: Get form statistics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_form_statistics()
RETURNS TABLE (
    total_requests BIGINT,
    completed_requests BIGINT,
    pending_requests BIGINT,
    rejected_requests BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests
    FROM public.no_dues_forms;
END;
$$ LANGUAGE plpgsql;

-- 5.5 Function: Get department workload
CREATE OR REPLACE FUNCTION get_department_workload()
RETURNS TABLE (
    department_name TEXT,
    pending_count BIGINT,
    approved_count BIGINT,
    rejected_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        nds.department_name,
        COUNT(*) FILTER (WHERE nds.status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE nds.status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE nds.status = 'rejected') as rejected_count
    FROM public.no_dues_status nds
    GROUP BY nds.department_name
    ORDER BY nds.department_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 6: CREATE TRIGGERS
-- ============================================================================

-- Trigger: Auto-update updated_at on config_schools
CREATE TRIGGER update_config_schools_updated_at
    BEFORE UPDATE ON public.config_schools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at on config_courses
CREATE TRIGGER update_config_courses_updated_at
    BEFORE UPDATE ON public.config_courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at on config_branches
CREATE TRIGGER update_config_branches_updated_at
    BEFORE UPDATE ON public.config_branches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at on config_validation_rules
CREATE TRIGGER update_config_validation_rules_updated_at
    BEFORE UPDATE ON public.config_validation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at on config_country_codes
CREATE TRIGGER update_config_country_codes_updated_at
    BEFORE UPDATE ON public.config_country_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at on departments
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at on forms
CREATE TRIGGER update_forms_updated_at
    BEFORE UPDATE ON public.no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Create department statuses on form insert
CREATE TRIGGER trigger_create_department_statuses
    AFTER INSERT ON public.no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION create_department_statuses();

-- Trigger: Update form status on department status change
CREATE TRIGGER trigger_update_form_status
    AFTER INSERT OR UPDATE ON public.no_dues_status
    FOR EACH ROW
    EXECUTE FUNCTION update_form_status_on_department_action();

-- ============================================================================
-- SECTION 7: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.config_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_country_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_dues_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_dues_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Configuration Tables Policies (Admin only can modify, everyone can read active)
CREATE POLICY "Anyone can view active schools" ON public.config_schools
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage schools" ON public.config_schools
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Anyone can view active courses" ON public.config_courses
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage courses" ON public.config_courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Anyone can view active branches" ON public.config_branches
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage branches" ON public.config_branches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Anyone can view email config" ON public.config_emails
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage email config" ON public.config_emails
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Validation Rules Policies
CREATE POLICY "Anyone can view active validation rules" ON public.config_validation_rules
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage validation rules" ON public.config_validation_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Country Codes Policies
CREATE POLICY "Anyone can view active country codes" ON public.config_country_codes
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage country codes" ON public.config_country_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        ) OR auth.uid() = id
    );

-- Departments Policies
CREATE POLICY "Anyone can view active departments" ON public.departments
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage departments" ON public.departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Forms Policies (Public access for students to submit)
CREATE POLICY "Anyone can insert forms" ON public.no_dues_forms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view forms" ON public.no_dues_forms
    FOR SELECT USING (true);

CREATE POLICY "Staff can update forms" ON public.no_dues_forms
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('department', 'admin')
        )
    );

-- Status Policies
CREATE POLICY "Anyone can view status" ON public.no_dues_status
    FOR SELECT USING (true);

CREATE POLICY "Department staff can update own department status" ON public.no_dues_status
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (
                (role = 'department' AND department_name = no_dues_status.department_name)
                OR role = 'admin'
            )
        )
    );

CREATE POLICY "Staff can insert status" ON public.no_dues_status
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('department', 'admin')
        )
    );

-- Audit Log Policies
CREATE POLICY "Admin can view all audit logs" ON public.audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Notifications Policies
CREATE POLICY "Anyone can view notifications" ON public.notifications
    FOR SELECT USING (true);

-- ============================================================================
-- SECTION 8: SEED INITIAL DATA
-- ============================================================================

-- 8.1 Seed Schools
INSERT INTO public.config_schools (name, display_order, is_active) VALUES
    ('Engineering', 1, true),
    ('Management', 2, true),
    ('Law', 3, true);

-- 8.2 Seed Courses (WITH LEVELS: UG/PG/PhD)
-- Engineering Courses
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Engineering'),
    course,
    level,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES
    ('B.Tech', 'UG'),
    ('M.Tech', 'PG')
) AS courses(course, level);

-- Management Courses
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Management'),
    course,
    level,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES
    ('BBA', 'UG'),
    ('MBA', 'PG')
) AS courses(course, level);

-- Law Courses
INSERT INTO public.config_courses (school_id, name, level, display_order, is_active)
SELECT
    (SELECT id FROM public.config_schools WHERE name = 'Law'),
    course,
    level,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES
    ('BA LLB', 'UG'),
    ('LLB', 'UG'),
    ('LLM', 'PG')
) AS courses(course, level);

-- 8.3 Seed Branches
-- B.Tech Branches
INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'B.Tech'),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('Computer Science Engineering (CSE)'),
    ('Electronics and Communication Engineering (ECE)'),
    ('Mechanical Engineering (ME)'),
    ('Civil Engineering (CE)'),
    ('Information Technology (IT)'),
    ('Electrical Engineering (EE)')
) AS branches(branch);

-- M.Tech Branches
INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'M.Tech'),
    branch,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('Computer Science Engineering (CSE)'),
    ('Electronics and Communication Engineering (ECE)'),
    ('Mechanical Engineering (ME)')
) AS branches(branch);

-- MBA Specializations
INSERT INTO public.config_branches (course_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_courses WHERE name = 'MBA'),
    spec,
    ROW_NUMBER() OVER ()::INTEGER,
    true
FROM (VALUES 
    ('Finance'),
    ('Marketing'),
    ('Human Resources (HR)'),
    ('Operations')
) AS specs(spec);

-- 8.4 Seed Departments (11 departments with school-specific flag)
INSERT INTO public.departments (name, display_name, email, display_order, is_school_specific, is_active) VALUES
    ('school_hod', 'School (HOD/Department)', 'hod@jecrc.ac.in', 1, true, true),
    ('library', 'Library', 'library@jecrc.ac.in', 2, false, true),
    ('it_department', 'IT Department', 'it@jecrc.ac.in', 3, false, true),
    ('hostel', 'Hostel', 'hostel@jecrc.ac.in', 4, false, true),
    ('mess', 'Mess', 'mess@jecrc.ac.in', 5, false, true),
    ('canteen', 'Canteen', 'canteen@jecrc.ac.in', 6, false, true),
    ('tpo', 'TPO', 'tpo@jecrc.ac.in', 7, false, true),
    ('alumni_association', 'Alumni Association', 'alumni@jecrc.ac.in', 8, false, true),
    ('accounts_department', 'Accounts Department', 'accounts@jecrc.ac.in', 9, false, true),
    ('jic', 'JECRC Incubation Center (JIC)', 'jic@jecrc.ac.in', 10, false, true),
    ('student_council', 'Student Council', 'studentcouncil@jecrc.ac.in', 11, false, true);

-- 8.5 Seed Email Configuration
INSERT INTO public.config_emails (key, value, description) VALUES
    ('college_domain', 'jecrc.ac.in', 'College email domain for validation'),
    ('admin_email', 'admin@jecrc.ac.in', 'Admin notification email'),
    ('system_email', 'noreply@jecrc.ac.in', 'System sender email for notifications'),
    ('notifications_enabled', 'true', 'Enable/disable email notifications');

-- 8.6 Seed Validation Rules
INSERT INTO public.config_validation_rules (rule_name, rule_pattern, error_message, is_active, description) VALUES
    ('registration_number', '^[A-Z0-9]{6,15}$', 'Registration number must be 6-15 alphanumeric characters', true, 'Validates student registration number format'),
    ('student_name', '^[A-Za-z\\s.\\-'']+$', 'Name should only contain letters, spaces, dots, hyphens, and apostrophes', true, 'Validates student and parent name format'),
    ('phone_number', '^[0-9]{6,15}$', 'Phone number must be 6-15 digits', true, 'Validates contact number (without country code)'),
    ('session_year', '^\\d{4}$', 'Session year must be in YYYY format', true, 'Validates session year format');

-- 8.7 Seed Country Codes (Top 20 countries + more)
INSERT INTO public.config_country_codes (country_name, country_code, dial_code, is_active, display_order) VALUES
    ('India', 'IN', '+91', true, 1),
    ('United States', 'US', '+1', true, 2),
    ('United Kingdom', 'GB', '+44', true, 3),
    ('Canada', 'CA', '+1', true, 4),
    ('Australia', 'AU', '+61', true, 5),
    ('Germany', 'DE', '+49', true, 6),
    ('France', 'FR', '+33', true, 7),
    ('Japan', 'JP', '+81', true, 8),
    ('China', 'CN', '+86', true, 9),
    ('South Korea', 'KR', '+82', true, 10),
    ('Singapore', 'SG', '+65', true, 11),
    ('United Arab Emirates', 'AE', '+971', true, 12),
    ('Saudi Arabia', 'SA', '+966', true, 13),
    ('Malaysia', 'MY', '+60', true, 14),
    ('Thailand', 'TH', '+66', true, 15),
    ('Indonesia', 'ID', '+62', true, 16),
    ('Philippines', 'PH', '+63', true, 17),
    ('Vietnam', 'VN', '+84', true, 18),
    ('Bangladesh', 'BD', '+880', true, 19),
    ('Pakistan', 'PK', '+92', true, 20),
    ('Sri Lanka', 'LK', '+94', true, 21),
    ('Nepal', 'NP', '+977', true, 22),
    ('New Zealand', 'NZ', '+64', true, 23),
    ('South Africa', 'ZA', '+27', true, 24),
    ('Brazil', 'BR', '+55', true, 25),
    ('Mexico', 'MX', '+52', true, 26),
    ('Italy', 'IT', '+39', true, 27),
    ('Spain', 'ES', '+34', true, 28),
    ('Netherlands', 'NL', '+31', true, 29),
    ('Switzerland', 'CH', '+41', true, 30);

-- ============================================================================
-- SECTION 9: VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify setup:
-- SELECT * FROM public.config_schools ORDER BY display_order;
-- SELECT * FROM public.config_courses ORDER BY display_order;
-- SELECT * FROM public.config_branches ORDER BY display_order;
-- SELECT * FROM public.departments ORDER BY display_order;
-- SELECT * FROM public.config_emails;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Next Steps:
-- 1. Create storage buckets in Supabase:
--    - 'certificates' (for generated no-dues certificates)
--    - 'alumni-screenshots' (for alumni association proofs)
-- 2. Create admin user via Supabase Auth Dashboard
-- 3. Create department staff users via Supabase Auth Dashboard
-- 4. Add corresponding profiles in profiles table for each staff user
-- 5. Update .env.local with Supabase credentials
-- 6. Run: npm run dev
-- ============================================================================