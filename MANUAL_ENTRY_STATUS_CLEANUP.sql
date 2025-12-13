-- ============================================
-- MANUAL ENTRY STATUS CLEANUP
-- ============================================
-- Purpose: Remove spurious department statuses from manual entries
-- Manual entries should NEVER have department statuses (admin-only workflow)
-- 
-- Problem: Old manual entries have department statuses created by trigger
-- Solution: Delete all department statuses for manual entries
-- ============================================

-- ============================================
-- STEP 1: Verify the problem exists
-- ============================================
SELECT 
  '🔍 BEFORE CLEANUP: Manual entries with department statuses' as info,
  nf.registration_no,
  nf.student_name,
  nf.status as form_status,
  nf.is_manual_entry,
  COUNT(ns.id) as department_status_count,
  STRING_AGG(ns.department_name || ':' || ns.status, ', ' ORDER BY ns.department_name) as statuses
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON nf.id = ns.form_id
WHERE nf.is_manual_entry = true
GROUP BY nf.id, nf.registration_no, nf.student_name, nf.status, nf.is_manual_entry
HAVING COUNT(ns.id) > 0
ORDER BY nf.created_at DESC;

-- ============================================
-- STEP 2: DELETE spurious department statuses
-- ============================================
-- This removes ALL department status records for manual entries
-- Manual entries are admin-only and should never have department workflow

DO $$
DECLARE
  deleted_count INTEGER;
  manual_forms_count INTEGER;
BEGIN
  -- Count manual entries
  SELECT COUNT(*) INTO manual_forms_count
  FROM no_dues_forms
  WHERE is_manual_entry = true;
  
  RAISE NOTICE '📋 Found % manual entries', manual_forms_count;
  
  -- Delete department statuses for manual entries
  DELETE FROM no_dues_status
  WHERE form_id IN (
    SELECT id FROM no_dues_forms WHERE is_manual_entry = true
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE '🗑️  Deleted % spurious department status records', deleted_count;
  RAISE NOTICE '✅ Cleanup complete!';
END $$;

-- ============================================
-- STEP 3: Verify cleanup was successful
-- ============================================

-- Check 1: Manual entries should have ZERO department statuses
SELECT 
  '✅ AFTER CLEANUP: Manual entries (should be 0 statuses)' as check_type,
  COUNT(DISTINCT nf.id) as manual_entry_count,
  COUNT(ns.id) as department_status_count
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON nf.id = ns.form_id
WHERE nf.is_manual_entry = true;

-- Check 2: Online forms should STILL have department statuses
SELECT 
  '✅ Online forms (should have statuses)' as check_type,
  COUNT(DISTINCT nf.id) as online_form_count,
  COUNT(ns.id) as department_status_count
FROM no_dues_forms nf
LEFT JOIN no_dues_status ns ON nf.id = ns.form_id
WHERE (nf.is_manual_entry = false OR nf.is_manual_entry IS NULL);

-- Check 3: List manual entries with their form status
SELECT 
  '📊 Manual entries status summary' as info,
  nf.registration_no,
  nf.student_name,
  nf.status as form_status,
  nf.created_at::date as created_date,
  CASE 
    WHEN nf.status = 'approved' THEN '✅'
    WHEN nf.status = 'rejected' THEN '❌'
    ELSE '⏳'
  END as status_icon
FROM no_dues_forms nf
WHERE nf.is_manual_entry = true
ORDER BY nf.created_at DESC;

-- ============================================
-- VERIFICATION COMPLETE
-- ============================================
/*
EXPECTED RESULTS:

1. Manual entries: 0 department statuses (cleaned up)
2. Online forms: Still have all department statuses (untouched)
3. Manual entry form statuses: approved/rejected/pending (preserved)

WHAT THIS FIXES:
- Manual entries like 21BCON750 will no longer show department rejections
- Check-status page will display correct admin approval status
- No impact on online forms or regular workflow

SAFE TO RUN:
- Only deletes department statuses for manual entries
- Does not modify form status or any other data
- Idempotent (can run multiple times safely)
*/