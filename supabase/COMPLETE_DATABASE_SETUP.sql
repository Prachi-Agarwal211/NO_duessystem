-- ============================================================================
-- JECRC NO DUES SYSTEM - COMPLETE DATABASE SETUP
-- Phase 1: Student Portal + Department/Admin Workflow
-- Run this ONCE in your new Supabase SQL Editor
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: TABLES
-- ============================================================================

-- 1.1 Profiles Table (Staff/Admin users only - NO STUDENTS)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('department', 'admin')),
    department_name TEXT, -- NULL for admin, required for department
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2 Departments Table (12 JECRC departments)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL, -- Internal name (lowercase, no spaces)
    display_name TEXT NOT NULL, -- Display name (proper case)
    email TEXT, -- Department contact email
    display_order INTEGER NOT NULL, -- Order in which to display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.3 No Dues Forms Table (Student submissions - NO authentication required)
CREATE TABLE IF NOT EXISTS public.no_dues_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Student Information (NO user_id - public access)
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULLABLE for Phase 1
    registration_no TEXT UNIQUE NOT NULL, -- Unique identifier
    student_name TEXT NOT NULL,
    session_from TEXT,
    session_to TEXT,
    parent_name TEXT,
    school TEXT NOT NULL,
    course TEXT,
    branch TEXT,
    contact_no TEXT NOT NULL,
    
    -- File Storage
    alumni_screenshot_url TEXT,
    certificate_url TEXT,
    
    -- Status Tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Search optimization
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(registration_no, '') || ' ' || 
                              coalesce(student_name, '') || ' ' || 
                              coalesce(contact_no, ''))
    ) STORED
);

-- 1.4 No Dues Status Table (Individual department statuses)
CREATE TABLE IF NOT EXISTS public.no_dues_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES public.no_dues_forms(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    action_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One status per department per form
    UNIQUE(form_id, department_name)
);

-- ============================================================================
-- SECTION 2: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_name);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_forms_registration ON public.no_dues_forms(registration_no);
CREATE INDEX IF NOT EXISTS idx_forms_status ON public.no_dues_forms(status);
CREATE INDEX IF NOT EXISTS idx_forms_created ON public.no_dues_forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forms_search ON public.no_dues_forms USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_status_form ON public.no_dues_status(form_id);
CREATE INDEX IF NOT EXISTS idx_status_department ON public.no_dues_status(department_name);
CREATE INDEX IF NOT EXISTS idx_status_status ON public.no_dues_status(status);

-- ============================================================================
-- SECTION 3: INSERT DEFAULT DEPARTMENTS (12 Departments)
-- ============================================================================

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
    ('administration', 'Administration', 'admin@jecrc.ac.in', 12)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SECTION 4: TRIGGERS AND FUNCTIONS
-- ============================================================================

-- 4.1 Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Trigger: Auto-update updated_at on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4.3 Trigger: Auto-update updated_at on forms
DROP TRIGGER IF EXISTS update_forms_updated_at ON public.no_dues_forms;
CREATE TRIGGER update_forms_updated_at
    BEFORE UPDATE ON public.no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4.4 Function: Auto-create department statuses when form is submitted
CREATE OR REPLACE FUNCTION create_department_statuses()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert pending status for all 12 departments
    INSERT INTO public.no_dues_status (form_id, department_name, status)
    SELECT NEW.id, name, 'pending'
    FROM public.departments
    ORDER BY display_order;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.5 Trigger: Create department statuses on form insert
DROP TRIGGER IF EXISTS trigger_create_department_statuses ON public.no_dues_forms;
CREATE TRIGGER trigger_create_department_statuses
    AFTER INSERT ON public.no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION create_department_statuses();

-- 4.6 Function: Update form status when all departments approve
CREATE OR REPLACE FUNCTION update_form_status_on_department_action()
RETURNS TRIGGER AS $$
DECLARE
    total_depts INTEGER;
    approved_depts INTEGER;
    rejected_depts INTEGER;
BEGIN
    -- Count total departments
    SELECT COUNT(*) INTO total_depts
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id;
    
    -- Count approved departments
    SELECT COUNT(*) INTO approved_depts
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id AND status = 'approved';
    
    -- Count rejected departments
    SELECT COUNT(*) INTO rejected_depts
    FROM public.no_dues_status
    WHERE form_id = NEW.form_id AND status = 'rejected';
    
    -- Update form status based on department statuses
    IF rejected_depts > 0 THEN
        -- If any department rejects, mark form as rejected
        UPDATE public.no_dues_forms
        SET status = 'rejected'
        WHERE id = NEW.form_id;
    ELSIF approved_depts = total_depts THEN
        -- If all departments approve, mark as completed
        UPDATE public.no_dues_forms
        SET status = 'completed'
        WHERE id = NEW.form_id;
    ELSE
        -- Otherwise, still pending
        UPDATE public.no_dues_forms
        SET status = 'pending'
        WHERE id = NEW.form_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.7 Trigger: Update form status on department status change
DROP TRIGGER IF EXISTS trigger_update_form_status ON public.no_dues_status;
CREATE TRIGGER trigger_update_form_status
    AFTER INSERT OR UPDATE ON public.no_dues_status
    FOR EACH ROW
    EXECUTE FUNCTION update_form_status_on_department_action();

-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_dues_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_dues_status ENABLE ROW LEVEL SECURITY;

-- 5.1 Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 5.2 Departments Policies (Public read access)
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
CREATE POLICY "Anyone can view departments" ON public.departments
    FOR SELECT USING (true);

-- 5.3 Forms Policies (Phase 1: Public access for students)
DROP POLICY IF EXISTS "Anyone can insert forms" ON public.no_dues_forms;
CREATE POLICY "Anyone can insert forms" ON public.no_dues_forms
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view forms" ON public.no_dues_forms;
CREATE POLICY "Anyone can view forms" ON public.no_dues_forms
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can update forms" ON public.no_dues_forms;
CREATE POLICY "Staff can update forms" ON public.no_dues_forms
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('department', 'admin')
        )
    );

-- 5.4 Status Policies
DROP POLICY IF EXISTS "Anyone can view status" ON public.no_dues_status;
CREATE POLICY "Anyone can view status" ON public.no_dues_status
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Department staff can update own department status" ON public.no_dues_status;
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

DROP POLICY IF EXISTS "Staff can insert status" ON public.no_dues_status;
CREATE POLICY "Staff can insert status" ON public.no_dues_status
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('department', 'admin')
        )
    );

-- ============================================================================
-- SECTION 6: STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets (run in Supabase Dashboard > Storage)
-- 1. alumni-screenshots (public access for upload)
-- 2. certificates (public access for download)

-- Note: Storage bucket policies need to be set via Supabase Dashboard:
-- alumni-screenshots: Allow public upload, allow anyone to read
-- certificates: Allow authenticated users to upload, allow anyone to read

-- ============================================================================
-- SECTION 7: HELPER FUNCTIONS FOR APPLICATION
-- ============================================================================

-- 7.1 Function: Get form statistics
CREATE OR REPLACE FUNCTION get_form_statistics()
RETURNS TABLE (
    total_forms BIGINT,
    pending_forms BIGINT,
    approved_forms BIGINT,
    rejected_forms BIGINT,
    completed_forms BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_forms,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_forms,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_forms,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_forms,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_forms
    FROM public.no_dues_forms;
END;
$$ LANGUAGE plpgsql;

-- 7.2 Function: Get department workload
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
-- SECTION 8: SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================================================

-- Uncomment below to create sample admin and department users
-- Note: Passwords should be set via Supabase Auth Dashboard

/*
-- Sample Admin User
INSERT INTO auth.users (id, email) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'admin@jecrc.ac.in')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role, department_name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@jecrc.ac.in', 'System Administrator', 'admin', NULL)
ON CONFLICT (id) DO NOTHING;

-- Sample Department Users
INSERT INTO auth.users (id, email) VALUES 
    ('00000000-0000-0000-0000-000000000002', 'library@jecrc.ac.in'),
    ('00000000-0000-0000-0000-000000000003', 'accounts@jecrc.ac.in')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role, department_name) VALUES
    ('00000000-0000-0000-0000-000000000002', 'library@jecrc.ac.in', 'Library Manager', 'department', 'library'),
    ('00000000-0000-0000-0000-000000000003', 'accounts@jecrc.ac.in', 'Accounts Manager', 'department', 'accounts')
ON CONFLICT (id) DO NOTHING;
*/

-- ============================================================================
-- SECTION 9: VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify setup
-- SELECT * FROM public.departments ORDER BY display_order;
-- SELECT * FROM public.profiles;
-- SELECT * FROM get_form_statistics();
-- SELECT * FROM get_department_workload();

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================

-- Next Steps:
-- 1. Create storage buckets in Supabase Dashboard
-- 2. Set up storage policies
-- 3. Create admin user via Supabase Auth Dashboard
-- 4. Create department users via Supabase Auth Dashboard
-- 5. Update .env.local with your Supabase credentials
-- 6. Run: npm run dev

-- ============================================================================