-- ========================================================================
-- RESET FORMS TO PENDING FOR TESTING
-- Run this in Supabase SQL Editor
-- ========================================================================

-- Option 1: Reset a SPECIFIC form's library status to pending
-- Replace 'YOUR_FORM_ID' with the actual form ID
UPDATE public.no_dues_status
SET status = 'pending', 
    action_at = NULL, 
    action_by_user_id = NULL,
    rejection_reason = NULL
WHERE form_id = 'ec4fa25a-493d-40f6-a1c7-b939fee4466b'  -- This is the form that just got approved
  AND department_name = 'library';

-- Also reset the form's status back to processing
UPDATE public.no_dues_forms
SET status = 'processing',
    certificate_url = NULL,
    blockchain_hash = NULL,
    blockchain_tx = NULL,
    final_certificate_generated = false
WHERE id = 'ec4fa25a-493d-40f6-a1c7-b939fee4466b';

-- ========================================================================
-- Option 2: Reset ALL pending forms for library department (for bulk testing)
-- Uncomment below if needed
-- ========================================================================
-- UPDATE public.no_dues_status
-- SET status = 'pending', action_at = NULL, action_by_user_id = NULL
-- WHERE department_name = 'library' AND status = 'approved';

-- ========================================================================
-- Verify the reset
-- ========================================================================
SELECT 
  f.id,
  f.student_name,
  f.registration_no,
  f.status as form_status,
  s.department_name,
  s.status as dept_status
FROM public.no_dues_forms f
JOIN public.no_dues_status s ON s.form_id = f.id
WHERE f.id = 'ec4fa25a-493d-40f6-a1c7-b939fee4466b'
ORDER BY s.department_name;
