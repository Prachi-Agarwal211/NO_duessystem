-- ============================================================================
-- CHECK DEPARTMENT STATUSES FOR MOST RECENT FORM
-- ============================================================================

-- 1. Show most recent form details
SELECT
    'Most Recent Form' as check_type,
    id::text,
    registration_no,
    student_name,
    status as form_status,
    created_at::text
FROM no_dues_forms
ORDER BY created_at DESC
LIMIT 1;

-- 2. Show all department statuses for the most recent form
SELECT
    'Department Status Records' as check_type,
    department_name,
    status,
    COALESCE(action_at::text, 'Not actioned yet') as action_time,
    COALESCE(rejection_reason, '-') as reason,
    created_at::text
FROM no_dues_status
WHERE form_id = (
    SELECT id FROM no_dues_forms ORDER BY created_at DESC LIMIT 1
)
ORDER BY department_name;

-- 3. Summary count for most recent form
SELECT
    'Status Summary' as check_type,
    COUNT(*)::text as total_records,
    COUNT(*) FILTER (WHERE status = 'pending')::text as pending_count,
    COUNT(*) FILTER (WHERE status = 'approved')::text as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected')::text as rejected_count,
    ''::text as empty_col,
    ''::text as empty_col2
FROM no_dues_status
WHERE form_id = (
    SELECT id FROM no_dues_forms ORDER BY created_at DESC LIMIT 1
);