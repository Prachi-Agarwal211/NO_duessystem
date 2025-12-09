-- ============================================================================
-- ADD MANUAL ENTRY FLAG TO NO_DUES_FORMS TABLE
-- ============================================================================
-- This adds a flag to mark forms that were completed manually offline
-- and registered later for record-keeping
-- ============================================================================

BEGIN;

-- Add column to track manual entries
ALTER TABLE public.no_dues_forms 
ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT false;

-- Add column to store the offline certificate proof URL
ALTER TABLE public.no_dues_forms
ADD COLUMN IF NOT EXISTS manual_certificate_url TEXT;

-- Create index for filtering manual entries
CREATE INDEX IF NOT EXISTS idx_forms_manual_entry 
ON public.no_dues_forms(is_manual_entry) 
WHERE is_manual_entry = true;

-- Add comments
COMMENT ON COLUMN public.no_dues_forms.is_manual_entry IS 'True if this form was registered for an offline/manual no-dues certificate';
COMMENT ON COLUMN public.no_dues_forms.manual_certificate_url IS 'URL to the uploaded offline certificate proof (PDF/image)';

-- Verification
DO $$
DECLARE
    manual_col_exists BOOLEAN;
    cert_col_exists BOOLEAN;
BEGIN
    -- Check if columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'no_dues_forms' 
        AND column_name = 'is_manual_entry'
    ) INTO manual_col_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'no_dues_forms' 
        AND column_name = 'manual_certificate_url'
    ) INTO cert_col_exists;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Manual Entry Flag Added to no_dues_forms!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'is_manual_entry column: %', CASE WHEN manual_col_exists THEN '✓' ELSE '✗' END;
    RAISE NOTICE 'manual_certificate_url column: %', CASE WHEN cert_col_exists THEN '✓' ELSE '✗' END;
    RAISE NOTICE '';
    RAISE NOTICE 'How it works:';
    RAISE NOTICE '  1. Student registers offline certificate';
    RAISE NOTICE '  2. Form created in no_dues_forms with is_manual_entry=true';
    RAISE NOTICE '  3. Status set to "pending" for Department verification';
    RAISE NOTICE '  4. Once verified, Department approves → status="completed"';
    RAISE NOTICE '  5. Prevents duplicate online form submission';
    RAISE NOTICE '============================================';
END $$;

COMMIT;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Example 1: Create a manual entry (what the API will do)
INSERT INTO no_dues_forms (
    registration_no,
    student_name,
    email,
    phone,
    school,
    course,
    branch,
    semester,
    reason_for_request,
    id_card_path,
    is_manual_entry,
    manual_certificate_url,
    status
) VALUES (
    '21JEECS999',
    'Manual Entry Student',
    'student@example.com',
    '9999999999',
    'School of Engineering',
    'B.Tech Computer Science', 
    'Fourth Year',
    '8',
    'Offline Certificate Registration',
    NULL, -- No ID card needed for manual
    true, -- This is a manual entry
    'https://storage.supabase.co/.../offline_cert.pdf',
    'pending' -- Pending department verification
);

-- Example 2: Check if student already has manual entry
SELECT * FROM no_dues_forms 
WHERE registration_no = '21JEECS999' 
AND is_manual_entry = true;

-- Example 3: Department approves manual entry
UPDATE no_dues_status
SET status = 'approved',
    comment = 'Offline certificate verified',
    action_at = NOW(),
    action_by_user_id = 'staff-uuid'
WHERE form_id = (
    SELECT id FROM no_dues_forms 
    WHERE registration_no = '21JEECS999' 
    AND is_manual_entry = true
)
AND department_name = 'Department';

-- Example 4: Query all manual entries
SELECT 
    registration_no,
    student_name,
    school,
    course,
    branch,
    status,
    manual_certificate_url,
    created_at
FROM no_dues_forms
WHERE is_manual_entry = true
ORDER BY created_at DESC;

-- Example 5: Prevent duplicate submission (check in API)
SELECT COUNT(*) FROM no_dues_forms
WHERE registration_no = '21JEECS999';
-- If count > 0, reject new submission (either manual or online exists)
*/