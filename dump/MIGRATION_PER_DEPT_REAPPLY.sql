-- ============================================================================
-- PER-DEPARTMENT REAPPLICATION MIGRATION
-- ============================================================================
-- This migration adds support for per-department reapplication tracking.
-- Run this in Supabase SQL Editor.
-- ============================================================================

-- 1. Add rejection_count to no_dues_status (per-department limit tracking)
-- This allows 5 reapplication attempts PER department instead of global
ALTER TABLE public.no_dues_status 
ADD COLUMN IF NOT EXISTS rejection_count INTEGER DEFAULT 0;

-- 2. Add department tracking to reapplication history
-- This enables per-department history queries
ALTER TABLE public.no_dues_reapplication_history
ADD COLUMN IF NOT EXISTS department_name TEXT;

-- 3. Create index for faster per-department history lookups
CREATE INDEX IF NOT EXISTS idx_reapplication_history_dept 
ON public.no_dues_reapplication_history(department_name);

-- 4. Create index for faster rejection_count queries
CREATE INDEX IF NOT EXISTS idx_status_rejection_count
ON public.no_dues_status(form_id, department_name, rejection_count);

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Check if rejection_count column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'no_dues_status' AND column_name = 'rejection_count';

-- Check if department_name column exists in history
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'no_dues_reapplication_history' AND column_name = 'department_name';

-- ============================================================================
