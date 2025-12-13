-- ============================================
-- CLEANUP OLD STUDENT DATA
-- ============================================
-- This script helps you identify and remove old/orphaned student records
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: CHECK WHAT DATA EXISTS
-- ============================================

-- Check all students in no_dues_forms
SELECT 
    id,
    registration_no,
    student_name,
    status,
    created_at,
    updated_at
FROM no_dues_forms
ORDER BY created_at DESC;

-- Count total forms
SELECT COUNT(*) as total_forms FROM no_dues_forms;

-- ============================================
-- STEP 2: CHECK FOR ORPHANED STATUS RECORDS
-- ============================================

-- Find status records without a matching form (orphaned)
SELECT 
    ns.id,
    ns.form_id,
    ns.department_name,
    ns.status,
    'ORPHANED - No matching form' as issue
FROM no_dues_status ns
LEFT JOIN no_dues_forms ndf ON ns.form_id = ndf.id
WHERE ndf.id IS NULL;

-- Count orphaned status records
SELECT COUNT(*) as orphaned_status_records
FROM no_dues_status ns
LEFT JOIN no_dues_forms ndf ON ns.form_id = ndf.id
WHERE ndf.id IS NULL;

-- ============================================
-- STEP 3: FIND SPECIFIC STUDENT (If you know registration number)
-- ============================================

-- Replace '21BCON750' with the registration number you're seeing
SELECT 
    ndf.*,
    (SELECT json_agg(json_build_object(
        'department', department_name,
        'status', status,
        'rejection_reason', rejection_reason,
        'action_at', action_at
    ))
    FROM no_dues_status
    WHERE form_id = ndf.id) as department_statuses
FROM no_dues_forms ndf
WHERE registration_no = '21BCON750';

-- ============================================
-- STEP 4: DELETE SPECIFIC STUDENT DATA (CAREFUL!)
-- ============================================

-- ⚠️ CAUTION: This will permanently delete data
-- Uncomment the lines below to delete a specific student

-- Delete statuses first (due to foreign key)
-- DELETE FROM no_dues_status
-- WHERE form_id IN (
--     SELECT id FROM no_dues_forms WHERE registration_no = '21BCON750'
-- );

-- Then delete the form
-- DELETE FROM no_dues_forms WHERE registration_no = '21BCON750';

-- ============================================
-- STEP 5: DELETE ALL STUDENT DATA (NUCLEAR OPTION)
-- ============================================

-- ⚠️⚠️⚠️ EXTREME CAUTION: This deletes ALL student applications
-- Only use this if you want to completely reset the system
-- Uncomment to execute:

-- DELETE FROM no_dues_status;
-- DELETE FROM no_dues_forms;
-- Note: Manual entries are stored in no_dues_forms with is_manual_entry=true

-- Reset sequences (optional - to start IDs from 1 again)
-- ALTER SEQUENCE no_dues_forms_id_seq RESTART WITH 1;
-- ALTER SEQUENCE no_dues_status_id_seq RESTART WITH 1;

-- ============================================
-- STEP 6: CLEAN UP ORPHANED RECORDS
-- ============================================

-- Delete orphaned status records (safe cleanup)
DELETE FROM no_dues_status
WHERE form_id NOT IN (SELECT id FROM no_dues_forms);

-- Verify cleanup
SELECT COUNT(*) as remaining_orphaned_records
FROM no_dues_status ns
LEFT JOIN no_dues_forms ndf ON ns.form_id = ndf.id
WHERE ndf.id IS NULL;

-- ============================================
-- STEP 7: CHECK MANUAL ENTRIES
-- ============================================

-- Manual entries are stored in no_dues_forms with is_manual_entry=true
SELECT
    id,
    registration_no,
    student_name,
    status,
    is_manual_entry,
    manual_certificate_url,
    created_at
FROM no_dues_forms
WHERE is_manual_entry = true
ORDER BY created_at DESC;

-- Delete specific manual entry
-- DELETE FROM no_dues_status WHERE form_id IN (
--     SELECT id FROM no_dues_forms WHERE registration_no = '21BCON750' AND is_manual_entry = true
-- );
-- DELETE FROM no_dues_forms WHERE registration_no = '21BCON750' AND is_manual_entry = true;

-- Delete all manual entries
-- DELETE FROM no_dues_status WHERE form_id IN (
--     SELECT id FROM no_dues_forms WHERE is_manual_entry = true
-- );
-- DELETE FROM no_dues_forms WHERE is_manual_entry = true;

-- ============================================
-- STEP 8: VERIFY CLEAN STATE
-- ============================================

-- Check final counts
SELECT
    'no_dues_forms (online)' as table_name,
    COUNT(*) as record_count
FROM no_dues_forms
WHERE is_manual_entry = false
UNION ALL
SELECT
    'no_dues_forms (manual)' as table_name,
    COUNT(*) as record_count
FROM no_dues_forms
WHERE is_manual_entry = true
UNION ALL
SELECT
    'no_dues_status' as table_name,
    COUNT(*) as record_count
FROM no_dues_status;

-- ============================================
-- ADDITIONAL: Clear Supabase Storage (if needed)
-- ============================================

-- List all files in no-dues-certificates bucket
-- Note: You'll need to delete these manually in Supabase Storage UI
-- or use the Supabase API

-- Check for any files that might be cached
SELECT 
    id,
    registration_no,
    alumni_screenshot_url
FROM no_dues_forms
WHERE alumni_screenshot_url IS NOT NULL;