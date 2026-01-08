-- ============================================================================
-- JECRC NO DUES SYSTEM - LEGACY TABLE CLEANUP
-- ============================================================================
-- This script deletes tables that are no longer used in the new architecture.
-- These have been replaced by config_schools, config_courses, config_branches,
-- and the consolidated no_dues_forms table.
-- ============================================================================

-- WARNING: This will permanently delete these tables and any data they contain.
-- Ensure you have backed up any data you wish to migrate later.

DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.schools CASCADE;
DROP TABLE IF EXISTS public.certificates CASCADE;

-- Optional: Re-run a check to see if any old triggers or functions remain
-- (These would typically have been dropped if they belonged to the tables above)
