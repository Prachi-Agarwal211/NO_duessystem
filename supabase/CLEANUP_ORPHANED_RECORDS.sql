-- ============================================================================
-- CLEANUP ORPHANED RECORDS IN NO_DUES_STATUS TABLE
-- ============================================================================
-- This script removes orphaned status records that reference non-existent forms
-- Run this in Supabase SQL Editor to clean up the database
-- ============================================================================

-- Step 1: Check how many orphaned records exist
SELECT 
    COUNT(*) as orphaned_count,
    'Orphaned status records (will be deleted)' as description
FROM no_dues_status nds
WHERE NOT EXISTS (
    SELECT 1 FROM no_dues_forms ndf
    WHERE ndf.id = nds.form_id
);

-- Step 2: Show the orphaned records before deletion (for verification)
SELECT 
    nds.id as status_id,
    nds.form_id,
    nds.department_name,
    nds.status,
    nds.created_at,
    'THIS WILL BE DELETED' as note
FROM no_dues_status nds
WHERE NOT EXISTS (
    SELECT 1 FROM no_dues_forms ndf
    WHERE ndf.id = nds.form_id
)
ORDER BY nds.created_at DESC;

-- Step 3: DELETE orphaned records
-- IMPORTANT: Review the output from Step 2 before running this!
DELETE FROM no_dues_status
WHERE id IN (
    SELECT nds.id
    FROM no_dues_status nds
    WHERE NOT EXISTS (
        SELECT 1 FROM no_dues_forms ndf
        WHERE ndf.id = nds.form_id
    )
);

-- Step 4: Verify cleanup - should return 0 rows
SELECT 
    COUNT(*) as remaining_orphaned_records,
    'Should be 0 after cleanup' as status
FROM no_dues_status nds
WHERE NOT EXISTS (
    SELECT 1 FROM no_dues_forms ndf
    WHERE ndf.id = nds.form_id
);

-- Step 5: Verify foreign key constraint exists
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'no_dues_status'
    AND kcu.column_name = 'form_id';

-- Expected output: delete_rule should be 'CASCADE'
-- If not, the foreign key needs to be recreated

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This script will:
-- 1. Show how many orphaned records exist
-- 2. Display the orphaned records for review
-- 3. Delete all orphaned records
-- 4. Verify cleanup was successful
-- 5. Check that foreign key constraint is properly configured
-- ============================================================================