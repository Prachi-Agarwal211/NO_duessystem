-- ========================================================================
-- ADD ADMIN OVERRIDE FOR MAX REAPPLICATIONS
-- ========================================================================
-- This allows admins to grant additional reapplication attempts
-- beyond the default limit of 5
-- ========================================================================

-- Add the override column to no_dues_forms table
ALTER TABLE public.no_dues_forms 
ADD COLUMN IF NOT EXISTS max_reapplications_override INT DEFAULT NULL;

-- Add a comment to explain the column
COMMENT ON COLUMN public.no_dues_forms.max_reapplications_override IS 
  'If set, this overrides the default max reapplications (5). Admin can grant additional attempts.';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'no_dues_forms' 
AND column_name = 'max_reapplications_override';
