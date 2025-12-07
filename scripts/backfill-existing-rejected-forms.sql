-- =====================================================
-- BACKWARD COMPATIBILITY SCRIPT
-- Backfill reapplication columns for existing rejected forms
-- =====================================================
-- 
-- This script ensures that forms rejected BEFORE the reapplication
-- system was implemented can still use the reapply feature.
--
-- Run this AFTER running setup-reapplication-system.sql
-- =====================================================

DO $$
DECLARE
  updated_count INTEGER := 0;
  rejected_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Starting backfill for existing rejected forms...';
  
  -- First, let's see how many rejected forms exist
  SELECT COUNT(*) INTO rejected_count
  FROM no_dues_forms
  WHERE status = 'rejected';
  
  RAISE NOTICE '📊 Found % rejected forms in the system', rejected_count;
  
  -- Update all existing rejected forms to have default reapplication values
  -- This allows them to use the reapply feature
  UPDATE no_dues_forms
  SET 
    reapplication_count = COALESCE(reapplication_count, 0),
    is_reapplication = COALESCE(is_reapplication, false),
    student_reply_message = NULL,
    last_reapplied_at = NULL
  WHERE status = 'rejected'
    AND (
      reapplication_count IS NULL 
      OR is_reapplication IS NULL
    );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Updated % rejected forms with default reapplication values', updated_count;
  RAISE NOTICE '🎯 These forms can now use the reapply feature!';
  
  -- Show summary of rejected forms by status
  RAISE NOTICE '';
  RAISE NOTICE '📋 Rejected Forms Summary:';
  RAISE NOTICE '─────────────────────────────────────────';
  RAISE NOTICE '  Total Rejected Forms: %', rejected_count;
  RAISE NOTICE '  Forms Updated: %', updated_count;
  RAISE NOTICE '  All forms are now compatible with reapplication system';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Backfill complete! All existing rejected forms are now compatible.';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '❌ Error during backfill: %', SQLERRM;
END $$;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Check that all rejected forms now have the required columns

SELECT 
  'Verification Results' as info,
  COUNT(*) as total_rejected_forms,
  COUNT(*) FILTER (WHERE reapplication_count IS NOT NULL) as has_reapp_count,
  COUNT(*) FILTER (WHERE is_reapplication IS NOT NULL) as has_is_reapp_flag,
  COUNT(*) FILTER (
    WHERE reapplication_count IS NOT NULL 
    AND is_reapplication IS NOT NULL
  ) as fully_compatible
FROM no_dues_forms
WHERE status = 'rejected';

-- =====================================================
-- SAMPLE QUERY: View existing rejected forms
-- =====================================================
-- Uncomment to see details of rejected forms

/*
SELECT 
  id,
  student_name,
  registration_no,
  status,
  reapplication_count,
  is_reapplication,
  created_at,
  updated_at
FROM no_dues_forms
WHERE status = 'rejected'
ORDER BY created_at DESC
LIMIT 10;
*/

-- =====================================================
-- END OF SCRIPT
-- =====================================================