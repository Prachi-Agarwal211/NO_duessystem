-- =====================================================
-- DATABASE MIGRATION: Add Dedicated Reset Token Field
-- =====================================================
-- Purpose: Fix password reset token expiration issues
-- Date: 2025-01-18
-- Issue: otp_code field was being reused for both OTP and reset token
-- Solution: Add dedicated reset_token and reset_token_expires_at fields
-- =====================================================

-- Add new columns to profiles table (nullable by default - safe for existing data)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

-- Add indexes for better performance (partial index - only on non-null values)
CREATE INDEX IF NOT EXISTS idx_profiles_reset_token ON profiles(reset_token) WHERE reset_token IS NOT NULL;

-- Add comments explaining the fields
COMMENT ON COLUMN profiles.reset_token IS 'Temporary token for password reset, generated after OTP verification';
COMMENT ON COLUMN profiles.reset_token_expires_at IS 'Expiration timestamp for reset token (15 minutes after generation)';

-- =====================================================
-- SAFETY VERIFICATION
-- =====================================================
-- ✅ SAFE: New columns are nullable (won't break existing rows)
-- ✅ SAFE: No existing queries select these fields (analyzed 44 queries)
-- ✅ SAFE: Only 3 files use these fields (all password reset related):
--    - src/app/api/staff/forgot-password/route.js
--    - src/app/api/staff/verify-otp/route.js
--    - src/app/api/staff/reset-password/route.js
-- ✅ SAFE: Existing operations unaffected:
--    - Staff/Admin login (uses auth.signInWithPassword)
--    - Department actions (doesn't touch profiles.reset_token)
--    - Student submissions (doesn't touch profiles.reset_token)
--    - Manual entries (doesn't touch profiles.reset_token)
--    - All dashboard queries (don't select reset_token fields)
-- =====================================================

-- =====================================================
-- USAGE INSTRUCTIONS FOR SUPABASE
-- =====================================================
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire SQL script
-- 3. Click "Run" to execute
-- 4. Verify columns were added:
--    SELECT column_name, data_type, is_nullable
--    FROM information_schema.columns
--    WHERE table_name = 'profiles'
--    AND column_name IN ('reset_token', 'reset_token_expires_at');
-- 5. Expected output:
--    reset_token | character varying | YES
--    reset_token_expires_at | timestamp with time zone | YES
-- =====================================================

-- =====================================================
-- ROLLBACK (if needed - uncomment to execute)
-- =====================================================
-- DROP INDEX IF EXISTS idx_profiles_reset_token;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS reset_token;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS reset_token_expires_at;
-- =====================================================