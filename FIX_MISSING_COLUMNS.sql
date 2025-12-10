-- ============================================================================
-- FIX MISSING COLUMNS IN no_dues_forms TABLE
-- ============================================================================
-- This script adds the missing columns that the API code expects
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add missing columns to no_dues_forms table
ALTER TABLE public.no_dues_forms 
  ADD COLUMN IF NOT EXISTS session_from TEXT,
  ADD COLUMN IF NOT EXISTS session_to TEXT,
  ADD COLUMN IF NOT EXISTS parent_name TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '+91',
  ADD COLUMN IF NOT EXISTS alumni_screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'no_dues_forms'
AND column_name IN ('session_from', 'session_to', 'parent_name', 'country_code', 'alumni_screenshot_url', 'user_id')
ORDER BY column_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Missing columns added successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Added columns:';
    RAISE NOTICE '  - session_from (admission year)';
    RAISE NOTICE '  - session_to (passing year)';
    RAISE NOTICE '  - parent_name';
    RAISE NOTICE '  - country_code (default +91)';
    RAISE NOTICE '  - alumni_screenshot_url';
    RAISE NOTICE '  - user_id';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Your form submissions should now work!';
    RAISE NOTICE '';
END $$;