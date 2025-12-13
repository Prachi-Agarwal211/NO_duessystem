-- ============================================
-- IMMEDIATE FIX: DELETE MANUAL ENTRY DEPARTMENT STATUSES
-- ============================================
-- This script removes ALL department statuses from manual entries
-- Manual entries should ONLY have admin approval, NO department workflow
-- 
-- Run this in Supabase SQL Editor NOW
-- ============================================

-- Step 1: Show what will be deleted (SAFETY CHECK)
SELECT 
  'PREVIEW: Records to be deleted' as action,
  nf.registration_no,
  nf.student_name,
  ns.department_name,
  ns.status,
  ns.created_at
FROM no_dues_status ns
JOIN no_dues_forms nf ON ns.form_id = nf.id
WHERE nf.is_manual_entry = true
ORDER BY nf.registration_no, ns.department_name;

-- Step 2: Count what will be deleted
SELECT 
  'TOTAL RECORDS TO DELETE' as info,
  COUNT(*) as count
FROM no_dues_status ns
WHERE ns.form_id IN (
  SELECT id FROM no_dues_forms WHERE is_manual_entry = true
);

-- Step 3: ACTUAL DELETE (This fixes the issue)
DELETE FROM no_dues_status
WHERE form_id IN (
  SELECT id FROM no_dues_forms WHERE is_manual_entry = true
);

-- Step 4: Verify deletion worked
SELECT 
  'VERIFICATION: Manual entries after cleanup' as check_name,
  nf.registration_no,
  nf.student_name,
  nf.status as form_status,
  nf.is_manual_entry,
  COUNT(ns.id) as dept_status_count,
  CASE 
    WHEN COUNT(ns.id) = 0 THEN '✅ CORRECT (no dept statuses)'
    ELSE '❌ STILL HAS STATUSES'
  END as result
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON ns.form_id = nf.id
WHERE nf.is_manual_entry = true
GROUP BY nf.id, nf.registration_no, nf.student_name, nf.status, nf.is_manual_entry
ORDER BY nf.created_at DESC;

-- Step 5: Specific check for 21BCON750
SELECT 
  'CHECK 21BCON750' as test,
  nf.registration_no,
  nf.student_name,
  nf.status,
  nf.is_manual_entry,
  COUNT(ns.id) as dept_status_count,
  CASE 
    WHEN COUNT(ns.id) = 0 THEN '✅ FIXED'
    ELSE '❌ STILL BROKEN'
  END as result
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON ns.form_id = nf.id
WHERE nf.registration_no = '21BCON750'
GROUP BY nf.id, nf.registration_no, nf.student_name, nf.status, nf.is_manual_entry;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ MANUAL ENTRY CLEANUP COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE 'What was fixed:';
  RAISE NOTICE '- Removed ALL department statuses from manual entries';
  RAISE NOTICE '- Manual entries now show ONLY admin approval status';
  RAISE NOTICE '- 21BCON750 should now display correctly';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Clear browser cache/localStorage';
  RAISE NOTICE '2. Refresh the student status page';
  RAISE NOTICE '3. Verify 21BCON750 shows "Admin Approved" with NO departments';
  RAISE NOTICE '';
END $$;