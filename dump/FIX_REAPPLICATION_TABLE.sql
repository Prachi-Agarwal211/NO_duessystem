-- ========================================================================
-- FIX MULTI-REAPPLICATION BUG
-- ========================================================================
-- The no_dues_reapplication_history table is missing, causing 2nd+ 
-- reapplications to fail. Run this SQL in Supabase SQL Editor.
-- ========================================================================

-- Create the missing reapplication history table
CREATE TABLE IF NOT EXISTS public.no_dues_reapplication_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES public.no_dues_forms(id) ON DELETE CASCADE,
    reapplication_number INTEGER NOT NULL,
    student_message TEXT,
    edited_fields JSONB DEFAULT '{}'::jsonb,
    rejected_departments JSONB DEFAULT '[]'::jsonb,
    previous_status JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reapplication_history_form 
ON public.no_dues_reapplication_history(form_id);

-- Enable RLS
ALTER TABLE public.no_dues_reapplication_history ENABLE ROW LEVEL SECURITY;

-- Allow public read (for status tracking)
CREATE POLICY "Public read reapplication_history" 
ON public.no_dues_reapplication_history 
FOR SELECT USING (true);

-- Allow system to insert
CREATE POLICY "System insert reapplication_history" 
ON public.no_dues_reapplication_history 
FOR INSERT WITH CHECK (true);

-- Admin can manage
CREATE POLICY "Admin manage reapplication_history" 
ON public.no_dues_reapplication_history 
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ========================================================================
-- VERIFY THE FIX
-- ========================================================================
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'no_dues_reapplication_history';

-- Expected output: 
-- | table_name                    |
-- | no_dues_reapplication_history |
-- ========================================================================
