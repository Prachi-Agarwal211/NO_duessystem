-- Check form status and certificate generation for 22BCOM1367
-- Run in Supabase SQL Editor

-- Check form status
SELECT id, registration_no, student_name, status, final_certificate_generated, certificate_url, blockchain_tx
FROM no_dues_forms
WHERE registration_no = '22BCOM1367';

-- Check all department statuses
SELECT department_name, status, action_at, action_by_user_id
FROM no_dues_status
WHERE form_id = (SELECT id FROM no_dues_forms WHERE registration_no = '22BCOM1367')
ORDER BY status;

-- If certificate_url is not null, the certificate was generated
SELECT
    CASE
        WHEN certificate_url IS NOT NULL THEN '✅ Certificate Generated'
        WHEN final_certificate_generated = true THEN '⚠️ Final flag set but no URL'
        ELSE '❌ Certificate NOT generated'
    END as certificate_status,
    certificate_url,
    blockchain_tx,
    status as form_status
FROM no_dues_forms
WHERE registration_no = '22BCOM1367';
