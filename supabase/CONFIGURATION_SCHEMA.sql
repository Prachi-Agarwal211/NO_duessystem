
-- ============================================================================
-- JECRC NO DUES SYSTEM - CONFIGURATION SCHEMA
-- ============================================================================
-- This file adds configuration tables for dynamic form management
-- Run this AFTER MASTER_SCHEMA.sql to add configuration capabilities
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE CONFIGURATION TABLES
-- ============================================================================

-- 1.1 Schools Configuration Table
CREATE TABLE IF NOT EXISTS public.config_schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Courses Configuration Table (linked to schools)
CREATE TABLE IF NOT EXISTS public.config_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.config_schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name)
);

-- 1.3 Branches Configuration Table (linked to courses)
CREATE TABLE IF NOT EXISTS public.config_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.config_courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, name)
);

-- 1.4 Email Configuration Table
CREATE TABLE IF NOT EXISTS public.config_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

-- ============================================================================
-- SECTION 2: MODIFY EXISTING no_dues_forms TABLE
-- ============================================================================

-- Add new columns to no_dues_forms
ALTER TABLE public.no_dues_forms 
ADD COLUMN IF NOT EXISTS personal_email TEXT,
ADD COLUMN IF NOT EXISTS college_email TEXT,
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.config_schools(id),
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.config_courses(id),
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.config_branches(id);

-- Add email format validation constraints
ALTER TABLE public.no_dues_forms
DROP CONSTRAINT IF EXISTS check_personal_email_format;

ALTER TABLE public.no_dues_forms
ADD CONSTRAINT check_personal_email_format 
CHECK (personal_email IS NULL OR personal_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

ALTER TABLE public.no_dues_forms
DROP CONSTRAINT IF EXISTS check_college_email_format;

ALTER TABLE public.no_dues_forms
ADD CONSTRAINT check_college_email_format 
CHECK (college_email IS NULL OR college_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

-- ============================================================================
-- SECTION 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_config_schools_active ON public.config_schools(is_active);
CREATE INDEX IF NOT EXISTS idx_config_schools_order ON public.config_schools(display_order);

CREATE INDEX IF NOT EXISTS idx_config_courses_school ON public.config_courses(school_id);
CREATE INDEX IF NOT EXISTS idx_config_courses_active ON public.config_courses(is_active);
CREATE INDEX IF NOT EXISTS idx_config_courses_order ON public.config_courses(display_order);

CREATE INDEX IF NOT EXISTS idx_config_branches_course ON public.config_branches(course_id);
CREATE INDEX IF NOT EXISTS idx_config_branches_active ON public.config_branches(is_active);
CREATE INDEX IF NOT EXISTS idx_config_branches_order ON public.config_branches(display_order);

CREATE INDEX IF NOT EXISTS idx_forms_personal_email ON public.no_dues_forms(personal_email);
CREATE INDEX IF NOT EXISTS idx_forms_college_email ON public.no_dues_forms(college_email);
CREATE INDEX IF NOT EXISTS idx_forms_school_id ON public.no_dues_forms(school_id);
CREATE INDEX IF NOT EXISTS idx_forms_course_id ON public.no_dues_forms(course_id);
CREATE INDEX IF NOT EXISTS idx_forms_branch_id ON public.no_dues_forms(branch_id);

-- ============================================================================
-- SECTION 4: CREATE TRIGGERS
-- ============================================================================

-- Trigger: Auto-update updated_at on config_schools
CREATE OR REPLACE TRIGGER update_config_schools_updated_at
    BEFORE UPDATE ON public.config_schools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at on config_courses
CREATE OR REPLACE TRIGGER update_config_courses_updated_at
    BEFORE UPDATE ON public.config_courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at on config_branches
CREATE OR REPLACE TRIGGER update_config_branches_updated_at
    BEFORE UPDATE ON public.config_branches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on configuration tables
ALTER TABLE public.config_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_emails ENABLE ROW LEVEL SECURITY;

-- Public read access to active configurations (for student form)
CREATE POLICY "Anyone can view active schools" ON public.config_schools
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active courses" ON public.config_courses
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active branches" ON public.config_branches
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view email config" ON public.config_emails
    FOR SELECT USING (true);

-- Admin full access to configurations
CREATE POLICY "Admin can manage schools" ON public.config_schools
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admin can manage courses" ON public.config_courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admin can manage branches" ON public.config_branches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admin can manage emails" ON public.config_emails
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- SECTION 6: SEED INITIAL CONFIGURATION DATA
-- ============================================================================

-- Insert default schools
INSERT INTO public.config_schools (name, display_order, is_active) VALUES
    ('Engineering', 1, true),
    ('Management', 2, true),
    ('Law', 3, true)
ON CONFLICT (name) DO NOTHING;

-- Insert default courses for Engineering
INSERT INTO public.config_courses (school_id, name, display_order, is_active)
SELECT 
    (SELECT id FROM public.config_schools WHERE name = 'Engineering'),
    course, 
    display_order,
    true
