-- ============================================
-- FIX REGISTRAR DISPLAY NAME TO REGISTRATION OFFICE
-- ============================================
-- This updates the display name in the departments table
-- Run this in Supabase SQL Editor

-- Update the display_name for registrar department
UPDATE public.departments
SET display_name = 'Registration Office'
WHERE name = 'registrar';

-- Verify the change
SELECT name, display_name, email
FROM public.departments
WHERE name = 'registrar';

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Updated "Registrar" to "Registration Office" in departments table';
  RAISE NOTICE '📋 Please verify the change in the check status form';
END $$;