-- ============================================
-- PASSWORD RESET SCHEMA FIX - SUPABASE COMPATIBLE
-- ============================================
-- This migration fixes the critical issues with password reset functionality
-- 1. Expands otp_code field to handle long reset tokens
-- 2. Adds separate reset_token field for clarity
-- 3. Updates indexes for performance
-- ============================================

BEGIN;

-- ============================================
-- CRITICAL FIX 1: Expand otp_code field to handle long reset tokens
-- ============================================
-- The current VARCHAR(6) is too short for reset tokens like:
-- "abc123-def456-ghi789"
-- This causes token truncation and validation failures

ALTER TABLE public.profiles
ALTER COLUMN otp_code TYPE VARCHAR(255);

-- ============================================
-- RECOMMENDED FIX 2: Add separate reset_token field for clarity
-- ============================================
-- This is optional but recommended for better code clarity
-- The system currently reuses otp_code for both OTP and reset tokens

DO $$
BEGIN
    -- Add reset_token column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'reset_token'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN reset_token VARCHAR(255);
    END IF;
    
    -- Add reset_token_expires_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'reset_token_expires_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN reset_token_expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================
-- FIX 3: Update indexes for better performance
-- ============================================

-- Drop old index if it exists
DROP INDEX IF EXISTS idx_profiles_otp_code;

-- Create new indexes for both OTP and reset token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_otp_code ON public.profiles(otp_code);
CREATE INDEX IF NOT EXISTS idx_profiles_reset_token ON public.profiles(reset_token);
CREATE INDEX IF NOT EXISTS idx_profiles_otp_expires_at ON public.profiles(otp_expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_reset_token_expires_at ON public.profiles(reset_token_expires_at);

-- ============================================
-- FIX 4: Update comments to reflect new usage
-- ============================================

COMMENT ON COLUMN public.profiles.otp_code IS '6-digit OTP code for initial verification OR long reset token (expires in 30 minutes)';
COMMENT ON COLUMN public.profiles.otp_expires_at IS 'Expiration timestamp for OTP or reset token';
COMMENT ON COLUMN public.profiles.reset_token IS 'Dedicated field for reset tokens (optional, for future use)';
COMMENT ON COLUMN public.profiles.reset_token_expires_at IS 'Expiration timestamp for reset tokens (optional, for future use)';

COMMIT;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- ✅ CRITICAL: otp_code expanded to VARCHAR(255)
-- ✅ RECOMMENDED: Added separate reset_token fields
-- ✅ PERFORMANCE: Updated indexes
-- ✅ DOCUMENTATION: Updated comments
-- 
-- NEXT STEPS:
-- 1. Run this SQL in Supabase
-- 2. Update backend API to use the expanded otp_code field
-- 3. Fix token expiration mismatch between frontend and backend
-- 4. Test the complete password reset flow
-- ============================================