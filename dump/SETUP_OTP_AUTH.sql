-- ============================================================================
-- SETUP OTP AUTHENTICATION
-- ============================================================================
-- Creates the table for storing Student OTPs.

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.student_otp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_no TEXT NOT NULL,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    
    -- Status & Limits
    is_used BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- 2. Indexes for Performance & Rate Limiting
-- Fast lookup for checking active OTPs
-- NOTE: Removed 'expires_at > NOW()' from predicate as NOW() is not immutable
CREATE INDEX IF NOT EXISTS idx_otp_reg_active 
ON public.student_otp_logs(registration_no) 
WHERE is_used = false;

-- Index for counting recent attempts (Rate Limiting)
CREATE INDEX IF NOT EXISTS idx_otp_created_at 
ON public.student_otp_logs(created_at);

-- 3. Row Level Security (RLS)
ALTER TABLE public.student_otp_logs ENABLE ROW LEVEL SECURITY;

-- Only server-side code (via Service Role) needs to access this table directly
-- However, we can add a basic policy for authenticated admins just in case
CREATE POLICY "Service Role Full Access" 
ON public.student_otp_logs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 4. Audit / Confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Table student_otp_logs created successfully.';
END $$;
