-- Manually trigger certificate generation for 22BCOM1367
-- Run in Supabase SQL Editor

-- First, get the form_id
SELECT id, registration_no, student_name, status FROM no_dues_forms WHERE registration_no = '22BCOM1367';

-- Then manually trigger the certificate generation by calling the finalize_certificate function
-- You'll need to call this via the API or create a one-time trigger

-- Option 1: If there's a PostgreSQL function for certificate generation
-- SELECT generate_certificate('form-id-here');

-- Option 2: Update the form to trigger the certificate generation
-- The certificate will be generated when status changes to 'completed'
-- Since status is already 'completed', we need to manually trigger it

-- Let's check if there's a certificate generation function
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%cert%' AND routine_schema = 'public';
