-- ============================================================
-- JECRC NO DUES SYSTEM - COMPLETE FIX MIGRATION
-- ============================================================
-- This migration completely separates manual entries from online
-- forms and fixes the department authorization system
--
-- WHAT THIS FIXES:
-- 1. Manual entries no longer pollute online form statistics
-- 2. Librarian (15anuragsingh2003@gmail.com) can reject/approve
-- 3. Proper UUID-based department authorization
-- 4. Each department has ONE designated email/staff
--
-- EXECUTE IN ORDER - DO NOT SKIP STEPS
-- ============================================================

-- ============================================================
-- STEP 1: CREATE SEPARATE TABLE FOR MANUAL ENTRIES
-- ============================================================
-- This completely isolates offline/manual submissions from the
-- online form workflow
-- ============================================================

CREATE TABLE IF NOT EXISTS public.manual_no_dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Student Information
    registration_no TEXT UNIQUE NOT NULL,
    student_name TEXT NOT NULL,
    personal_email TEXT NOT NULL,
    college_email TEXT,
    
    -- Academic Information (UUID Links)
    school_id UUID REFERENCES public.config_schools(id),
    course_id UUID REFERENCES public.config_courses(id),
    branch_id UUID REFERENCES public.config_branches(id),
    
    -- Text versions for display (denormalized for performance)
    school TEXT,
    course TEXT,
    branch TEXT,
    
    -- Contact Information
    country_code TEXT DEFAULT '+91',
    contact_no TEXT,
    admission_year TEXT,
    passing_year TEXT,
    parent_name TEXT,
    
    -- Manual Entry Specific Fields
    certificate_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
    
    -- Approval Tracking
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_manual_no_dues_status ON public.manual_no_dues(status);
CREATE INDEX IF NOT EXISTS idx_manual_no_dues_school ON public.manual_no_dues(school_id);
CREATE INDEX IF NOT EXISTS idx_manual_no_dues_created ON public.manual_no_dues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_no_dues_regno ON public.manual_no_dues(registration_no);

-- Enable RLS
ALTER TABLE public.manual_no_dues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for manual entries (admin only)
CREATE POLICY "Admins can view all manual entries"
ON public.manual_no_dues FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Admins can update manual entries"
ON public.manual_no_dues FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Admins can insert manual entries"
ON public.manual_no_dues FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- ============================================================
-- STEP 2: MIGRATE EXISTING MANUAL ENTRIES
-- ============================================================
-- Move any existing manual entries to the new table
-- ============================================================

DO $$
BEGIN
    -- Check if is_manual_entry column exists before migration
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' 
        AND column_name = 'is_manual_entry'
    ) THEN
        -- Migrate existing manual entries
        INSERT INTO public.manual_no_dues (
            registration_no,
            student_name,
            personal_email,
            college_email,
            school_id,
            course_id,
            branch_id,
            school,
            course,
            branch,
            country_code,
            contact_no,
            admission_year,
            passing_year,
            parent_name,
            certificate_url,
            status,
            approved_by,
            approved_at,
            rejection_reason,
            created_at,
            updated_at
        )
        SELECT 
            registration_no,
            student_name,
            personal_email,
            college_email,
            school_id,
            course_id,
            branch_id,
            school,
            course,
            branch,
            country_code,
            contact_no,
            admission_year,
            passing_year,
            parent_name,
            COALESCE(manual_certificate_url, certificate_url),
            CASE 
                WHEN manual_status = 'approved' THEN 'approved'
                WHEN manual_status = 'rejected' THEN 'rejected'
                ELSE 'pending_review'
            END,
            manual_entry_approved_by,
            manual_entry_approved_at,
            manual_entry_rejection_reason,
            created_at,
            updated_at
        FROM public.no_dues_forms
        WHERE is_manual_entry = true
        ON CONFLICT (registration_no) DO NOTHING;

        RAISE NOTICE 'Migrated % manual entries to new table', 
            (SELECT COUNT(*) FROM public.no_dues_forms WHERE is_manual_entry = true);

        -- Delete migrated manual entries from no_dues_forms
        DELETE FROM public.no_dues_forms WHERE is_manual_entry = true;
        
        RAISE NOTICE 'Deleted manual entries from no_dues_forms table';
    END IF;
END $$;

-- ============================================================
-- STEP 3: CLEAN UP no_dues_forms TABLE
-- ============================================================
-- Remove all manual entry columns - no longer needed
-- ============================================================

ALTER TABLE public.no_dues_forms 
DROP COLUMN IF EXISTS is_manual_entry CASCADE,
DROP COLUMN IF EXISTS manual_status CASCADE,
DROP COLUMN IF EXISTS manual_certificate_url CASCADE,
DROP COLUMN IF EXISTS manual_entry_approved_by CASCADE,
DROP COLUMN IF EXISTS manual_entry_approved_at CASCADE,
DROP COLUMN IF EXISTS manual_entry_rejection_reason CASCADE;

-- ============================================================
-- STEP 4: FIX PROFILE-DEPARTMENT LINKING
-- ============================================================
-- Add UUID array to enable proper department authorization
-- Each staff member is linked to departments by UUID, not text
-- ============================================================

-- Add the UUID array column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS assigned_department_ids UUID[] DEFAULT '{}';

-- Migrate existing department_name to assigned_department_ids
-- This links current staff to their department via UUID
UPDATE public.profiles p
SET assigned_department_ids = ARRAY(
    SELECT d.id 
    FROM public.departments d 
    WHERE d.name = p.department_name
)
WHERE p.role = 'department' 
AND p.department_name IS NOT NULL
AND (p.assigned_department_ids IS NULL OR p.assigned_department_ids = '{}');

-- Log the migration results
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count
    FROM public.profiles
    WHERE role = 'department' 
    AND assigned_department_ids IS NOT NULL 
    AND array_length(assigned_department_ids, 1) > 0;
    
    RAISE NOTICE 'Successfully migrated % staff accounts to UUID-based department linking', migrated_count;
END $$;

-- ============================================================
-- STEP 5: ENSURE ALL ONLINE FORMS HAVE STATUS ROWS
-- ============================================================
-- This fixes the "Librarian can't see forms" issue
-- Every form must have a status row for each department
-- ============================================================

DO $$
DECLARE
    inserted_count INTEGER;
BEGIN
    -- Insert missing status rows for all department-form combinations
    WITH inserted_rows AS (
        INSERT INTO public.no_dues_status (form_id, department_name, status, created_at)
        SELECT f.id, d.name, 'pending', NOW()
        FROM public.no_dues_forms f
        CROSS JOIN public.departments d
        WHERE NOT EXISTS (
            SELECT 1 FROM public.no_dues_status s 
            WHERE s.form_id = f.id AND s.department_name = d.name
        )
        RETURNING *
    )
    SELECT COUNT(*) INTO inserted_count FROM inserted_rows;
    
    RAISE NOTICE 'Created % missing status rows for existing forms', inserted_count;
END $$;

-- ============================================================
-- STEP 6: VERIFY MIGRATION
-- ============================================================
-- Run verification queries to ensure everything is correct
-- ============================================================

DO $$
DECLARE
    online_forms_count INTEGER;
    manual_entries_count INTEGER;
    staff_with_departments INTEGER;
    forms_with_statuses INTEGER;
BEGIN
    -- Count online forms (should have no manual entries)
    SELECT COUNT(*) INTO online_forms_count FROM public.no_dues_forms;
    
    -- Count manual entries in new table
    SELECT COUNT(*) INTO manual_entries_count FROM public.manual_no_dues;
    
    -- Count staff with assigned departments
    SELECT COUNT(*) INTO staff_with_departments 
    FROM public.profiles 
    WHERE role = 'department' 
    AND assigned_department_ids IS NOT NULL 
    AND array_length(assigned_department_ids, 1) > 0;
    
    -- Count forms with complete status records (should be forms * departments)
    SELECT COUNT(*) INTO forms_with_statuses FROM public.no_dues_status;
    
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'MIGRATION VERIFICATION RESULTS';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Online Forms (no_dues_forms): %', online_forms_count;
    RAISE NOTICE 'Manual Entries (manual_no_dues): %', manual_entries_count;
    RAISE NOTICE 'Staff with Department Links: %', staff_with_departments;
    RAISE NOTICE 'Total Status Records: %', forms_with_statuses;
    RAISE NOTICE '=================================================';
    
    -- Verify librarian account specifically
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE email = '15anuragsingh2003@gmail.com'
        AND role = 'department'
        AND array_length(assigned_department_ids, 1) > 0
    ) THEN
        RAISE NOTICE '✅ Librarian account (15anuragsingh2003@gmail.com) correctly configured';
    ELSE
        RAISE WARNING '❌ Librarian account may need manual configuration';
    END IF;
    
    RAISE NOTICE '=================================================';
END $$;

-- ============================================================
-- STEP 7: CREATE HELPER FUNCTION FOR STAFF AUTHORIZATION
-- ============================================================
-- This function checks if a staff member can manage a department
-- Used by APIs for consistent authorization logic
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_manage_department(
    p_user_id UUID,
    p_department_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_authorized BOOLEAN := false;
    v_department_id UUID;
BEGIN
    -- Get department ID from name
    SELECT id INTO v_department_id
    FROM public.departments
    WHERE name = p_department_name;
    
    IF v_department_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user is admin or has department assigned
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_user_id
        AND (
            role = 'admin'
            OR (
                role = 'department'
                AND v_department_id = ANY(assigned_department_ids)
            )
        )
    ) INTO v_is_authorized;
    
    RETURN v_is_authorized;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Next steps:
-- 1. Update API files (staff/action, staff/dashboard, staff/stats)
-- 2. Test librarian login at 15anuragsingh2003@gmail.com
-- 3. Verify manual entries work in admin panel
-- ============================================================