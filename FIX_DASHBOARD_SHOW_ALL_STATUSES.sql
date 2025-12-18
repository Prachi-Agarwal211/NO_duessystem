-- ============================================================================
-- FIX: Dashboard Shows 0 Because It Only Queries 'pending' Status
-- ============================================================================
-- Problem: Librarian rejected form → trigger cascade-rejected all depts →
-- form vanished because dashboard query filters for status='pending' only
-- ============================================================================

-- The current issue is that your dashboard shows applications where:
-- no_dues_status.status = 'pending'
--
-- But after you reject one, the trigger sets ALL departments to 'rejected'
-- So there are NO pending rows left to show!
--
-- You have two options:

-- ============================================================================
-- OPTION 1: Show MY department's status (approved/rejected/pending)
-- ============================================================================
-- This would let staff see forms they've already acted on

-- You would need to update dashboard API line 179 from:
-- .eq('status', 'pending')
-- To:
-- (no filter, or filter by action_by_user_id IS NULL for "not yet acted")

-- ============================================================================
-- OPTION 2: Reset the test form to pending so you can test again
-- ============================================================================

-- Reset the rejected form back to pending for ALL departments
UPDATE no_dues_status
SET 
    status = 'pending',
    action_at = NULL,
    action_by_user_id = NULL,
    rejection_reason = NULL
WHERE form_id = '9731880a-fe5e-4608-af72-3a3c261ca40c';

-- Reset the form itself back to pending
UPDATE no_dues_forms
SET status = 'pending'
WHERE id = '9731880a-fe5e-4608-af72-3a3c261ca40c';

-- Verify the reset
SELECT 
    f.registration_no,
    f.student_name,
    f.status as form_status,
    COUNT(CASE WHEN ns.status = 'pending' THEN 1 END) as pending_depts,
    COUNT(CASE WHEN ns.status = 'approved' THEN 1 END) as approved_depts,
    COUNT(CASE WHEN ns.status = 'rejected' THEN 1 END) as rejected_depts
FROM no_dues_forms f
LEFT JOIN no_dues_status ns ON ns.form_id = f.id
WHERE f.id = '9731880a-fe5e-4608-af72-3a3c261ca40c'
GROUP BY f.id, f.registration_no, f.student_name, f.status;

-- Expected result: form_status='pending', pending_depts=7, others=0

-- ============================================================================
-- OPTION 3: Submit a fresh form to test
-- ============================================================================
-- This is the cleanest way - just submit another test form through the UI
-- Then the librarian will see it as a fresh pending application