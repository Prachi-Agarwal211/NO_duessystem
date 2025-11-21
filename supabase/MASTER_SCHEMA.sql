-- ============================================================================
-- JECRC NO DUES SYSTEM - MASTER SCHEMA (SINGLE SOURCE OF TRUTH)
-- ============================================================================
-- This file completely resets and recreates the entire database
-- Run this ONCE in Supabase SQL Editor to set up everything
-- ============================================================================

-- ============================================================================
-- SECTION 1: CLEANUP - Remove ALL existing data and objects
-- ============================================================================

-- Drop all tables in correct order (respecting foreign keys)
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
-- SECTION 2: CREATE TABLES
-- ============================================================================

-- 2.1 Profiles Table (Staff/Admin users only - NO STUDENTS in Phase 1)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('department', 'admin')),
    department_name TEXT, -- NULL for admin, required for department staff
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Departments Table (12 JECRC departments - LOWERCASE names)
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL, -- lowercase: 'library', 'accounts', etc.
    display_name TEXT NOT NULL, -- Display: 'Library', 'Accounts', etc.
    email TEXT,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert all 12 departments (LOWERCASE names to match code)
INSERT INTO public.departments (name, display_name, email, display_order) VALUES
    ('library', 'Library', 'library@jecrc.ac.in', 1),
    ('accounts', 'Accounts', 'accounts@jecrc.ac.in', 2),
    ('hostel', 'Hostel', 'hostel@jecrc.ac.in', 3),
    ('lab', 'Laboratory', 'lab@jecrc.ac.in', 4),
    ('department', 'Department', 'department@jecrc.ac.in', 5),
    ('sports', 'Sports', 'sports@jecrc.ac.in', 6),
    ('transport', 'Transport', 'transport@jecrc.ac.in', 7),
    ('exam', 'Examination Cell', 'exam@jecrc.ac.in', 8),
    ('placement', 'Training & Placement', 'placement@jecrc.ac.in', 9),
    ('scholarship', 'Scholarship', 'scholarship@jecrc.ac.in', 10),
    ('student_affairs', 'Student Affairs', 'studentaffairs@jecrc.ac.in', 11),
    ('administration', 'Administration', 'admin@jecrc.ac.in', 12);

-- 2.3 No Dues Forms Table (Student submissions - NO authentication required)
CREATE TABLE public.no_dues_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULLABLE for Phase 1
    registration_no TEXT UNIQUE NOT NULL,
    student_name TEXT NOT NULL,
    session_from TEXT,
    session_to TEXT,
    parent_name TEXT,
    school TEXT NOT NULL,
    course TEXT,
    branch TEXT,
    contact_no TEXT NOT NULL,
    alumni_screenshot_url TEXT,
    certificate_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 No Dues Status Table (Individual department statuses)
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

-- 2.5 Audit Log Table (Track all actions)
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

-- 2.6 Notifications Table (Email tracking)
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
-- SECTION 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_department ON public.profiles(department_name);
CREATE INDEX idx_profiles_email ON public.profiles(email);

CREATE INDEX idx_forms_registration ON public.no_dues_forms(registration_no);
CREATE INDEX idx_forms_status ON public.no_dues_forms(status);
CREATE INDEX idx_forms_created ON public.no_dues_forms(created_at DESC);

CREATE INDEX idx_status_form ON public.no_dues_status(form_id);
CREATE INDEX idx_status_department ON public.no_dues_status(department_name);
CREATE INDEX idx_status_status ON public.no_dues_status(status);

CREATE INDEX idx_audit_log_created ON public.audit_log(created_at);
CREATE INDEX idx_notifications_form ON public.notifications(form_id);

-- ============================================================================
-- SECTION 4: CREATE FUNCTIONS
-- ============================================================================

-- 4.1 Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Function: Auto-create department statuses when form is submitted
CREATE OR REPLACE FUNCTION create_department_statuses()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.no_dues_status (form_id, department_name, status)
    SELECT NEW.id, name, 'pending'
    FROM public.departments
    ORDER BY display_order;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.3 Function: Update form status when all departments approve
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

-- 4.4 Function: Get form statistics (for admin dashboard)
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

-- 4.5 Function: Get department workload
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
-- SECTION 5: CREATE TRIGGERS
-- ============================================================================

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
-- SECTION 6: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_dues_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_dues_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles" ON public.profiles
    FOR SELECT USING (
        role = 'admin' OR auth.uid() = id
    );

-- Departments Policies (Public read access)
CREATE POLICY "Anyone can view departments" ON public.departments
    FOR SELECT USING (true);

-- Forms Policies (Phase 1: Public access for students)
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

CREATE POLICY "Admin can view all notifications" ON public.notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- SETUP COMPLETE - VERIFICATION
-- ============================================================================

-- Verify setup with these queries:
-- SELECT * FROM public.departments ORDER BY display_order;
-- SELECT * FROM public.profiles;
-- SELECT * FROM get_form_statistics();
-- SELECT * FROM get_department_workload();

-- ============================================================================
-- NEXT STEPS:
-- 1. Create storage buckets: 'certificates' and 'alumni-screenshots'
-- 2. Create admin user via Supabase Auth Dashboard
-- 3. Create department users via Supabase Auth Dashboard
-- 4. Update .env.local with Supabase credentials
-- 5. Run: npm run dev
-- ============================================================================