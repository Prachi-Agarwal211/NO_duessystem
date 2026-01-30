-- Set 22BCOM1367 to 6 approved, 1 pending (for dashboard test)
-- Run in Supabase SQL Editor

-- Form ID: 9efc323a-0431-4d52-8744-0c7935917f36
-- User ID: aa1824d9-d7a5-400e-89cb-a99b1d2811fe

-- Step 1: Reset form status to in_progress
UPDATE no_dues_forms SET status = 'in_progress', updated_at = NOW()
WHERE id = '9efc323a-0431-4d52-8744-0c7935917f36';

-- Step 2: Set 6 departments to approved, 1 to pending
DO $$
DECLARE
    v_form_id UUID := '9efc323a-0431-4d52-8744-0c7935917f36';
    v_user_id UUID := 'aa1824d9-d7a5-400e-89cb-a99b1d2811fe';
    v_ids_to_approve UUID[];
BEGIN
    -- First set all to pending
    UPDATE no_dues_status SET status = 'pending', action_at = NULL, action_by_user_id = NULL
    WHERE form_id = v_form_id;

    -- Get 6 IDs to approve
    SELECT array_agg(id) INTO v_ids_to_approve
    FROM no_dues_status
    WHERE form_id = v_form_id
    LIMIT 6;

    -- Approve those 6
    UPDATE no_dues_status
    SET status = 'approved', action_at = NOW(), action_by_user_id = v_user_id
    WHERE id = ANY(v_ids_to_approve);

    RAISE NOTICE 'Set 6 approved, 1 pending';
END $$;

-- Step 3: Verify
SELECT department_name, status FROM no_dues_status
WHERE form_id = '9efc323a-0431-4d52-8744-0c7935917f36'
ORDER BY status;
