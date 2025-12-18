-- ============================================================================
-- Check Certificate Generation Status for 22BCOM1367
-- ============================================================================

-- 1. Check the form status
SELECT 
    '1️⃣ FORM STATUS' as step,
    id,
    registration_no,
    student_name,
    status,
    created_at,
    updated_at,
    certificate_url,
    final_certificate_generated
FROM no_dues_forms
WHERE registration_no = '22BCOM1367';

-- 2. Check all department statuses
SELECT 
    '2️⃣ DEPARTMENT STATUSES' as step,
    s.department_name,
    s.status,
    s.action_at,
    s.rejection_reason,
    p.full_name as action_by
FROM no_dues_status s
LEFT JOIN profiles p ON p.id = s.action_by_user_id
WHERE s.form_id = (SELECT id FROM no_dues_forms WHERE registration_no = '22BCOM1367')
ORDER BY s.created_at;

-- 3. Count approved vs total departments
SELECT 
    '3️⃣ APPROVAL PROGRESS' as step,
    COUNT(*) as total_departments,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    CASE 
        WHEN COUNT(*) FILTER (WHERE status = 'approved') = COUNT(*) 
        THEN '✅ ALL APPROVED - Certificate should be generated'
        WHEN COUNT(*) FILTER (WHERE status = 'rejected') > 0 
        THEN '❌ HAS REJECTIONS - Cannot generate certificate'
        ELSE '⏳ WAITING - Still has pending departments'
    END as generation_status
FROM no_dues_status
WHERE form_id = (SELECT id FROM no_dues_forms WHERE registration_no = '22BCOM1367');

-- 4. Check if trigger is working properly
SELECT 
    '4️⃣ DATABASE TRIGGER CHECK' as step,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'no_dues_forms'
AND trigger_name LIKE '%status%';

-- 5. Show what needs to happen for certificate generation
SELECT 
    '5️⃣ CERTIFICATE GENERATION REQUIREMENTS' as step,
    'Form status must be: completed' as requirement_1,
    'All 7 departments must be: approved' as requirement_2,
    'Trigger: after_status_update must update form status' as requirement_3,
    'API: /api/certificate/generate must be called' as requirement_4;

-- 6. Show active departments
SELECT 
    '6️⃣ ACTIVE DEPARTMENTS' as step,
    name,
    display_name,
    display_order
FROM departments
WHERE is_active = true
ORDER BY display_order;