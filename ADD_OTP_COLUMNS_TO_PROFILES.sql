-- Add OTP columns to profiles table for password reset functionality
-- Run this in Supabase SQL Editor

-- Add OTP columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ DEFAULT NOW();

-- Add index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_profiles_otp_code ON public.profiles(otp_code);
CREATE INDEX IF NOT EXISTS idx_profiles_otp_expires_at ON public.profiles(otp_expires_at);

-- Add comment
COMMENT ON COLUMN public.profiles.otp_code IS '6-digit OTP code for password reset';
COMMENT ON COLUMN public.profiles.otp_expires_at IS 'OTP expiration timestamp (valid for 10 minutes)';
COMMENT ON COLUMN public.profiles.otp_attempts IS 'Number of failed OTP verification attempts (max 5)';
COMMENT ON COLUMN public.profiles.last_password_change IS 'Timestamp of last password change';

-- Function to clean expired OTPs (run daily)
CREATE OR REPLACE FUNCTION clean_expired_otps()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET otp_code = NULL,
      otp_expires_at = NULL,
      otp_attempts = 0
  WHERE otp_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to clean expired OTPs (optional, requires pg_cron extension)
-- Uncomment if you have pg_cron enabled:
-- SELECT cron.schedule('clean-expired-otps', '0 * * * *', 'SELECT clean_expired_otps()');

COMMIT;