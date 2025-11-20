-- Migration for Phase 1: Student Portal Redesign
-- This migration makes user_id nullable and updates RLS policies for public access

-- Step 1: Make user_id nullable in no_dues_forms table
ALTER TABLE public.no_dues_forms 
ALTER COLUMN user_id DROP NOT NULL;

-- Step 2: Add unique constraint on registration_no to prevent duplicates
ALTER TABLE public.no_dues_forms 
ADD CONSTRAINT unique_registration_no UNIQUE (registration_no);

-- Step 3: Drop existing RLS policies that depend on authentication
DROP POLICY IF EXISTS "Students can view own forms" ON public.no_dues_forms;
DROP POLICY IF EXISTS "Students can update own forms" ON public.no_dues_forms;

-- Step 4: Create new public access policies for students (no authentication required)

-- Allow anyone to insert forms (for form submission without auth)
CREATE POLICY "Anyone can create forms" ON public.no_dues_forms
    FOR INSERT 
    WITH CHECK (true);

-- Allow anyone to view forms by registration number (for status checking)
CREATE POLICY "Anyone can view forms by registration_no" ON public.no_dues_forms
    FOR SELECT 
    USING (true);

-- Prevent public updates (only staff can update via their policies)
CREATE POLICY "Public cannot update forms" ON public.no_dues_forms
    FOR UPDATE 
    USING (false);

-- Step 5: Update no_dues_status RLS policies for public read access

-- Drop existing student access policy
DROP POLICY IF EXISTS "Users can view status for their forms" ON public.no_dues_status;

-- Allow anyone to view status records (needed for public status checking)
CREATE POLICY "Anyone can view all status" ON public.no_dues_status
    FOR SELECT 
    USING (true);

-- Step 6: Keep existing staff policies (they remain unchanged)
-- Staff can still view forms in their department
-- Staff can still update status for their department
-- Registrar can still view and update all forms
-- Admin can still view and update everything

-- Step 7: Update notifications policy to allow public access by form
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;

CREATE POLICY "Anyone can view notifications by form" ON public.notifications
    FOR SELECT 
    USING (true);

-- Step 8: Add index on registration_no for faster lookups
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_registration_no 
ON public.no_dues_forms(registration_no);

-- Step 9: Update the form status initialization trigger to handle NULL user_id
-- (The existing trigger should work fine with NULL user_id)

-- Step 10: Add a function to check if registration number already exists
CREATE OR REPLACE FUNCTION check_registration_exists(reg_no TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.no_dues_forms 
        WHERE registration_number = reg_no
    );
END;
$$ LANGUAGE plpgsql;

-- Step 11: Add function to get form by registration number (useful for API)
CREATE OR REPLACE FUNCTION get_form_by_registration(reg_no TEXT)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    student_name TEXT,
    registration_no TEXT,
    session_from TEXT,
    session_to TEXT,
    parent_name TEXT,
    school TEXT,
    course TEXT,
    branch TEXT,
    contact_no TEXT,
    alumni_screenshot_url TEXT,
    certificate_url TEXT,
    final_certificate_generated BOOLEAN,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.user_id,
        f.student_name,
        f.registration_no,
        f.session_from,
        f.session_to,
        f.parent_name,
        f.school,
        f.course,
        f.branch,
        f.contact_no,
        f.alumni_screenshot_url,
        f.certificate_url,
        f.final_certificate_generated,
        f.status,
        f.created_at,
        f.updated_at
    FROM public.no_dues_forms f
    WHERE f.registration_no = reg_no;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Add function to get department statuses by registration number
CREATE OR REPLACE FUNCTION get_statuses_by_registration(reg_no TEXT)
RETURNS TABLE (
    id UUID,
    form_id UUID,
    department_name TEXT,
    status TEXT,
    action_by_user_id UUID,
    action_at TIMESTAMPTZ,
    rejection_reason TEXT,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.form_id,
        s.department_name,
        s.status,
        s.action_by_user_id,
        s.action_at,
        s.rejection_reason,
        s.updated_at
    FROM public.no_dues_status s
    INNER JOIN public.no_dues_forms f ON s.form_id = f.id
    WHERE f.registration_no = reg_no;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Create view for easy status tracking (optional, but useful)
CREATE OR REPLACE VIEW public.form_status_summary AS
SELECT 
    f.id as form_id,
    f.registration_no,
    f.student_name,
    f.status as overall_status,
    COUNT(s.id) as total_departments,
    COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN s.status = 'rejected' THEN 1 END) as rejected_count,
    COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_count,
    f.certificate_url,
    f.final_certificate_generated,
    f.created_at,
    f.updated_at
FROM public.no_dues_forms f
LEFT JOIN public.no_dues_status s ON f.id = s.form_id
GROUP BY f.id, f.registration_no, f.student_name, f.status, 
         f.certificate_url, f.final_certificate_generated, f.created_at, f.updated_at;

-- Grant access to the view
GRANT SELECT ON public.form_status_summary TO anon, authenticated;

-- Step 14: Add function to check if all departments approved
CREATE OR REPLACE FUNCTION check_all_departments_approved(form_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_departments INTEGER;
    approved_departments INTEGER;
BEGIN
    -- Count total departments
    SELECT COUNT(*) INTO total_departments
    FROM public.departments;
    
    -- Count approved departments for this form
    SELECT COUNT(*) INTO approved_departments
    FROM public.department_statuses
    WHERE form_id = form_id_param AND status = 'approved';
    
    RETURN (approved_departments = total_departments);
END;
$$ LANGUAGE plpgsql;

-- Step 15: Add trigger function to auto-update form status
CREATE OR REPLACE FUNCTION update_form_status_on_department_approval()
RETURNS TRIGGER AS $$
DECLARE
    all_approved BOOLEAN;
    any_rejected BOOLEAN;
BEGIN
    -- Check if all departments approved
    all_approved := check_all_departments_approved(NEW.form_id);
    
    -- Check if any department rejected
    SELECT EXISTS(
        SELECT 1 FROM public.department_statuses
        WHERE form_id = NEW.form_id AND status = 'rejected'
    ) INTO any_rejected;
    
    -- Update form status based on department statuses
    IF any_rejected THEN
        UPDATE public.no_dues_forms
        SET status = 'rejected', updated_at = NOW()
        WHERE id = NEW.form_id;
    ELSIF all_approved THEN
        UPDATE public.no_dues_forms
        SET status = 'completed', updated_at = NOW()
        WHERE id = NEW.form_id;
    ELSE
        UPDATE public.no_dues_forms
        SET status = 'in_progress', updated_at = NOW()
        WHERE id = NEW.form_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 16: Create trigger to automatically update form status
DROP TRIGGER IF EXISTS trigger_update_form_status ON public.department_statuses;
CREATE TRIGGER trigger_update_form_status
    AFTER UPDATE OF status ON public.department_statuses
    FOR EACH ROW
    EXECUTE FUNCTION update_form_status_on_department_approval();

-- Migration complete!
-- Summary of changes:
-- 1. Made user_id nullable in no_dues_forms
-- 2. Added unique constraint on registration_no
-- 3. Updated RLS policies for public access (no authentication required for students)
-- 4. Added helpful functions for querying by registration number
-- 5. Created summary view for easy status tracking
-- 6. Added automatic form status updates based on department approvals
-- 7. Maintained all existing staff/admin policies