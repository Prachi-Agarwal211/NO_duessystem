-- Fix orphaned records: Delete status records where the form doesn't exist
-- Form ID: af65d6f9-174f-4d97-a970-d9b4dad7f522

-- First, let's check if there are any orphaned records
SELECT 
    s.form_id,
    COUNT(s.id) as status_count,
    CASE WHEN f.id IS NULL THEN 'ORPHANED' ELSE 'OK' end as status
FROM no_dues_status s
LEFT JOIN no_dues_forms f ON s.form_id = f.id
GROUP BY s.form_id, f.id
HAVING f.id IS NULL;

-- Delete orphaned status records (uncomment to execute)
-- DELETE FROM no_dues_status 
-- WHERE form_id IN (
--     SELECT s.form_id 
--     FROM no_dues_status s
--     LEFT JOIN no_dues_forms f ON s.form_id = f.id
--     WHERE f.id IS NULL
-- );

-- For the specific form mentioned in the error:
-- af65d6f9-174f-4d97-a970-d9b4dad7f522

-- Check this specific form
SELECT 
    'no_dues_forms' as table_name,
    COUNT(*) as record_count
FROM no_dues_forms 
WHERE id = 'af65d6f9-174f-4d97-a970-d9b4dad7f522';

SELECT 
    'no_dues_status' as table_name,
    COUNT(*) as record_count,
    array_agg(department_name) as departments
FROM no_dues_status 
WHERE form_id = 'af65d6f9-174f-4d97-a970-d9b4dad7f522';

-- Delete orphaned status for this specific form (uncomment to execute)
-- DELETE FROM no_dues_status 
-- WHERE form_id = 'af65d6f9-174f-4d97-a970-d9b4dad7f522';
