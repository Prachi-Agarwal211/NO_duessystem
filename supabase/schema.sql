-- Complete Database Schema for JECRC No Dues Web Application
-- This file consolidates all database schema changes including admin dashboard features

-- Create profiles table based on auth.users
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student', -- 'student', 'department', 'registrar', 'admin'
    department_name TEXT, -- For department staff: 'LIBRARY', 'HOSTEL', 'ALUMNI', etc.
    registration_no TEXT UNIQUE, -- For students only
    email TEXT UNIQUE, -- For staff members
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Add constraint for valid roles
    CONSTRAINT check_role CHECK (role IN ('student', 'department', 'registrar', 'admin'))
);

-- Enable RLS for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Registrar can view all profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'registrar'
        )
    );

-- Add admin policies
CREATE POLICY "Admin can view all profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

CREATE POLICY "Admin can update all profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- Create departments table - Fixed list of all departments
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- 'LIBRARY', 'IT_DEPARTMENT', 'HOSTEL', 'MESS', 'CANTEEN', 'TPO', 'ALUMNI', 'ACCOUNTS', 'REGISTRAR', 'SCHOOL_HOD'
    display_name TEXT NOT NULL, -- Human-readable name
    display_order INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert all required departments
INSERT INTO public.departments (name, display_name, display_order) VALUES 
('SCHOOL_HOD', 'School (HOD/Dean)', 1),
('LIBRARY', 'Library', 2),
('IT_DEPARTMENT', 'IT Department', 3),
('HOSTEL', 'Hostel', 4),
('MESS', 'Mess', 5),
('CANTEEN', 'Canteen', 6),
('TPO', 'Training & Placement', 7),
('ALUMNI', 'Alumni Association', 8),
('ACCOUNTS', 'Accounts', 9),
('REGISTRAR', 'Registrar', 10),
('EXAM_CELL', 'Examination Cell', 11),
('SPORTS', 'Sports Department', 12);

-- Create no_dues_forms table (created before no_dues_status since no_dues_status references it)
CREATE TABLE public.no_dues_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    registration_no TEXT NOT NULL,
    session_from TEXT,
    session_to TEXT,
    parent_name TEXT,
    school TEXT DEFAULT 'Engineering',
    course TEXT,
    branch TEXT,
    contact_no TEXT,
    alumni_screenshot_url TEXT,
    certificate_url TEXT,
    final_certificate_generated BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'rejected'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create no_dues_status table (created after no_dues_forms since it depends on it)
CREATE TABLE public.no_dues_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.no_dues_forms(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL REFERENCES public.departments(name), -- Use department name as FK
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'screenshot_uploaded'
    action_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Who approved/rejected
    action_at TIMESTAMPTZ,
    rejection_reason TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(form_id, department_name) -- One status per department per form
);

-- Enable RLS for tables after all dependencies are created
ALTER TABLE public.no_dues_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_dues_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for no_dues_forms (created after both tables exist to avoid dependency issues)
CREATE POLICY "Students can view own forms" ON public.no_dues_forms
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff can view forms in their department" ON public.no_dues_forms
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                p.role = 'registrar' OR
                EXISTS (
                    SELECT 1 FROM public.no_dues_status n
                    WHERE n.form_id = public.no_dues_forms.id
                    AND n.department_name = p.department_name
                )
            )
        )
    );

CREATE POLICY "Students can update own forms" ON public.no_dues_forms
    FOR UPDATE USING (auth.uid() = user_id);

-- Add admin policies for forms
CREATE POLICY "Admin can view all forms" ON public.no_dues_forms
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

CREATE POLICY "Admin can update all forms" ON public.no_dues_forms
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- RLS Policies for no_dues_status
CREATE POLICY "Users can view status for their forms" ON public.no_dues_status
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM no_dues_forms f
            WHERE f.id = public.no_dues_status.form_id
            AND (
                f.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.department_name = public.no_dues_status.department_name
                )
            )
        )
    );

CREATE POLICY "Staff can update status for their department" ON public.no_dues_status
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.department_name = public.no_dues_status.department_name
            AND p.role = 'department'
        )
    );

CREATE POLICY "Registrar can update all status" ON public.no_dues_status
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'registrar'
        )
    );

-- Add admin policies for status
CREATE POLICY "Admin can view all status" ON public.no_dues_status
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

CREATE POLICY "Admin can update all status" ON public.no_dues_status
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- Create audit_log table for tracking all actions
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL for system actions
    action_type TEXT NOT NULL, -- 'form_submit', 'status_update', 'certificate_generate', etc.
    action_details JSONB, -- Detailed information about the action
    table_name TEXT, -- Table affected
    record_id UUID, -- ID of the affected record
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for audit_log table
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy for audit_log
CREATE POLICY "Registrar can view all audit logs" ON public.audit_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'registrar'
        )
    );

-- Add admin policy for audit logs
CREATE POLICY "Admin can view all audit logs" ON public.audit_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- Create notifications table for tracking email notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.no_dues_forms(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL,
    email_to TEXT NOT NULL,
    email_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ, -- When staff acknowledges the notification
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy for notifications
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM no_dues_forms f
            WHERE f.id = public.notifications.form_id
            AND f.user_id = auth.uid()
        )
    );

-- Add admin policy for notifications
CREATE POLICY "Admin can view all notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- Create storage buckets for file uploads
-- Note: Buckets should be created via Supabase Dashboard or setup-storage.js script
-- This is kept for reference but may not execute correctly via SQL

-- Bucket: certificates (for PDF certificates)
-- INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types) 
-- VALUES ('certificates', 'certificates', true, false, 10485760, 
-- '{"application/pdf"}')
-- ON CONFLICT (id) DO NOTHING;

-- Bucket: alumni-screenshots (for student uploads)
-- INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types) 
-- VALUES ('alumni-screenshots', 'alumni-screenshots', true, false, 5242880, 
-- '{"image/png","image/jpeg","image/jpg","image/webp"}')
-- ON CONFLICT (id) DO NOTHING;

-- Bucket: avatars (optional, for user avatars)
-- INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types) 
-- VALUES ('avatars', 'avatars', true, false, 5242880, 
-- '{"image/png","image/jpeg","image/jpg","image/webp","image/gif"}')
-- ON CONFLICT (id) DO NOTHING;

-- Add function for calculating response times
CREATE OR REPLACE FUNCTION calculate_response_time(form_id_param UUID, dept_name TEXT)
RETURNS INTERVAL AS $$
DECLARE
    created_time TIMESTAMPTZ;
    action_time TIMESTAMPTZ;
BEGIN
    SELECT created_at INTO created_time
    FROM no_dues_status
    WHERE form_id = form_id_param AND department_name = dept_name;

    SELECT action_at INTO action_time
    FROM no_dues_status
    WHERE form_id = form_id_param AND department_name = dept_name AND action_at IS NOT NULL;

    IF created_time IS NOT NULL AND action_time IS NOT NULL THEN
        RETURN action_time - created_time;
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add function for getting admin summary statistics
CREATE OR REPLACE FUNCTION get_admin_summary_stats()
RETURNS TABLE (
    total_requests BIGINT,
    completed_requests BIGINT,
    pending_requests BIGINT,
    rejected_requests BIGINT,
    in_progress_requests BIGINT,
    avg_hours_per_request NUMERIC,
    total_students BIGINT,
    total_departments BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN f.status = 'completed' THEN 1 END) as completed_requests,
        COUNT(CASE WHEN f.status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN f.status = 'rejected' THEN 1 END) as rejected_requests,
        COUNT(CASE WHEN f.status = 'in_progress' THEN 1 END) as in_progress_requests,
        AVG(CASE WHEN s.action_at IS NOT NULL THEN EXTRACT(EPOCH FROM (s.action_at - s.created_at))/3600 END) as avg_hours_per_request,
        (SELECT COUNT(*) FROM profiles WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM departments) as total_departments
    FROM no_dues_forms f
    LEFT JOIN no_dues_status s ON f.id = s.form_id;
END;
$$ LANGUAGE plpgsql;

-- Add function for getting overall stats
CREATE OR REPLACE FUNCTION get_overall_stats()
RETURNS TABLE (
    total_requests BIGINT,
    completed_requests BIGINT,
    pending_requests BIGINT,
    rejected_requests BIGINT,
    in_progress_requests BIGINT,
    avg_hours_per_request NUMERIC,
    total_students BIGINT,
    total_departments BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_requests,
        AVG(CASE WHEN no_dues_status.action_at IS NOT NULL THEN EXTRACT(EPOCH FROM (no_dues_status.action_at - no_dues_status.created_at))/3600 END) as avg_hours_per_request,
        (SELECT COUNT(*) FROM profiles WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM departments) as total_departments
    FROM no_dues_forms
    LEFT JOIN no_dues_status ON no_dues_forms.id = no_dues_status.form_id;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_status ON public.no_dues_forms(status);
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_created_at ON public.no_dues_forms(created_at);
CREATE INDEX IF NOT EXISTS idx_no_dues_status_form_id ON public.no_dues_status(form_id);
CREATE INDEX IF NOT EXISTS idx_no_dues_status_department ON public.no_dues_status(department_name);
CREATE INDEX IF NOT EXISTS idx_no_dues_status_status ON public.no_dues_status(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_form_id ON public.notifications(form_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Function to initialize status records for all departments when a form is created
CREATE OR REPLACE FUNCTION initialize_form_status_records()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert status records for all departments when a new form is created
    INSERT INTO public.no_dues_status (form_id, department_name, status)
    SELECT NEW.id, name, 'pending'
    FROM public.departments;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically initialize status records
CREATE TRIGGER trigger_initialize_form_status
    AFTER INSERT ON public.no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION initialize_form_status_records();