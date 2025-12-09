-- ============================================================================
-- UPDATE MANUAL ENTRIES TABLE - SIMPLIFIED VERSION
-- ============================================================================
-- This script updates the manual_entries table to only store essential fields
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Drop the old table if it exists (CAUTION: This will delete existing data!)
DROP TABLE IF EXISTS public.manual_entries CASCADE;

-- Create simplified manual_entries table
-- ONLY stores: registration_no, school, course, branch, certificate_url
CREATE TABLE public.manual_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_no TEXT NOT NULL UNIQUE,
    
    -- School/Course/Branch (text + foreign keys for validation)
    school TEXT NOT NULL,
    course TEXT NOT NULL,
    branch TEXT,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    
    -- Certificate file URL
    certificate_url TEXT NOT NULL,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    
    -- Approval tracking
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure registration number is valid format
    CONSTRAINT check_registration_format CHECK (registration_no ~* '^[0-9]{2}[A-Z]{2,6}[0-9]{3,4}$')
);

-- Create indexes for performance
CREATE INDEX idx_manual_entries_registration ON public.manual_entries(registration_no);
CREATE INDEX idx_manual_entries_status ON public.manual_entries(status);
CREATE INDEX idx_manual_entries_created ON public.manual_entries(created_at DESC);
CREATE INDEX idx_manual_entries_school ON public.manual_entries(school);
CREATE INDEX idx_manual_entries_course ON public.manual_entries(course);
CREATE INDEX idx_manual_entries_branch ON public.manual_entries(branch) WHERE branch IS NOT NULL;

-- Composite index for department staff filtering
CREATE INDEX idx_manual_entries_scope ON public.manual_entries(school, course, branch, status);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_manual_entries_updated_at
    BEFORE UPDATE ON public.manual_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.manual_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- 1. Anyone can insert (students can submit)
CREATE POLICY "Anyone can submit manual entries" 
ON public.manual_entries
FOR INSERT 
WITH CHECK (true);

-- 2. Anyone can view all manual entries (for checking duplicates)
CREATE POLICY "Anyone can view manual entries" 
ON public.manual_entries
FOR SELECT 
USING (true);

-- 3. Department staff can update entries matching their scope
CREATE POLICY "Department staff can manage their scope" 
ON public.manual_entries
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.role = 'staff'
        AND p.department_name = 'Department'
        AND (p.school IS NULL OR p.school = manual_entries.school)
        AND (p.course IS NULL OR p.course = manual_entries.course)
        AND (p.branch IS NULL OR p.branch = manual_entries.branch)
    )
);

-- 4. Admin can update all
CREATE POLICY "Admin can manage all manual entries" 
ON public.manual_entries
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 5. Admin can delete
CREATE POLICY "Admin can delete manual entries" 
ON public.manual_entries
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Add helpful comments
COMMENT ON TABLE public.manual_entries IS 'Simplified table for offline certificate registrations. Only stores essential data: registration_no, school, course, branch, certificate_url';
COMMENT ON COLUMN public.manual_entries.registration_no IS 'Student registration number - must be unique';
COMMENT ON COLUMN public.manual_entries.school IS 'School name - used for department staff filtering';
COMMENT ON COLUMN public.manual_entries.course IS 'Course name - used for department staff filtering';
COMMENT ON COLUMN public.manual_entries.branch IS 'Branch/specialization - optional, used for department staff filtering';
COMMENT ON COLUMN public.manual_entries.certificate_url IS 'Public URL to the uploaded certificate file (PDF/image)';

-- Create view for easy querying with joined data
CREATE OR REPLACE VIEW vw_manual_entries_with_details AS
SELECT 
    me.*,
    s.name as school_name_validated,
    c.name as course_name_validated,
    b.name as branch_name_validated,
    p.full_name as approved_by_name,
    p.email as approved_by_email
FROM public.manual_entries me
LEFT JOIN public.schools s ON me.school_id = s.id
LEFT JOIN public.courses c ON me.course_id = c.id
LEFT JOIN public.branches b ON me.branch_id = b.id
LEFT JOIN public.profiles p ON me.approved_by = p.id;

COMMENT ON VIEW vw_manual_entries_with_details IS 'Manual entries with joined school/course/branch names and approver details';

-- Verification
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Check table exists
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'manual_entries';
    
    -- Check indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'manual_entries';
    
    -- Check policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'manual_entries';
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Manual Entries Table Update Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Table created: %', CASE WHEN table_count > 0 THEN '✓' ELSE '✗' END;
    RAISE NOTICE 'Indexes created: % (expected: 7)', index_count;
    RAISE NOTICE 'RLS policies created: % (expected: 5)', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Schema Summary:';
    RAISE NOTICE '  • registration_no (TEXT, UNIQUE, REQUIRED)';
    RAISE NOTICE '  • school (TEXT, REQUIRED)';
    RAISE NOTICE '  • course (TEXT, REQUIRED)';
    RAISE NOTICE '  • branch (TEXT, OPTIONAL)';
    RAISE NOTICE '  • certificate_url (TEXT, REQUIRED)';
    RAISE NOTICE '  • status (pending/approved/rejected)';
    RAISE NOTICE '';
    RAISE NOTICE 'Key Features:';
    RAISE NOTICE '  ✓ Simplified to essential fields only';
    RAISE NOTICE '  ✓ Department staff scope filtering';
    RAISE NOTICE '  ✓ Automatic duplicate prevention';
    RAISE NOTICE '  ✓ RLS policies for security';
    RAISE NOTICE '============================================';
END $$;

COMMIT;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Example 1: Insert a manual entry
INSERT INTO manual_entries (
    registration_no, school, course, branch, 
    school_id, course_id, branch_id, certificate_url
) VALUES (
    '21JEECS001',
    'School of Engineering',
    'B.Tech Computer Science',
    'Fourth Year',
    (SELECT id FROM schools WHERE name = 'School of Engineering'),
    (SELECT id FROM courses WHERE name = 'B.Tech Computer Science'),
    (SELECT id FROM branches WHERE name = 'Fourth Year'),
    'https://storage.supabase.co/..../certificate.pdf'
);

-- Example 2: Query manual entries for a specific department staff
-- (Staff for School of Engineering, B.Tech CS)
SELECT * FROM manual_entries
WHERE school = 'School of Engineering'
  AND course = 'B.Tech Computer Science'
  AND status = 'pending'
ORDER BY created_at DESC;

-- Example 3: Approve a manual entry
UPDATE manual_entries
SET 
    status = 'approved',
    approved_by = 'staff-user-id',
    approved_at = NOW()
WHERE registration_no = '21JEECS001';

-- Example 4: View all manual entries with details
SELECT * FROM vw_manual_entries_with_details
ORDER BY created_at DESC;
*/