-- ============================================================================
-- TEMPORARY EMAIL TEST FIX
-- ============================================================================
-- This is a TEMPORARY workaround to test the system while domain verification
-- is pending on Resend. This changes all department emails to your test email.
--
-- ⚠️ WARNING: This is ONLY for testing purposes!
-- ⚠️ After testing, run UPDATE_DEPARTMENT_EMAILS.sql to restore real emails
--
-- Purpose: Allows testing email notifications without domain verification
-- Reason: Resend in test mode can only send to: 15anuragsingh2003@gmail.com
-- ============================================================================

-- Backup current emails (for reference)
SELECT 
  name,
  email,
  'BEFORE_TEMP_CHANGE' as status
FROM departments
ORDER BY name;

-- Change all department emails to your test email
UPDATE departments 
SET email = '15anuragsingh2003@gmail.com'
WHERE email IS NOT NULL;

-- Verify changes
SELECT 
  name,
  email,
  'AFTER_TEMP_CHANGE' as status
FROM departments
ORDER BY name;

-- ============================================================================
-- TESTING INSTRUCTIONS
-- ============================================================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. All 10 departments will now use your email
-- 3. Submit a student form at: https://no-duessystem.vercel.app/student/submit-form
-- 4. You should receive 10 emails (one from each department)
-- 5. Check that all emails arrive successfully
-- 6. Verify redirect URLs point to production, not localhost
--
-- ⚠️ IMPORTANT: After testing, restore real emails:
--    Run: UPDATE_DEPARTMENT_EMAILS.sql
-- ============================================================================

-- Expected result: 10 rows updated
-- All departments will temporarily use: 15anuragsingh2003@gmail.com