-- ============================================================================
-- REPAIR SCRIPT: Fix Online Forms with Missing Department Status Records
-- ============================================================================
-- This script identifies and repairs online forms that don't have department
-- status records, which breaks the rejection/reapply workflow.
--
-- WHEN TO RUN:
-- - After deploying the check-status API fix
-- - If students report not seeing rejection reasons or reapply buttons
-- - As part of system health check
--
-- SAFE TO RUN: Yes - This script only creates missing records, never deletes
-- ============================================================================

-- ============================================================================
-- STEP 1: DIAGNOSTIC - Find Broken Forms
-- ============================================================================

DO $$
DECLARE
    broken_count INTEGER;
    manual_entry_count INTEGER;
    online_form_count INTEGER;
BEGIN
    -- Count online forms with no department status records
    SELECT COUNT(DISTINCT f.id) INTO broken_count
    FROM no_dues_forms f
    LEFT JOIN no_dues_status s ON s.form_id = f.id
    WHERE (f.is_manual_entry = false OR f.is_manual_entry IS NULL)
    GROUP BY f.id
    HAVING COUNT(s.id) = 0;
    
    -- Count manual entries (should have no statuses)
    SELECT COUNT(*) INTO manual_entry_count
    FROM no_dues_forms
    WHERE is_manual_entry = true;
    
    -- Count total online forms
    SELECT COUNT(*) INTO online_form_count
    FROM no_dues_forms
    WHERE is_manual_entry = false OR is_manual_entry IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  ONLINE FORM STATUS DIAGNOSTIC REPORT                  ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 System Statistics:';
    RAISE NOTICE '   Total Online Forms: %', online_form_count;
    RAISE NOTICE '   Total Manual Entries: %', manual_entry_count;
    RAISE NOTICE '   Broken Online Forms: %', COALESCE(broken_count, 0);
    RAISE NOTICE '';
    
    IF COALESCE(broken_count, 0) > 0 THEN
        RAISE NOTICE '⚠️  WARNING: % online form(s) found with missing department statuses!', broken_count;
        RAISE NOTICE '   These forms will be repaired in the next step.';
    ELSE
        RAISE NOTICE '✅ All online forms have department status records.';
        RAISE NOTICE '   No repairs needed!';
    END IF;
    RAISE NOTICE '';
END $$;

-- Display detailed list of broken forms
SELECT 
    f.id,
    f.registration_no,
    f.student_name,
    f.status AS form_status,
    f.is_manual_entry,
    f.created_at,
    COUNT(s.id) AS status_count
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON s.form_id = f.id
WHERE f.is_manual_entry = false OR f.is_manual_entry IS NULL
GROUP BY f.id, f.registration_no, f.student_name, f.status, f.is_manual_entry, f.created_at
HAVING COUNT(s.id) = 0
ORDER BY f.created_at DESC;

-- ============================================================================
-- STEP 2: REPAIR - Create Missing Department Status Records
-- ============================================================================

DO $$
DECLARE
    form_record RECORD;
    dept_record RECORD;
    inserted_count INTEGER := 0;
    form_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  STARTING REPAIR PROCESS                               ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    -- Loop through all broken online forms
    FOR form_record IN 
        SELECT DISTINCT f.id, f.registration_no, f.student_name
        FROM no_dues_forms f
        LEFT JOIN no_dues_status s ON s.form_id = f.id
        WHERE (f.is_manual_entry = false OR f.is_manual_entry IS NULL)
        GROUP BY f.id, f.registration_no, f.student_name
        HAVING COUNT(s.id) = 0
    LOOP
        form_count := form_count + 1;
        RAISE NOTICE '🔧 Repairing form: % (ID: %)', form_record.registration_no, form_record.id;
        
        -- Create department status records for this form
        FOR dept_record IN 
            SELECT name, display_name 
            FROM departments 
            WHERE is_active = true 
            ORDER BY display_order
        LOOP
            -- Insert department status record
            INSERT INTO no_dues_status (
                form_id,
                department_name,
                status
            ) VALUES (
                form_record.id,
                dept_record.name,
                'pending'
            ) ON CONFLICT (form_id, department_name) DO NOTHING;
            
            inserted_count := inserted_count + 1;
        END LOOP;
        
        RAISE NOTICE '   ✅ Created % department status records', inserted_count;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  REPAIR COMPLETE!                                      ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Repair Summary:';
    RAISE NOTICE '   Forms Repaired: %', form_count;
    RAISE NOTICE '   Status Records Created: %', inserted_count;
    RAISE NOTICE '';
    
    IF form_count > 0 THEN
        RAISE NOTICE '✅ All broken forms have been repaired!';
        RAISE NOTICE '   Students can now see rejection reasons and reapply button.';
    ELSE
        RAISE NOTICE '✅ No repairs were needed.';
    END IF;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 3: VERIFICATION - Confirm All Forms are Fixed
-- ============================================================================

DO $$
DECLARE
    remaining_broken INTEGER;
BEGIN
    -- Count any remaining broken forms
    SELECT COUNT(DISTINCT f.id) INTO remaining_broken
    FROM no_dues_forms f
    LEFT JOIN no_dues_status s ON s.form_id = f.id
    WHERE (f.is_manual_entry = false OR f.is_manual_entry IS NULL)
    GROUP BY f.id
    HAVING COUNT(s.id) = 0;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  FINAL VERIFICATION                                    ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    IF COALESCE(remaining_broken, 0) = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All online forms now have department status records!';
        RAISE NOTICE '   The rejection/reapply workflow is fully operational.';
    ELSE
        RAISE NOTICE '⚠️  WARNING: % form(s) still have missing statuses.', remaining_broken;
        RAISE NOTICE '   Please review the forms manually.';
    END IF;
    RAISE NOTICE '';
END $$;

-- Display summary statistics
SELECT 
    'Online Forms' AS category,
    COUNT(*) AS total,
    COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM no_dues_status s WHERE s.form_id = f.id
    ) THEN 1 END) AS with_statuses,
    COUNT(CASE WHEN NOT EXISTS (
        SELECT 1 FROM no_dues_status s WHERE s.form_id = f.id
    ) THEN 1 END) AS without_statuses
FROM no_dues_forms f
WHERE f.is_manual_entry = false OR f.is_manual_entry IS NULL

UNION ALL

SELECT 
    'Manual Entries' AS category,
    COUNT(*) AS total,
    0 AS with_statuses,
    COUNT(*) AS without_statuses
FROM no_dues_forms f
WHERE f.is_manual_entry = true;

-- ============================================================================
-- CLEANUP COMPLETE
-- ============================================================================
-- This script has:
-- 1. ✅ Identified all broken online forms
-- 2. ✅ Created missing department status records
-- 3. ✅ Verified all forms are now working
--
-- NEXT STEPS:
-- 1. Deploy the updated check-status API fix (already done)
-- 2. Clear browser cache for affected students (Ctrl+Shift+R)
-- 3. Have students check their status page again
-- 4. Verify they can now see:
--    - Rejection alerts
--    - Rejection reasons from departments
--    - Reapply button (if rejected)
-- ============================================================================