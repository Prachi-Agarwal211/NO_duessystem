-- ============================================================================
-- JECRC NO DUES SYSTEM - COMPLETE DATABASE SETUP (FINAL DEFINITIVE VERSION)
-- ============================================================================
-- This script provides a CLEAN SLATE with 100% alignment to the codebase.
-- Includes automation triggers for the approval workflow.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 0. CLEANUP EXISTING TABLES (IN REVERSE DEPENDENCY ORDER)
-- ============================================================================
DROP TABLE IF EXISTS public.certificate_verifications CASCADE;
DROP TABLE IF EXISTS public.email_logs CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.no_dues_status CASCADE;
DROP TABLE IF EXISTS public.no_dues_forms CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.config_branches CASCADE;
DROP TABLE IF EXISTS public.config_courses CASCADE;
DROP TABLE IF EXISTS public.config_schools CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.config_emails CASCADE;
DROP TABLE IF EXISTS public.config_validation_rules CASCADE;
DROP TABLE IF EXISTS public.config_country_codes CASCADE;

-- ============================================================================
-- 1. CONFIGURATION TABLES
-- ============================================================================

-- Schools
CREATE TABLE public.config_schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses
CREATE TABLE public.config_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.config_schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name)
);

-- Branches
CREATE TABLE public.config_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.config_courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, name)
);

-- Departments (Aligned with system-critical settings)
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- Code name (e.g., 'school_hod', 'library')
    display_name TEXT,         -- Friendly name for UI
    email TEXT,
    is_school_specific BOOLEAN DEFAULT false, -- If true, staff sees only their school
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Configurations
CREATE TABLE public.config_emails (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation Rules
CREATE TABLE public.config_validation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    pattern TEXT NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Country Codes
CREATE TABLE public.config_country_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_name TEXT NOT NULL,
    country_code TEXT NOT NULL UNIQUE,
    dial_code TEXT NOT NULL,
    flag_emoji TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. USER & PROFILE TABLES
-- ============================================================================

-- User Profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    registration_no TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    department_name TEXT,
    assigned_department_ids UUID[] DEFAULT NULL,
    school_id UUID REFERENCES public.config_schools(id),
    school_ids UUID[] DEFAULT NULL,
    course_ids UUID[] DEFAULT NULL,
    branch_ids UUID[] DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. CORE WORKFLOW TABLES
-- ============================================================================

-- No Dues Forms (Submissions)
CREATE TABLE public.no_dues_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID CONSTRAINT no_dues_forms_user_id_fkey REFERENCES public.profiles(id) ON DELETE SET NULL,
    registration_no TEXT NOT NULL UNIQUE,
    student_name TEXT NOT NULL,
    admission_year TEXT,
    passing_year TEXT,
    parent_name TEXT,
    school_id UUID REFERENCES public.config_schools(id),
    school TEXT,
    course_id UUID REFERENCES public.config_courses(id),
    course TEXT,
    branch_id UUID REFERENCES public.config_branches(id),
    branch TEXT,
    country_code TEXT,
    contact_no TEXT,
    personal_email TEXT,
    college_email TEXT,
    email TEXT,
    alumni_screenshot_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    
    -- Reapplication fields
    reapplication_of UUID REFERENCES public.no_dues_forms(id),
    reapplication_count INTEGER DEFAULT 0,
    last_reapplied_at TIMESTAMPTZ,
    student_reply_message TEXT,
    
    -- Cascade Rejection field
    rejection_context JSONB DEFAULT NULL,
    rejection_reason TEXT,
    
    -- Certificate fields
    final_certificate_generated BOOLEAN DEFAULT false,
    certificate_url TEXT,
    blockchain_hash TEXT,
    blockchain_tx TEXT,
    blockchain_block BIGINT,
    blockchain_timestamp TIMESTAMPTZ,
    blockchain_verified BOOLEAN DEFAULT false,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Department Approval Status
CREATE TABLE public.no_dues_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES public.no_dues_forms(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    action_by_user_id UUID REFERENCES public.profiles(id),
    action_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(form_id, department_name)
);

-- ============================================================================
-- 4. AUTOMATION TRIGGERS (CRITICAL FOR WORKFLOW)
-- ============================================================================

-- Function: Initialize status rows for all departments when a form is submitted
CREATE OR REPLACE FUNCTION public.handle_new_submission()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.no_dues_status (form_id, department_name, status)
    SELECT NEW.id, name, 'pending'
    FROM public.departments
    WHERE is_active = true;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_form_submission
    AFTER INSERT ON public.no_dues_forms
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_submission();

-- Function: Update the aggregate form status based on individual department actions
CREATE OR REPLACE FUNCTION public.update_form_status()
RETURNS TRIGGER AS $$
DECLARE
    total_depts INTEGER;
    approved_depts INTEGER;
    rejected_depts INTEGER;
BEGIN
    -- Count rows in no_dues_status for this form
    SELECT COUNT(*) INTO total_depts FROM public.no_dues_status WHERE form_id = NEW.form_id;
    SELECT COUNT(*) INTO approved_depts FROM public.no_dues_status WHERE form_id = NEW.form_id AND status = 'approved';
    SELECT COUNT(*) INTO rejected_depts FROM public.no_dues_status WHERE form_id = NEW.form_id AND status = 'rejected';

    IF rejected_depts > 0 THEN
        UPDATE public.no_dues_forms SET status = 'rejected' WHERE id = NEW.form_id;
    ELSIF approved_depts = total_depts AND total_depts > 0 THEN
        UPDATE public.no_dues_forms SET status = 'completed' WHERE id = NEW.form_id;
    ELSIF approved_depts > 0 THEN
        UPDATE public.no_dues_forms SET status = 'in_progress' WHERE id = NEW.form_id;
    ELSE
        UPDATE public.no_dues_forms SET status = 'pending' WHERE id = NEW.form_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_status_update
    AFTER UPDATE ON public.no_dues_status
    FOR EACH ROW EXECUTE FUNCTION public.update_form_status();

-- ============================================================================
-- 5. UTILITY & AUDIT TABLES
-- ============================================================================

-- Certificate Verifications
CREATE TABLE public.certificate_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES public.no_dues_forms(id) ON DELETE CASCADE,
    registration_no TEXT NOT NULL,
    student_name TEXT NOT NULL,
    verifier_email TEXT,
    verification_type TEXT DEFAULT 'public',
    status TEXT DEFAULT 'success',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Logs
CREATE TABLE public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Tickets
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT UNIQUE,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_type TEXT,
    requester_type TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'other',
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    assigned_to UUID REFERENCES public.profiles(id),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.config_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_dues_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_dues_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Config tables
CREATE POLICY "Public read config_schools" ON public.config_schools FOR SELECT USING (true);
CREATE POLICY "Admin manage config_schools" ON public.config_schools FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public read config_courses" ON public.config_courses FOR SELECT USING (true);
CREATE POLICY "Admin manage config_courses" ON public.config_courses FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public read config_branches" ON public.config_branches FOR SELECT USING (true);
CREATE POLICY "Admin manage config_branches" ON public.config_branches FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public read departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Admin manage departments" ON public.departments FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Profiles
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admin can manage all profiles" ON public.profiles FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- No Dues Forms
CREATE POLICY "Students can create forms" ON public.no_dues_forms FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can read own forms" ON public.no_dues_forms FOR SELECT USING (user_id = auth.uid() OR registration_no IN (SELECT registration_no FROM public.no_dues_forms WHERE user_id = auth.uid()));
CREATE POLICY "Staff/Admin read all forms" ON public.no_dues_forms FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'department')));
CREATE POLICY "Admin manage all forms" ON public.no_dues_forms FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- No Dues Status
CREATE POLICY "Public read status" ON public.no_dues_status FOR SELECT USING (true);
CREATE POLICY "Staff manage own department status" ON public.no_dues_status FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'department'));

-- ============================================================================
-- 7. INDEXES
-- ============================================================================

CREATE INDEX idx_forms_regno ON public.no_dues_forms(registration_no);
CREATE INDEX idx_forms_status ON public.no_dues_forms(status);
CREATE INDEX idx_status_form ON public.no_dues_status(form_id);
CREATE INDEX idx_status_dept ON public.no_dues_status(department_name);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_dept ON public.profiles(department_name);

-- ============================================================================
-- 8. INITIAL SEED DATA (CRITICAL)
-- ============================================================================

-- Departments
INSERT INTO public.departments (name, display_name, is_school_specific, email, display_order) VALUES
('school_hod', 'School HOD / Dean', true, 'hod@jecrcu.edu.in', 1),
('library', 'Library', false, 'library@jecrcu.edu.in', 2),
('it_department', 'IT Department', false, 'it@jecrcu.edu.in', 3),
('hostel', 'Hostel / Warden', false, 'hostel@jecrcu.edu.in', 4),
('accounts_department', 'Accounts Department', false, 'accounts@jecrcu.edu.in', 5),
('registrar', 'Registrar Office', false, 'registrar@jecrcu.edu.in', 6),
('alumni_association', 'Alumni Association', false, 'alumni@jecrcu.edu.in', 7);

-- Country Codes
INSERT INTO public.config_country_codes (country_name, country_code, dial_code, flag_emoji, display_order) VALUES
('India', 'IN', '+91', '🇮🇳', 1),
('United States', 'US', '+1', '🇺🇸', 2);

-- Email Config
INSERT INTO public.config_emails (key, value, description) VALUES
('college_domain', 'jecrcu.edu.in', 'Allowed email domain for students'),
('system_email', 'noreply@jecrcu.edu.in', 'System sender email'),
('notifications_enabled', 'true', 'Master switch for emails');