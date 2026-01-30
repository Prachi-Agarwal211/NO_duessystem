-- Script to approve 6 departments for student 22BCOM1367 (ANURAG SINGH)
-- Run this in Supabase SQL Editor

-- Step 1: Form ID and Admin User ID from previous query
-- Form ID: 9efc323a-0431-4d52-8744-0c7935917f36
-- Admin User ID: aa1824d9-d7a5-400e-89cb-a99b1d2811fe

-- Step 2: Check current department status
SELECT id, department_name, status FROM no_dues_status WHERE form_id = '9efc323a-0431-4d52-8744-0c7935917f36' ORDER BY status;

-- Step 3: Approve 6 departments (leave 1 pending)
DO $$
DECLARE
    v_form_id UUID := '9efc323a-0431-4d52-8744-0c7935917f36';
    v_user_id UUID := 'aa1824d9-d7a5-400e-89cb-a99b1d2811fe';
    v_dept_count INTEGER;
    v_ids_to_approve UUID[];
BEGIN
    -- Count current approved departments
    SELECT COUNT(*) INTO v_dept_count FROM no_dues_status WHERE form_id = v_form_id AND status = 'approved';
    RAISE NOTICE 'Currently approved: %', v_dept_count;

    IF v_dept_count < 6 THEN
        -- Get the IDs of pending departments to approve
        SELECT array_agg(id) INTO v_ids_to_approve
        FROM no_dues_status
        WHERE form_id = v_form_id AND status = 'pending'
        LIMIT (6 - v_dept_count);

        RAISE NOTICE 'Approving % departments', array_length(v_ids_to_approve, 1);

        -- Update those departments
        UPDATE no_dues_status
        SET status = 'approved', action_at = NOW(), action_by_user_id = v_user_id
        WHERE id = ANY(v_ids_to_approve);

        RAISE NOTICE 'Done! 6 departments approved, 1 pending remains.';
    ELSE
        RAISE NOTICE 'Already has 6+ approved departments';
    END IF;
END $$;

-- Step 4: Verify the final status
SELECT department_name, status FROM no_dues_status WHERE form_id = '9efc323a-0431-4d52-8744-0c7935917f36' ORDER BY status;
