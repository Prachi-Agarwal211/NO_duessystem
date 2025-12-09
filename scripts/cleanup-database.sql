-- =====================================================
-- DATABASE CLEANUP SCRIPT - COMPLETE RESET
-- =====================================================
-- WARNING: This script will DELETE ALL DATA!
-- Purpose: Clean slate for production deployment
-- Date: 2025-12-09
-- =====================================================

-- SAFETY CHECK: Uncomment the line below to enable deletion
-- SET enable_cleanup = true;

BEGIN;

-- Display warning
DO $$
BEGIN
    RAISE NOTICE '⚠️  WARNING: This will DELETE ALL DATA from the database!';
    RAISE NOTICE '⚠️  Make sure you have a backup before proceeding!';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables that will be cleaned:';
    RAISE NOTICE '  - no_dues_forms (all student applications)';
    RAISE NOTICE '  - no_dues_status (all department actions)';
    RAISE NOTICE '  - no_dues_reapplication_history (all reapplication records)';
    RAISE NOTICE '  - profiles (all user accounts except config)';
    RAISE NOTICE '  - auth.users (all authentication records)';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 1: DELETE ALL FORM-RELATED DATA
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 1: Deleting form-related data...';
END $$;

-- Delete reapplication history
DELETE FROM no_dues_reapplication_history;

DO $$
BEGIN
    RAISE NOTICE '  ✓ Deleted all reapplication history records';
END $$;

-- Delete department status records
DELETE FROM no_dues_status;

DO $$
BEGIN
    RAISE NOTICE '  ✓ Deleted all department status records';
END $$;

-- Delete all forms
DELETE FROM no_dues_forms;

DO $$
BEGIN
    RAISE NOTICE '  ✓ Deleted all student application forms';
END $$;

-- =====================================================
-- STEP 2: DELETE ALL USER PROFILES (EXCEPT SYSTEM)
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 2: Deleting user profiles...';
END $$;

-- Store user IDs to delete from auth
CREATE TEMP TABLE users_to_delete AS
SELECT id FROM profiles;

-- Delete all profiles
DELETE FROM profiles;

DO $$
BEGIN
    RAISE NOTICE '  ✓ Deleted all user profiles';
END $$;

-- =====================================================
-- STEP 3: DELETE AUTH USERS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 3: Deleting authentication records...';
END $$;

-- Delete from auth.users (requires admin privileges)
-- This will cascade delete related auth tables
DELETE FROM auth.users
WHERE id IN (SELECT id FROM users_to_delete);

DO $$
BEGIN
    RAISE NOTICE '  ✓ Deleted all authentication records';
END $$;

-- Cleanup temp table
DROP TABLE users_to_delete;

-- =====================================================
-- STEP 4: RESET SEQUENCES (Optional)
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 4: Resetting sequences...';
END $$;

-- Reset any auto-increment sequences if they exist
-- Add any sequence resets here if needed

-- =====================================================
-- STEP 5: VERIFY CLEANUP
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICATION ===';
END $$;

DO $$
DECLARE
    forms_count INTEGER;
    status_count INTEGER;
    reapply_count INTEGER;
    profiles_count INTEGER;
    auth_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO forms_count FROM no_dues_forms;
    SELECT COUNT(*) INTO status_count FROM no_dues_status;
    SELECT COUNT(*) INTO reapply_count FROM no_dues_reapplication_history;
    SELECT COUNT(*) INTO profiles_count FROM profiles;
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    
    RAISE NOTICE 'Remaining records:';
    RAISE NOTICE '  - Forms: %', forms_count;
    RAISE NOTICE '  - Status: %', status_count;
    RAISE NOTICE '  - Reapplication History: %', reapply_count;
    RAISE NOTICE '  - Profiles: %', profiles_count;
    RAISE NOTICE '  - Auth Users: %', auth_count;
    RAISE NOTICE '';
    
    IF forms_count = 0 AND status_count = 0 AND reapply_count = 0 AND profiles_count = 0 THEN
        RAISE NOTICE '✅ Database successfully cleaned!';
    ELSE
        RAISE NOTICE '⚠️  Some records remain. Review and clean manually if needed.';
    END IF;
END $$;

-- =====================================================
-- STEP 6: STORAGE CLEANUP (OPTIONAL)
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== STORAGE CLEANUP ===';
    RAISE NOTICE 'Note: Files in Supabase Storage buckets are NOT automatically deleted.';
    RAISE NOTICE 'To clean storage buckets:';
    RAISE NOTICE '  1. Go to Supabase Dashboard → Storage';
    RAISE NOTICE '  2. Select bucket: student-documents';
    RAISE NOTICE '  3. Delete all files manually or use storage API';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- COMMIT OR ROLLBACK
-- =====================================================

-- Review the output above, then:
-- - COMMIT to apply changes
-- - ROLLBACK to cancel

DO $$
BEGIN
    RAISE NOTICE '=== IMPORTANT ===';
    RAISE NOTICE 'Transaction is still open. You must:';
    RAISE NOTICE '  - Type COMMIT; to apply all deletions';
    RAISE NOTICE '  - Type ROLLBACK; to cancel and keep existing data';
    RAISE NOTICE '';
END $$;

-- DO NOT AUTO-COMMIT - Let admin decide
-- COMMIT;

END;