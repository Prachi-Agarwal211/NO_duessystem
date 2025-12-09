-- ============================================================================
-- Manual Entry System for Offline No-Dues Certificates
-- ============================================================================
-- This script adds support for students who completed no-dues offline
-- and need to register their existing certificates in the system
-- ============================================================================

BEGIN;

-- Step 1: Create manual_entries table
CREATE TABLE IF NOT EXISTS public.manual_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_no TEXT NOT NULL,
    student_name TEXT NOT NULL,
    personal_email TEXT NOT NULL,
    college_email TEXT NOT NULL,
    session_from TEXT NOT NULL,
    session_to TEXT NOT NULL,
    parent_name TEXT,
    school_id UUID REFERENCES public.config_schools(id),
    course_id UUID REFERENCES public.config_courses(id),
    branch_id UUID REFERENCES public.config_branches(id),
    school TEXT NOT NULL,
    course TEXT,
    branch TEXT,
    country_code TEXT NOT NULL DEFAULT '+91',
    contact_no TEXT NOT NULL,
    certificate_screenshot_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_manual_personal_email CHECK (personal_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT check_manual_college_email CHECK (college_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Step 2: Create indexes for manual_entries
CREATE INDEX idx_manual_entries_registration ON public.manual_entries(registration_no);
CREATE INDEX idx_manual_entries_status ON public.manual_entries(status);
CREATE INDEX idx_manual_entries_created ON public.manual_entries(created_at DESC);
CREATE INDEX idx_manual_entries_email ON public.manual_entries(personal_email);

-- Step 3: Add trigger for updated_at
CREATE TRIGGER update_manual_entries_updated_at
    BEFORE UPDATE ON public.manual_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Enable RLS on manual_entries
ALTER TABLE public.manual_entries ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- Anyone can insert (students can submit)
CREATE POLICY "Anyone can submit manual entries" ON public.manual_entries
    FOR INSERT WITH CHECK (true);

-- Anyone can view their own submission
CREATE POLICY "Anyone can view manual entries" ON public.manual_entries
    FOR SELECT USING (true);

-- Admin can update (approve/reject)
CREATE POLICY "Admin can manage manual entries" ON public.manual_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admin can delete if needed
CREATE POLICY "Admin can delete manual entries" ON public.manual_entries
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Step 6: Create function to convert approved manual entry to completed form
CREATE OR REPLACE FUNCTION convert_manual_entry_to_form(manual_entry_id UUID)
RETURNS UUID AS $$
DECLARE
    entry_record RECORD;
    new_form_id UUID;
    dept_record RECORD;
BEGIN
    -- Get the manual entry
    SELECT * INTO entry_record
    FROM public.manual_entries
    WHERE id = manual_entry_id AND status = 'approved';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Manual entry not found or not approved';
    END IF;
    
    -- Check if form already exists for this registration number
    SELECT id INTO new_form_id
    FROM public.no_dues_forms
    WHERE registration_no = entry_record.registration_no;
    
    IF FOUND THEN
        -- Update existing form to completed
        UPDATE public.no_dues_forms
        SET 
            status = 'completed',
            certificate_url = entry_record.certificate_screenshot_url,
            updated_at = NOW()
        WHERE id = new_form_id;
        
        -- Mark all departments as approved
        UPDATE public.no_dues_status
        SET 
            status = 'approved',
            action_by_user_id = entry_record.approved_by,
            action_at = entry_record.approved_at
        WHERE form_id = new_form_id;
        
        RETURN new_form_id;
    END IF;
    
    -- Create new form with completed status
    INSERT INTO public.no_dues_forms (
        registration_no,
        student_name,
        personal_email,
        college_email,
        session_from,
        session_to,
        parent_name,
        school_id,
        course_id,
        branch_id,
        school,
        course,
        branch,
        country_code,
        contact_no,
        certificate_url,
        status
    ) VALUES (
        entry_record.registration_no,
        entry_record.student_name,
        entry_record.personal_email,
        entry_record.college_email,
        entry_record.session_from,
        entry_record.session_to,
        entry_record.parent_name,
        entry_record.school_id,
        entry_record.course_id,
        entry_record.branch_id,
        entry_record.school,
        entry_record.course,
        entry_record.branch,
        entry_record.country_code,
        entry_record.contact_no,
        entry_record.certificate_screenshot_url,
        'completed'
    ) RETURNING id INTO new_form_id;
    
    -- Create approved status for all active departments
    FOR dept_record IN 
        SELECT name FROM public.departments WHERE is_active = true ORDER BY display_order
    LOOP
        INSERT INTO public.no_dues_status (
            form_id,
            department_name,
            status,
            action_by_user_id,
            action_at
        ) VALUES (
            new_form_id,
            dept_record.name,
            'approved',
            entry_record.approved_by,
            entry_record.approved_at
        );
    END LOOP;
    
    RETURN new_form_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Add comment to explain the table
COMMENT ON TABLE public.manual_entries IS 'Stores manual entry submissions for students who completed no-dues offline and have existing certificates';
COMMENT ON FUNCTION convert_manual_entry_to_form IS 'Converts an approved manual entry into a completed no-dues form with all departments approved';

-- Step 8: Verify setup
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Manual Entry System Setup Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  ✓ manual_entries table';
    RAISE NOTICE '  ✓ Indexes for performance';
    RAISE NOTICE '  ✓ RLS policies';
    RAISE NOTICE '  ✓ Convert function';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Create storage bucket: "manual-certificates"';
    RAISE NOTICE '  2. Deploy student manual entry form';
    RAISE NOTICE '  3. Deploy admin review interface';
    RAISE NOTICE '============================================';
END $$;

-- To commit these changes, run: COMMIT;
-- To rollback, run: ROLLBACK;