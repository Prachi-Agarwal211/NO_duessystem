-- Add alumni_profile_link column to no_dues_forms table
ALTER TABLE public.no_dues_forms 
ADD COLUMN IF NOT EXISTS alumni_profile_link TEXT;

-- Verify column addition
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'no_dues_forms' AND column_name = 'alumni_profile_link';
