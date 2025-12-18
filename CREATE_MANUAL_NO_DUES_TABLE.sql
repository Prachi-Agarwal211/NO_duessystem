-- ============================================================================
-- CREATE MANUAL NO DUES TABLE
-- ============================================================================
-- This creates the separate table for manual/offline entries
-- The RPC function expects this table to exist
-- ============================================================================

-- Create the manual_no_dues table
CREATE TABLE IF NOT EXISTS public.manual_no_dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_no TEXT UNIQUE NOT NULL,
    student_name TEXT NOT NULL,
    personal_email TEXT NOT NULL,
    college_email TEXT,
    contact_no TEXT,
    country_code TEXT DEFAULT '+91',
    parent_name TEXT,
    admission_year TEXT,
    passing_year TEXT,
    school_id UUID REFERENCES public.config_schools(id),
    course_id UUID REFERENCES public.config_courses(id),
    branch_id UUID REFERENCES public.config_branches(id),
    school TEXT,
    course TEXT,
    branch TEXT,
    certificate_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_manual_no_dues_registration_no ON public.manual_no_dues(registration_no);
CREATE INDEX IF NOT EXISTS idx_manual_no_dues_status ON public.manual_no_dues(status);
CREATE INDEX IF NOT EXISTS idx_manual_no_dues_school_course ON public.manual_no_dues(school_id, course_id);

-- Enable RLS
ALTER TABLE public.manual_no_dues ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can do everything on manual_no_dues"
    ON public.manual_no_dues
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Staff can view manual entries"
    ON public.manual_no_dues
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'department')
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_no_dues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_no_dues TO service_role;

-- Test the table
SELECT '=== Manual No Dues Table Created ===' as status;
SELECT COUNT(*) as row_count FROM public.manual_no_dues;

-- Verify the RPC function now works
SELECT '=== Testing get_manual_entry_statistics() ===' as test;
SELECT * FROM get_manual_entry_statistics();