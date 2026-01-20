-- ========================================================================
-- FIX MISSING COLUMNS IN no_dues_forms TABLE
-- ========================================================================
-- Run this SQL in your Supabase SQL Editor to fix the check-status error
-- ========================================================================

-- Add rejection_reason column if it doesn't exist
ALTER TABLE no_dues_forms 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add rejection_context column if it doesn't exist  
ALTER TABLE no_dues_forms 
ADD COLUMN IF NOT EXISTS rejection_context JSONB;

-- ========================================================================
-- VERIFY THE FIX
-- ========================================================================

-- Check that columns now exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'no_dues_forms' 
  AND column_name IN ('rejection_reason', 'rejection_context')
ORDER BY column_name;

-- ========================================================================
-- EXPECTED OUTPUT:
-- ========================================================================
-- column_name       | data_type | is_nullable
-- ------------------+-----------+------------
-- rejection_context | jsonb     | YES
-- rejection_reason  | text      | YES
-- ========================================================================
