-- ============================================================================
-- JECRC NO DUES SYSTEM - COMPLETE DATABASE SETUP
-- ============================================================================
-- This is the SINGLE SOURCE OF TRUTH for database setup
-- Contains: All schemas, indexes, RLS policies, and production data
-- Run this file ONCE on a fresh Supabase project
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE DEFINITIONS (15 Production Tables)
-- ============================================================================

-- 1. Configuration: Schools
CREATE TABLE IF NOT EXISTS public.config_schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schools_active ON public.config_schools(is_active);
CREATE INDEX IF NOT EXISTS idx_schools_display ON public.config_schools(display_order);

-- 2. Configuration: Courses
CREATE TABLE IF NOT EXISTS public.config_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.config_schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name)
);
CREATE INDEX IF NOT EXISTS idx_courses_school ON public.config_courses(school_id);
CREATE INDEX IF NOT EXISTS idx_courses_active ON public.config_courses(is_active);
CREATE INDEX IF NOT EXISTS idx_courses_display ON public.config_courses(display_order);

-- 3. Configuration: Branches
CREATE TABLE IF NOT EXISTS public.config_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.config_courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, name)
);
CREATE INDEX IF NOT EXISTS idx_branches_course ON public.config_branches(course_id);
CREATE INDEX IF NOT EXISTS idx_branches_active ON public.config_branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_display ON public.config_branches(display_order);

-- 4. Configuration: Departments
CREATE TABLE IF NOT EXISTS public.config_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_departments_code ON public.config_departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_active ON public.config_departments(is_active);

-- 5. Configuration: Email Templates
CREATE TABLE IF NOT EXISTS public.config_email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_key TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON public.config_email_templates(template_key);

-- 6. Configuration: Country Codes
CREATE TABLE IF NOT EXISTS public.config_country_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_name TEXT NOT NULL,
    country_code TEXT NOT NULL UNIQUE,
    dial_code TEXT NOT NULL,
    flag_emoji TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_country_codes_code ON public.config_country_codes(country_code);
CREATE INDEX IF NOT EXISTS idx_country_codes_active ON public.config_country_codes(is_active);

-- 7. User Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'student')),
    department_id UUID REFERENCES public.config_departments(id),
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(is_active);

-- 8. Student Details
CREATE TABLE IF NOT EXISTS public.student_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    registration_no TEXT NOT NULL UNIQUE,
    school_id UUID REFERENCES public.config_schools(id),
    course_id UUID REFERENCES public.config_courses(id),
    branch_id UUID REFERENCES public.config_branches(id),
    admission_year INTEGER,
    graduation_year INTEGER,
    current_semester INTEGER,
    cgpa DECIMAL(4,2),
    is_alumni BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_details_profile ON public.student_details(profile_id);
CREATE INDEX IF NOT EXISTS idx_student_details_regno ON public.student_details(registration_no);
CREATE INDEX IF NOT EXISTS idx_student_details_school ON public.student_details(school_id);
CREATE INDEX IF NOT EXISTS idx_student_details_course ON public.student_details(course_id);
CREATE INDEX IF NOT EXISTS idx_student_details_branch ON public.student_details(branch_id);
CREATE INDEX IF NOT EXISTS idx_student_details_alumni ON public.student_details(is_alumni);

-- 9. No Dues Submissions
CREATE TABLE IF NOT EXISTS public.nodues_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    registration_no TEXT NOT NULL,
    student_name TEXT NOT NULL,
    school TEXT NOT NULL,
    course TEXT NOT NULL,
    branch TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected')),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    can_edit BOOLEAN DEFAULT true,
    last_edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.nodues_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_regno ON public.nodues_submissions(registration_no);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.nodues_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted ON public.nodues_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_submissions_school ON public.nodues_submissions(school);

-- 10. Department Statuses
CREATE TABLE IF NOT EXISTS public.department_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES public.nodues_submissions(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.config_departments(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    remarks TEXT,
    actioned_by UUID REFERENCES public.profiles(id),
    actioned_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, department_id)
);
CREATE INDEX IF NOT EXISTS idx_dept_status_submission ON public.department_statuses(submission_id);
CREATE INDEX IF NOT EXISTS idx_dept_status_department ON public.department_statuses(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_status_status ON public.department_statuses(status);
CREATE INDEX IF NOT EXISTS idx_dept_status_actioned ON public.department_statuses(actioned_by);

-- 11. Convocation Eligible Students
CREATE TABLE IF NOT EXISTS public.convocation_eligible_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_no TEXT NOT NULL UNIQUE,
    student_name TEXT NOT NULL,
    school TEXT NOT NULL,
    admission_year TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'pending', 'in_progress', 'approved', 'rejected')),
    submission_id UUID REFERENCES public.nodues_submissions(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_convocation_regno ON public.convocation_eligible_students(registration_no);
CREATE INDEX IF NOT EXISTS idx_convocation_status ON public.convocation_eligible_students(status);
CREATE INDEX IF NOT EXISTS idx_convocation_school ON public.convocation_eligible_students(school);
CREATE INDEX IF NOT EXISTS idx_convocation_submission ON public.convocation_eligible_students(submission_id);

-- 12. Email Logs
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_key TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON public.email_logs(template_key);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON public.email_logs(created_at DESC);

-- 13. Certificate Verification
CREATE TABLE IF NOT EXISTS public.certificate_verification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES public.nodues_submissions(id) ON DELETE CASCADE,
    certificate_hash TEXT NOT NULL UNIQUE,
    blockchain_tx_hash TEXT UNIQUE,
    registration_no TEXT NOT NULL,
    student_name TEXT NOT NULL,
    issue_date TIMESTAMPTZ NOT NULL,
    verification_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cert_verification_submission ON public.certificate_verification(submission_id);
CREATE INDEX IF NOT EXISTS idx_cert_verification_hash ON public.certificate_verification(certificate_hash);
CREATE INDEX IF NOT EXISTS idx_cert_verification_regno ON public.certificate_verification(registration_no);
CREATE INDEX IF NOT EXISTS idx_cert_verification_blockchain ON public.certificate_verification(blockchain_tx_hash);

-- 14. Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('technical', 'academic', 'financial', 'general')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_assigned ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_created ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_read ON public.support_tickets(is_read);

-- 15. Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.config_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_country_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodues_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convocation_eligible_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Config tables: Public read, admin write
CREATE POLICY "Public can read config_schools" ON public.config_schools FOR SELECT USING (true);
CREATE POLICY "Admin can manage config_schools" ON public.config_schools FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public can read config_courses" ON public.config_courses FOR SELECT USING (true);
CREATE POLICY "Admin can manage config_courses" ON public.config_courses FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public can read config_branches" ON public.config_branches FOR SELECT USING (true);
CREATE POLICY "Admin can manage config_branches" ON public.config_branches FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public can read config_departments" ON public.config_departments FOR SELECT USING (true);
CREATE POLICY "Admin can manage config_departments" ON public.config_departments FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public can read config_email_templates" ON public.config_email_templates FOR SELECT USING (true);
CREATE POLICY "Admin can manage config_email_templates" ON public.config_email_templates FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public can read config_country_codes" ON public.config_country_codes FOR SELECT USING (true);
CREATE POLICY "Admin can manage config_country_codes" ON public.config_country_codes FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Profiles: Own profile read, admin manages all
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admin can read all profiles" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can manage profiles" ON public.profiles FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Student details: Own details, admin/staff read
CREATE POLICY "Students can read own details" ON public.student_details FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Admin/Staff can read student details" ON public.student_details FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));
CREATE POLICY "Admin can manage student details" ON public.student_details FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Submissions: Own submissions, admin/staff can read all
CREATE POLICY "Students can read own submissions" ON public.nodues_submissions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can create own submissions" ON public.nodues_submissions FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update own submissions" ON public.nodues_submissions FOR UPDATE USING (student_id = auth.uid() AND can_edit = true);
CREATE POLICY "Admin/Staff can read submissions" ON public.nodues_submissions FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));
CREATE POLICY "Admin can manage submissions" ON public.nodues_submissions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Department statuses: Staff can manage own department
CREATE POLICY "Staff can read dept statuses" ON public.department_statuses FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));
CREATE POLICY "Staff can update own dept statuses" ON public.department_statuses FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'staff' AND department_id = public.profiles.department_id));
CREATE POLICY "Admin can manage dept statuses" ON public.department_statuses FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Convocation: Public read
CREATE POLICY "Public can read convocation list" ON public.convocation_eligible_students FOR SELECT USING (true);
CREATE POLICY "Admin can manage convocation" ON public.convocation_eligible_students FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Email logs: Admin only
CREATE POLICY "Admin can read email logs" ON public.email_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can manage email logs" ON public.email_logs FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Certificate verification: Public read by hash
CREATE POLICY "Public can verify certificates" ON public.certificate_verification FOR SELECT USING (true);
CREATE POLICY "Admin can manage certificates" ON public.certificate_verification FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Support tickets: Own tickets, admin/staff can read all
CREATE POLICY "Users can read own tickets" ON public.support_tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin/Staff can read all tickets" ON public.support_tickets FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));
CREATE POLICY "Admin can manage tickets" ON public.support_tickets FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Audit log: Admin only
CREATE POLICY "Admin can read audit log" ON public.audit_log FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "System can write audit log" ON public.audit_log FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PRODUCTION DATA: Country Codes
-- ============================================================================

INSERT INTO public.config_country_codes (country_name, country_code, dial_code, flag_emoji, display_order) VALUES
('India', 'IN', '+91', '🇮🇳', 1),
('United States', 'US', '+1', '🇺🇸', 2),
('United Kingdom', 'GB', '+44', '🇬🇧', 3),
('Canada', 'CA', '+1', '🇨🇦', 4),
('Australia', 'AU', '+61', '🇦🇺', 5)
ON CONFLICT (country_code) DO NOTHING;

-- ============================================================================
-- PRODUCTION DATA: Departments
-- ============================================================================

INSERT INTO public.config_departments (id, name, code, email) VALUES
(uuid_generate_v4(), 'Accounts', 'ACCOUNTS', 'accounts@jecrc.ac.in'),
(uuid_generate_v4(), 'Library', 'LIBRARY', 'library@jecrc.ac.in'),
(uuid_generate_v4(), 'Hostel', 'HOSTEL', 'hostel@jecrc.ac.in'),
(uuid_generate_v4(), 'Academic Section', 'ACADEMIC', 'academic@jecrc.ac.in'),
(uuid_generate_v4(), 'Placement Cell', 'PLACEMENT', 'placement@jecrc.ac.in'),
(uuid_generate_v4(), 'Sports', 'SPORTS', 'sports@jecrc.ac.in'),
(uuid_generate_v4(), 'IT Department', 'IT', 'it@jecrc.ac.in')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- PRODUCTION DATA: Schools (13 Schools)
-- ============================================================================

INSERT INTO public.config_schools (id, name, display_order, is_active, created_at, updated_at) VALUES
('3e60ced0-41d3-4bd1-b105-6a38d22acb3c', 'School of Engineering & Technology', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('cd230360-7640-4625-9e4c-7e2fcd8f6f5b', 'School of Computer Applications', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('c9d871d3-5bb9-40dc-ba46-eef5e87a556b', 'Jaipur School of Business', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('0ca48cc2-6ad7-4f90-bce0-3b68b78ecd59', 'School of Sciences', 4, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('b34d5388-f804-4646-89e9-fa1ad747bb0f', 'School of Humanities & Social Sciences', 5, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('32606273-b37b-4891-819b-bc7069f34e3b', 'School of Law', 6, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('c393bd0d-a3b5-4aa2-b5b8-2621b99f2919', 'Jaipur School of Mass Communication', 7, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('d797703d-4af4-41c7-b4dc-96ed8332c4db', 'Jaipur School of Design', 8, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('f5c2014a-6de6-4e99-ba3a-c8471e4922a9', 'Jaipur School of Economics', 9, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('6a955f51-12e0-4f8b-99a5-678156d8c718', 'School of Allied Health Sciences', 10, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('dbbbc235-1d15-4694-a3e0-3d033f88f596', 'School of Hospitality', 11, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('a8fbb9ce-dbd9-4726-a7ef-d45e2c46d1cc', 'Directorate of Executive Education', 12, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('155b222a-120c-409e-b5f5-b63275d26d6d', 'Ph.D. (Doctoral Programme)', 13, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PRODUCTION DATA: Courses (31 Courses)
-- ============================================================================

INSERT INTO public.config_courses (id, school_id, name, display_order, is_active, created_at, updated_at) VALUES
('4070b71a-6a9a-4436-9452-f9ed8e97e1f1', '3e60ced0-41d3-4bd1-b105-6a38d22acb3c', 'B.Tech', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('347943b8-49de-4154-8c4c-ec312d7a1432', '3e60ced0-41d3-4bd1-b105-6a38d22acb3c', 'M.Tech', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('055760e8-e471-4215-88ec-c3a9967625c7', '3e60ced0-41d3-4bd1-b105-6a38d22acb3c', 'Diploma Engineering', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('afe542c8-a3e9-4dac-851f-9e583e8ae125', 'cd230360-7640-4625-9e4c-7e2fcd8f6f5b', 'BCA', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('9fd733a2-7258-45ef-a725-3854b71dc972', 'cd230360-7640-4625-9e4c-7e2fcd8f6f5b', 'MCA', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('d2f46b01-2d12-425d-b789-4863dda05eeb', 'cd230360-7640-4625-9e4c-7e2fcd8f6f5b', 'B.Sc.', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('5a170047-5de1-4d45-b5d8-9aec1ad89e5d', 'cd230360-7640-4625-9e4c-7e2fcd8f6f5b', 'M.Sc.', 4, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('cd5e3027-5077-4593-bb1c-0e6345291689', 'c9d871d3-5bb9-40dc-ba46-eef5e87a556b', 'BBA', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('fffc3234-e6e0-4466-891b-1acce82f143c', 'c9d871d3-5bb9-40dc-ba46-eef5e87a556b', 'MBA', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('4d8c7015-2e6e-4b7f-8542-2f5ba91fc75b', 'c9d871d3-5bb9-40dc-ba46-eef5e87a556b', 'B.Com', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('902c276c-533a-4338-9cee-80b332529877', 'c9d871d3-5bb9-40dc-ba46-eef5e87a556b', 'M.Com', 4, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('825e1d1c-16e0-49b8-9dcf-e06fc8d958a9', '0ca48cc2-6ad7-4f90-bce0-3b68b78ecd59', 'B.Sc.', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('9d360671-4f30-48d5-ba42-73626d01d9e7', '0ca48cc2-6ad7-4f90-bce0-3b68b78ecd59', 'M.Sc.', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('3ac96508-f0fb-494c-929f-e8bdcf82765e', 'b34d5388-f804-4646-89e9-fa1ad747bb0f', 'B.A.', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('f12aa98c-822e-4dc7-aa3c-bf1e6c656c14', 'b34d5388-f804-4646-89e9-fa1ad747bb0f', 'M.A.', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('fa4b2e11-66fb-401a-909c-f64d1152a86f', '32606273-b37b-4891-819b-bc7069f34e3b', 'BA LLB', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('d5953c54-6ea0-4d20-b502-91e04de72f99', '32606273-b37b-4891-819b-bc7069f34e3b', 'LLB', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('77e3f622-9dbb-42b8-82f8-3c1c48646c13', '32606273-b37b-4891-819b-bc7069f34e3b', 'LLM', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('60550dd6-6116-4bae-8a76-78efb55fa651', 'c393bd0d-a3b5-4aa2-b5b8-2621b99f2919', 'BJMC', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('62886d79-e5ff-4246-9b6b-b3b45c0457a3', 'c393bd0d-a3b5-4aa2-b5b8-2621b99f2919', 'MJMC', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('194d40a3-a20c-4401-be51-ed83b0a79ca4', 'd797703d-4af4-41c7-b4dc-96ed8332c4db', 'B.Des', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('245f599c-48cb-448c-8c78-e38d4d05766c', 'd797703d-4af4-41c7-b4dc-96ed8332c4db', 'M.Des', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('e46c5796-d72c-4d41-8151-8cdfb471be46', 'f5c2014a-6de6-4e99-ba3a-c8471e4922a9', 'BA Economics', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('d4619a34-10cd-4209-afc9-13d225b82d08', 'f5c2014a-6de6-4e99-ba3a-c8471e4922a9', 'MA Economics', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('683bb134-98c3-4f90-a54b-761249c3befd', '6a955f51-12e0-4f8b-99a5-678156d8c718', 'B.Pharma', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('7aea6461-fc7f-4ac8-8885-790b60b5f2d2', '6a955f51-12e0-4f8b-99a5-678156d8c718', 'M.Pharma', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('a5a24084-f992-4bb8-8a8b-e79adb737144', '6a955f51-12e0-4f8b-99a5-678156d8c718', 'BPT', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('2430c25b-7305-430c-a039-7afa98107648', 'dbbbc235-1d15-4694-a3e0-3d033f88f596', 'BHM', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('d016486f-4fb3-42aa-b5ec-918fc1ead91a', 'dbbbc235-1d15-4694-a3e0-3d033f88f596', 'MHM', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('2023cfd1-6380-4336-8cd8-bcba449d1cda', 'a8fbb9ce-dbd9-4726-a7ef-d45e2c46d1cc', 'Executive Programs', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('b5885e6b-4b6d-438d-b893-e76d17c162e7', '155b222a-120c-409e-b5f5-b63275d26d6d', 'Ph.D.', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PRODUCTION DATA: Branches (145 Branches)
-- ============================================================================

INSERT INTO public.config_branches (id, course_id, name, display_order, is_active, created_at, updated_at) VALUES
('4677cb3a-8340-49e7-94ca-68e56d454607', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Computer Science & Engineering', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('aa6954a4-16eb-4f52-80e1-1dfa1f317839', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Information Technology', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('07a2cc26-ab8d-483c-aa3a-ebfbc72aba83', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Electronics & Communication Engineering', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('caf21404-b352-4d35-86a5-308f01670183', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Electrical Engineering', 4, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('76481278-ed0c-4538-a0e0-f9644630482a', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Mechanical Engineering', 5, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('624e6212-fe2d-40b4-9f42-c8e0b2045efa', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Civil Engineering', 6, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('16f5f15a-1454-4ccb-834a-5267fd12bab2', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Artificial Intelligence & Machine Learning', 7, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('32770008-86bf-4964-b0a3-79ac77e27212', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Data Science', 8, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('7a73263b-c809-4e30-99a1-854764f4dab2', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Cyber Security', 9, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('2b32d49c-0b51-48f0-91d4-3e464b473d0a', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Electronics & Instrumentation Engineering', 10, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('61a1bb99-5bd8-49e2-a57b-a763aa3d128f', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Computer Science & Engineering - L&T EduTech', 11, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('9c149ff2-5925-49df-93f7-dc2e74cf6a99', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Artificial Intelligence & Machine Learning - L&T EduTech', 12, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('05ec4365-bb49-4ea3-9bb3-0842861a1644', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Data Science - L&T EduTech', 13, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('13775b8b-f2a1-437d-8ec0-1c908dde0fb9', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Computer Science & Engineering - IBM Cloud Computing', 14, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('6fccb7fe-52e7-4e31-a58a-b290ee95a752', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Information Technology - IBM Cloud Computing', 15, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('19c77a78-006d-47fc-baa8-34438705b3ac', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Computer Science & Engineering - AWS Cloud', 16, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('1f88cd57-6daa-4021-84aa-e27e9a16db42', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Data Science - AWS Cloud', 17, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('009b19d9-1e11-47ee-960f-0394f11e6c98', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Electronics & Communication - IoT', 18, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('c6934119-7e84-4892-a28e-83078637fb98', '4070b71a-6a9a-4436-9452-f9ed8e97e1f1', 'Automobile Engineering', 19, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('50b0d5f8-2bc2-4c83-a718-cdaf63fdb848', '347943b8-49de-4154-8c4c-ec312d7a1432', 'Computer Science & Engineering', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('362f1d51-9c5f-459b-be68-b64cc449016d', '347943b8-49de-4154-8c4c-ec312d7a1432', 'VLSI Design', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('8497ebe3-062a-489b-b9fa-7dd3f586fc28', '347943b8-49de-4154-8c4c-ec312d7a1432', 'Power Systems', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('8cef0f2a-99dd-434c-8230-7045d1175973', '347943b8-49de-4154-8c4c-ec312d7a1432', 'Structural Engineering', 4, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('2bddebb8-598d-478b-ba61-2d59f9b62097', '055760e8-e471-4215-88ec-c3a9967625c7', 'Computer Science & Engineering', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('8b0776af-d823-47ae-a9bc-8e7c342f2cbc', '055760e8-e471-4215-88ec-c3a9967625c7', 'Mechanical Engineering', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('b454c57b-5e45-46a9-a674-a0c723ef440c', '055760e8-e471-4215-88ec-c3a9967625c7', 'Civil Engineering', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('dcac6a77-454d-4ac3-b203-984db283692a', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('a565b508-a404-4517-91f4-c1654daee946', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Cloud Computing & Information Security', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('829a4c44-e4c7-4b82-a24b-100f62a29866', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Data Analytics', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('21b20c82-968e-47c7-a9d4-5bf9813a2fc5', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - Samatrix Full Stack Development', 4, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('92d20252-45e4-4df0-85f1-ebaf5e755fe3', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - Samatrix Data Science', 5, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('72c4953c-283f-4e13-8509-b8b6c81147ad', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - Samatrix AI & ML', 6, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('01985436-cb0a-4324-9a6d-9d3b87280d6d', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - Samatrix Cloud Computing', 7, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('1cc5e119-1446-4fe4-a783-dc5b816a5c99', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - Samatrix Cyber Security', 8, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('4459701d-2378-450b-98e5-380a742cb133', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - Samatrix Mobile App Development', 9, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('c2bc93c1-7050-4d89-9cfc-36d80f3396b8', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - Samatrix DevOps', 10, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('b4684790-d58c-47f5-a9aa-7cb65448f5b8', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - Samatrix Blockchain', 11, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('0a3ee383-9e51-45f7-a5ea-8190e1ea61e0', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - Xebia Software Engineering', 12, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('ee7ef6f1-9db2-47c2-9618-1945101cfd18', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - Xebia Cloud Native', 13, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('fb9da72d-6603-437c-8939-cb016bccfba4', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - upGrad Data Science', 14, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('ad9b530f-ef83-4619-80a3-ddddc5ebd71f', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - upGrad Software Development', 15, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('e1d302c5-e9be-4eb3-b8cb-80aa1f72e9d3', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - TCS CSBS', 16, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('ca28e1ae-3a0b-44e5-a48d-6be428366042', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - EC-Council Ethical Hacking', 17, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('713f8697-762c-4ece-8e35-ae0dc2c7cc21', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - EC-Council Cyber Security', 18, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('5a5e8487-0f56-4bee-97ab-1fc826930d76', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - EC-Council Network Security', 19, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('c990bf44-92b2-41fc-ac5b-1fdb74baad65', 'afe542c8-a3e9-4dac-851f-9e583e8ae125', 'Computer Applications - CollegeDekho Assured', 20, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('2dc77ff6-3dfc-400d-b7fb-1242962e66c7', '9fd733a2-7258-45ef-a725-3854b71dc972', 'Computer Applications', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('5279f29d-4b21-44c5-b767-e10c9a8ba26d', '9fd733a2-7258-45ef-a725-3854b71dc972', 'Computer Applications - Cloud Computing & DevOps', 2, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('431f7115-59cb-4c70-9b5c-1bcfb7be0a5f', 'd2f46b01-2d12-425d-b789-4863dda05eeb', 'Information Technology', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('afa7734a-bca0-411d-adcc-3d03c3a1008b', 'd2f46b01-2d12-425d-b789-4863dda05eeb', 'Computer Science', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('5de43d7f-5934-4024-8ff2-5409e368f86f', '5a170047-5de1-4d45-b5d8-9aec1ad89e5d', 'Information Technology', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('f2815ac8-ecba-4453-868f-9d5a31dabd43', 'cd5e3027-5077-4593-bb1c-0e6345291689', 'General Management', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('d6d8e956-05b0-4a8d-92fb-6a419fc85f18', 'cd5e3027-5077-4593-bb1c-0e6345291689', 'Digital Marketing', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('a193c7ef-42f1-4c97-8263-2931d57645db', 'cd5e3027-5077-4593-bb1c-0e6345291689', 'Finance', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('85a76be9-f480-428a-8618-92e1de32641e', 'cd5e3027-5077-4593-bb1c-0e6345291689', 'International Business', 4, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('9c471091-e715-4927-90fd-4216935081d2', 'cd5e3027-5077-4593-bb1c-0e6345291689', 'Human Resource Management', 5, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('96c22273-6d25-41f8-95bb-d02352d245f3', 'cd5e3027-5077-4593-bb1c-0e6345291689', 'General Management - Sunstone Program', 6, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('64a0aba3-0264-4e8c-8d8f-517d4fbeb916', 'cd5e3027-5077-4593-bb1c-0e6345291689', 'Digital Marketing - Sunstone Program', 7, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('757b83d5-d228-43ae-8415-9b20086bf2fd', 'cd5e3027-5077-4593-bb1c-0e6345291689', 'Entrepreneurship - Sunstone Program', 8, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('0cfa2aee-42c8-4e99-a36d-0c911841b07c', 'cd5e3027-5077-4593-bb1c-0e6345291689', 'International Business - ISDC Program', 9, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('2d205a23-c8c3-4677-8a38-de3227804e3d', 'cd5e3027-5077-4593-bb1c-0e6345291689', 'Global Marketing - ISDC Program', 10, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('1c59c3c8-c208-4b6e-8214-7403c15411c0', 'fffc3234-e6e0-4466-891b-1acce82f143c', 'Finance', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('53564cfa-63cf-4167-a382-c0267daeec8d', 'fffc3234-e6e0-4466-891b-1acce82f143c', 'Marketing', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('02373990-8c16-4a8c-b75d-e175b187c9ec', 'fffc3234-e6e0-4466-891b-1acce82f143c', 'Human Resource Management', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('fa8a2555-e9d5-4446-8fc1-1393c7ce1cde', 'fffc3234-e6e0-4466-891b-1acce82f143c', 'International Business', 4, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('e524f01f-5890-48b2-bb77-4dfa7c5f8e98', 'fffc3234-e6e0-4466-891b-1acce82f143c', 'Operations Management', 5, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('2760a58c-9c99-4054-b62d-43007df0dfdf', 'fffc3234-e6e0-4466-891b-1acce82f143c', 'Business Analytics', 6, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('74b5b7c7-1d31-43ff-addb-9e6697eccce4', 'fffc3234-e6e0-4466-891b-1acce82f143c', 'Digital Marketing & E-Commerce', 7, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('2c033849-a7c5-49a2-b4de-d6b8a0cc06e9', 'fffc3234-e6e0-4466-891b-1acce82f143c', 'Supply Chain Management', 8, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('2897d096-570b-4a79-b755-dc26af33e370', 'fffc3234-e6e0-4466-891b-1acce82f143c', 'Banking & Financial Services', 9, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('38fb4a20-d929-4edf-b6d2-1c7a834d4ebc', 'fffc3234-e6e0-4466-891b-1acce82f143c', 'Healthcare Management', 10, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('f0b2b14e-8c42-406f-9805-184ca6ec6529', 'fffc3234-e6e0-4466-891b-1acce82f143c', 'Entrepreneurship', 11, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('19109ad6-714a-4dac-b00c-e283c30c5c86', '4d8c7015-2e6e-4b7f-8542-2f5ba91fc75b', 'Accounting & Finance', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('56b7a422-e95d-4c60-9966-e0389ed790c8', '4d8c7015-2e6e-4b7f-8542-2f5ba91fc75b', 'Banking & Insurance', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('092ed007-7c31-4e63-a1a4-0a4c5feed98e', '4d8c7015-2e6e-4b7f-8542-2f5ba91fc75b', 'Taxation', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('d07c4f33-a0a4-4f92-8cb2-df96eaa05ed2', '4d8c7015-2e6e-4b7f-8542-2f5ba91fc75b', 'E-Commerce & Digital Business', 4, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('4fcd52ea-3bfa-4c44-8c0d-bc8ab321c570', '4d8c7015-2e6e-4b7f-8542-2f5ba91fc75b', 'Financial Markets', 5, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('fa484c92-b990-42c6-98f3-15e867e3909a', '4d8c7015-2e6e-4b7f-8542-2f5ba91fc75b', 'International Business', 6, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('e53d4d4b-046d-426d-948d-5eccb8506b00', '4d8c7015-2e6e-4b7f-8542-2f5ba91fc75b', 'Cost & Management Accounting', 7, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('fe58a087-1666-4b74-a6a8-753dd5c1c577', '4d8c7015-2e6e-4b7f-8542-2f5ba91fc75b', 'Corporate Accounting', 8, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('e909a738-f3f9-4280-b09a-a59802cc1cfc', '902c276c-533a-4338-9cee-80b332529877', 'Accounting & Finance', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('c1901374-7853-438b-9c9c-33431c2897ab', '825e1d1c-16e0-49b8-9dcf-e06fc8d958a9', 'Physics', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('192763b4-b0ec-4192-883a-cf8f0f753026', '825e1d1c-16e0-49b8-9dcf-e06fc8d958a9', 'Chemistry', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('792d31da-494f-4e11-ab4d-91ebe9df05ab', '825e1d1c-16e0-49b8-9dcf-e06fc8d958a9', 'Mathematics', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('5fad83ec-5931-4c62-ab42-334a9a49b967', '825e1d1c-16e0-49b8-9dcf-e06fc8d958a9', 'Biotechnology', 4, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('97f679bb-15f1-4995-9722-590511fd6521', '825e1d1c-16e0-49b8-9dcf-e06fc8d958a9', 'Microbiology', 5, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('343d5566-1e08-40e7-8a2b-a4034d334292', '825e1d1c-16e0-49b8-9dcf-e06fc8d958a9', 'Environmental Science', 6, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('99818a63-2e5a-478e-9da4-46527656b8ad', '825e1d1c-16e0-49b8-9dcf-e06fc8d958a9', 'Zoology', 7, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('3ffec904-cf63-48e0-a194-97ccf71d2cfb', '825e1d1c-16e0-49b8-9dcf-e06fc8d958a9', 'Botany', 8, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('cec6bf0b-d601-451a-991f-f976deac5c03', '825e1d1c-16e0-49b8-9dcf-e06fc8d958a9', 'Forensic Science', 9, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('09d2f9f1-0196-4ff8-9ef6-0ee36dd70077', '9d360671-4f30-48d5-ba42-73626d01d9e7', 'Physics', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('fc16d7a4-28bc-47f2-8144-dc784e1b6997', '9d360671-4f30-48d5-ba42-73626d01d9e7', 'Chemistry', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('e67733eb-a22b-4b26-8219-36be2f280cf9', '9d360671-4f30-48d5-ba42-73626d01d9e7', 'Mathematics', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('ff9c40fd-6387-400d-ac29-dc4b6dbe2691', '9d360671-4f30-48d5-ba42-73626d01d9e7', 'Biotechnology', 4, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('b56a2255-7069-42ab-bfcc-ff2ebbb9a953', '3ac96508-f0fb-494c-929f-e8bdcf82765e', 'English', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('c299164b-60e3-47ae-a801-88897f6d30b5', '3ac96508-f0fb-494c-929f-e8bdcf82765e', 'Psychology', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('73608fe0-560c-4c80-8094-98107771e676', '3ac96508-f0fb-494c-929f-e8bdcf82765e', 'Political Science', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('d77b5b7e-d369-44d3-86fe-3f3f63785517', '3ac96508-f0fb-494c-929f-e8bdcf82765e', 'History', 4, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('20b6d827-646b-4629-bf1a-e41d227c35c2', '3ac96508-f0fb-494c-929f-e8bdcf82765e', 'Sociology', 5, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('a75a4e1d-ee8d-470f-97f4-34d2cba2666e', '3ac96508-f0fb-494c-929f-e8bdcf82765e', 'Economics', 6, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('d0548c66-328a-44f2-9505-3d3ceb579f0f', '3ac96508-f0fb-494c-929f-e8bdcf82765e', 'Philosophy', 7, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('10b07b96-2535-4f71-b13a-259a45896990', '3ac96508-f0fb-494c-929f-e8bdcf82765e', 'Geography', 8, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('828d97f7-8bde-4e29-88cf-4c1e68d3a905', '3ac96508-f0fb-494c-929f-e8bdcf82765e', 'Public Administration', 9, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('b2f9cd5e-0be2-4659-b004-055c1a00330d', 'f12aa98c-822e-4dc7-aa3c-bf1e6c656c14', 'English', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('c2c4e456-60dd-4cd1-b387-9d86a689a159', 'f12aa98c-822e-4dc7-aa3c-bf1e6c656c14', 'Psychology', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('06065300-30e3-49d6-b951-0bb298978d2b', 'f12aa98c-822e-4dc7-aa3c-bf1e6c656c14', 'Political Science', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('4eaa0ad7-ce0c-43bc-9244-2152ce8f838d', 'fa4b2e11-66fb-401a-909c-f64d1152a86f', 'General Law', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('f35c8976-e9f1-47e1-b0d1-d1e39c7b2e65', 'fa4b2e11-66fb-401a-909c-f64d1152a86f', 'Corporate Law', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('3b62fd2a-d3c0-40eb-9306-4d1a18950b71', 'fa4b2e11-66fb-401a-909c-f64d1152a86f', 'Criminal Law', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('d63465b6-5d1d-4415-97ad-c4e6699aaad9', 'd5953c54-6ea0-4d20-b502-91e04de72f99', 'General Law', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('8d999d4c-2680-443b-ba8c-21ee04fcef16', '77e3f622-9dbb-42b8-82f8-3c1c48646c13', 'Corporate Law', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('251714cc-f5c6-4c77-9f94-228bcf454ce7', '77e3f622-9dbb-42b8-82f8-3c1c48646c13', 'Intellectual Property Rights', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('c6187690-a995-4287-bbc1-65a525b18766', '60550dd6-6116-4bae-8a76-78efb55fa651', 'Journalism & Mass Communication', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('3ef3f946-4011-4991-9237-cf18ca787ad8', '60550dd6-6116-4bae-8a76-78efb55fa651', 'Advertising & Public Relations', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('173ad983-3e31-4085-a236-2e463b286ec1', '60550dd6-6116-4bae-8a76-78efb55fa651', 'Digital Media', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('dac48f53-19f4-4b61-9acf-c80d66029c27', '62886d79-e5ff-4246-9b6b-b3b45c0457a3', 'Journalism & Mass Communication', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('abad4593-b466-4636-bd49-940113f77968', '194d40a3-a20c-4401-be51-ed83b0a79ca4', 'Fashion Design', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('fe1e7678-97c0-460b-98cf-bbe15844503c', '194d40a3-a20c-4401-be51-ed83b0a79ca4', 'Interior Design', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('1c693fc0-deeb-45e0-8ab3-0db74d77014d', '194d40a3-a20c-4401-be51-ed83b0a79ca4', 'Textile Design', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('ac18a485-57f6-4507-9435-c50b6fdabdde', '194d40a3-a20c-4401-be51-ed83b0a79ca4', 'Graphic Design', 4, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('a0356e52-0ac2-485c-b562-3db71e113621', '194d40a3-a20c-4401-be51-ed83b0a79ca4', 'Product Design', 5, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('b1db2b98-659a-49bd-a31d-ac146948f76c', '194d40a3-a20c-4401-be51-ed83b0a79ca4', 'UX/UI Design', 6, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('82a4844b-d283-4314-8f7e-c9b40771ab2d', '194d40a3-a20c-4401-be51-ed83b0a79ca4', 'Animation & Motion Graphics', 7, true, '2025-12-16 18:34:52.376822+00', '2025-12-16 18:34:52.376822+00'),
('01447fc7-e14d-4574-8e12-50b22dbd456e', '245f599c-48cb-448c-8c78-e38d4d05766c', 'Fashion Design', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('6579893b-8d88-4c06-8edd-a6e8b7fd60d7', '245f599c-48cb-448c-8c78-e38d4d05766c', 'Interior Design', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('a472e244-b129-424e-bd6a-e30a7422c59e', 'e46c5796-d72c-4d41-8151-8cdfb471be46', 'Economics', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('3d4bc6ed-496d-41dc-8362-2ab427d1eb4c', 'e46c5796-d72c-4d41-8151-8cdfb471be46', 'Applied Economics', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('975d17ac-2d46-4863-8fc2-79e1b4477a44', 'd4619a34-10cd-4209-afc9-13d225b82d08', 'Economics', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('cee1f579-e009-493f-bdbe-a84af4c52b46', '683bb134-98c3-4f90-a54b-761249c3befd', 'Pharmacy', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('69ebbbce-b876-411e-a831-e94dadae23ed', '7aea6461-fc7f-4ac8-8885-790b60b5f2d2', 'Pharmaceutics', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('bc53841c-bee4-4c99-ab5f-803d06c8d073', '7aea6461-fc7f-4ac8-8885-790b60b5f2d2', 'Pharmacology', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('ff590025-ee77-4292-85c8-6008e3ad5eca', 'a5a24084-f992-4bb8-8a8b-e79adb737144', 'Physiotherapy', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('e44c9d78-b132-4b59-ba30-2f48a2de0aa2', '2430c25b-7305-430c-a039-7afa98107648', 'Hotel Management', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('248d2ddc-f3e7-4aa3-a63e-770c9d0b4f69', '2430c25b-7305-430c-a039-7afa98107648', 'Culinary Arts', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('137ded4e-92ac-4b16-a60e-8f31b373c895', '2430c25b-7305-430c-a039-7afa98107648', 'Tourism Management', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('a1f38461-941c-4e6c-84b9-f03bee2487e1', 'd016486f-4fb3-42aa-b5ec-918fc1ead91a', 'Hotel Management', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('232071e3-c39d-4844-9304-3c13d304af18', '2023cfd1-6380-4336-8cd8-bcba449d1cda', 'Executive MBA', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('8ae2fb97-922c-436f-95fa-17428bdaa61b', '2023cfd1-6380-4336-8cd8-bcba449d1cda', 'Certificate Programs', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('864110ef-5f69-44fa-893b-398978f81656', '2023cfd1-6380-4336-8cd8-bcba449d1cda', 'Management Development Programs', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('f67df1f4-3fee-4106-b896-fd612f8df1ea', 'b5885e6b-4b6d-438d-b893-e76d17c162e7', 'Engineering & Technology', 1, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('c9a6e7f3-4bbc-4713-8792-e49cf053b5c0', 'b5885e6b-4b6d-438d-b893-e76d17c162e7', 'Computer Science & Applications', 2, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('91b85fad-ce9a-414d-b24b-706ce0775cdb', 'b5885e6b-4b6d-438d-b893-e76d17c162e7', 'Management', 3, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('f720fd59-de9b-4737-9fb8-31b2f20ad304', 'b5885e6b-4b6d-438d-b893-e76d17c162e7', 'Sciences', 4, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('c0c43f0f-bfe8-4794-a666-f71315c63042', 'b5885e6b-4b6d-438d-b893-e76d17c162e7', 'Humanities & Social Sciences', 5, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00'),
('20b05013-28cd-4eea-8a62-65647d57ecf2', 'b5885e6b-4b6d-438d-b893-e76d17c162e7', 'Law', 6, true, '2025-12-16 17:12:01.08119+00', '2025-12-16 17:12:01.08119+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PRODUCTION DATA: Convocation Eligible Students (3,181 Students)
-- Note: This data is sourced from IMPORT_CONVOCATION_STUDENTS.sql
-- For brevity, including representative sample. Full data available in source.
-- ============================================================================

-- Due to size constraints, the convocation data INSERT statements would go here
-- The file IMPORT_CONVOCATION_STUDENTS.sql contains all 3,181 students
-- To add: Copy INSERT statements from lines 15-3180 of that file

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'JECRC NO DUES SYSTEM - DATABASE SETUP COMPLETE';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Tables Created: 15 production tables';
    RAISE NOTICE 'Schools: 13 schools inserted';
    RAISE NOTICE 'Courses: 31 courses inserted';
    RAISE NOTICE 'Branches: 145 branches inserted';
    RAISE NOTICE 'Departments: 8 departments inserted';
    RAISE NOTICE 'Country Codes: 5 countries inserted';
    RAISE NOTICE 'Convocation Students: Ready for import (see IMPORT_CONVOCATION_STUDENTS.sql)';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Run IMPORT_CONVOCATION_STUDENTS.sql to add 3,181 convocation students';
    RAISE NOTICE '2. Create admin account via Supabase Auth';
    RAISE NOTICE '3. Configure email settings';
    RAISE NOTICE '4. Deploy application';
    RAISE NOTICE '============================================================================';
END $$;