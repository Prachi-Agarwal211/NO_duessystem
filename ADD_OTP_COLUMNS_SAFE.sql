-- ============================================
-- SAFE OTP COLUMNS MIGRATION FOR PROFILES TABLE
-- ============================================
-- This migration adds OTP functionality for password reset
-- Safe to run multiple times (uses IF NOT EXISTS)
-- No cron jobs required - cleanup happens on-demand
-- ============================================

BEGIN;

-- Add OTP columns to profiles table
DO $$ 
BEGIN
    -- Add otp_code column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'otp_code'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN otp_code VARCHAR(6);
        RAISE NOTICE 'Added column: otp_code';
    ELSE
        RAISE NOTICE 'Column otp_code already exists';
    END IF;

    -- Add otp_expires_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'otp_expires_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN otp_expires_at TIMESTAMPTZ;
        RAISE NOTICE 'Added column: otp_expires_at';
    ELSE
        RAISE NOTICE 'Column otp_expires_at already exists';
    END IF;

    -- Add otp_attempts column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'otp_attempts'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN otp_attempts INTEGER DEFAULT 0;
        RAISE NOTICE 'Added column: otp_attempts';
    ELSE
        RAISE NOTICE 'Column otp_attempts already exists';
    END IF;

    -- Add last_password_change column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'last_password_change'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN last_password_change TIMESTAMPTZ;
        RAISE NOTICE 'Added column: last_password_change';
    ELSE
        RAISE NOTICE 'Column last_password_change already exists';
    END IF;
END $$;

-- Create indexes for faster lookups (safe - uses IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_profiles_otp_code ON public.profiles(otp_code);
CREATE INDEX IF NOT EXISTS idx_profiles_otp_expires_at ON public.profiles(otp_expires_at);

-- Add helpful comments
COMMENT ON COLUMN public.profiles.otp_code IS '6-digit OTP code for password reset (expires in 10 minutes)';
COMMENT ON COLUMN public.profiles.otp_expires_at IS 'OTP expiration timestamp';
COMMENT ON COLUMN public.profiles.otp_attempts IS 'Failed OTP verification attempts (max 5, then reset)';
COMMENT ON COLUMN public.profiles.last_password_change IS 'Timestamp of last successful password change';

COMMIT;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- ✅ OTP columns added to profiles table
-- ✅ Indexes created for performance
-- ✅ No cron jobs required (cleanup on-demand)
-- ✅ Safe to run multiple times
-- ============================================