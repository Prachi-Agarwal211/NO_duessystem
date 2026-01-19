-- ============================================================================
-- SETUP CERTIFICATE MANAGEMENT
-- ============================================================================
-- Adds support for tracking certificate generation status, errors, and logs.

-- 1. Add Columns to no_dues_forms
-- We use DO block to add columns safely without errors if they exist
DO $$
BEGIN
    -- certificate_status: pending | generated | failed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='no_dues_forms' AND column_name='certificate_status') THEN
        ALTER TABLE public.no_dues_forms ADD COLUMN certificate_status TEXT DEFAULT 'pending';
    END IF;

    -- certificate_generated_at: Timestamp of successful generation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='no_dues_forms' AND column_name='certificate_generated_at') THEN
        ALTER TABLE public.no_dues_forms ADD COLUMN certificate_generated_at TIMESTAMPTZ;
    END IF;

    -- certificate_error: Last error message if failed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='no_dues_forms' AND column_name='certificate_error') THEN
        ALTER TABLE public.no_dues_forms ADD COLUMN certificate_error TEXT;
    END IF;

    -- certificate_retry_count: Number of failed attempts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='no_dues_forms' AND column_name='certificate_retry_count') THEN
        ALTER TABLE public.no_dues_forms ADD COLUMN certificate_retry_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Backfill Existing Data
-- If final_certificate_generated is true, mark status as 'generated'
UPDATE public.no_dues_forms
SET certificate_status = 'generated',
    certificate_generated_at = COALESCE(updated_at, NOW())
WHERE final_certificate_generated = true AND certificate_status = 'pending';

-- 3. Create Audit Log Table for Certificate Generation
CREATE TABLE IF NOT EXISTS public.certificate_generation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES public.no_dues_forms(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- success | failed
    error_message TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    attempted_by UUID REFERENCES public.profiles(id), -- Admin who triggered it (nullable for system)
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. RLS for Logs
ALTER TABLE public.certificate_generation_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view/manage logs
CREATE POLICY "Admin full access logs" ON public.certificate_generation_logs
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_cert_status ON public.no_dues_forms(certificate_status);
CREATE INDEX IF NOT EXISTS idx_cert_logs_form ON public.certificate_generation_logs(form_id);

DO $$
BEGIN
    RAISE NOTICE '✅ Certificate Management setup completed successfully.';
END $$;
