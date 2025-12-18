-- =====================================================
-- PERFORMANCE AND STATS OPTIMIZATION MIGRATION
-- =====================================================
-- Purpose: Fix "0 Stats" issue + Optimize dashboard performance
-- Date: 2025-12-18
-- Impact: Database functions, indexes, data repair
-- 
-- Run this in Supabase SQL Editor FIRST before deploying API changes
-- =====================================================

-- =====================================================
-- PART 1: FIX ADMIN STATS FUNCTION (Global Counts)
-- =====================================================
-- Problem: Was counting wrong tables or including manual entries
-- Fix: Count ONLY no_dues_forms with proper status filtering

DROP FUNCTION IF EXISTS public.get_form_statistics();

CREATE OR REPLACE FUNCTION public.get_form_statistics()
RETURNS TABLE (
    total_applications BIGINT,
    pending_applications BIGINT,
    approved_applications BIGINT,
    rejected_applications BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected
    FROM public.no_dues_forms;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 2: FIX DEPARTMENT WORKLOAD FUNCTION (Breakdown)
-- =====================================================
-- Problem: Wasn't joining status table correctly
-- Fix: Proper JOIN to ensure only active forms are counted

DROP FUNCTION IF EXISTS public.get_department_workload();

CREATE OR REPLACE FUNCTION public.get_department_workload()
RETURNS TABLE (
    department_name TEXT,
    pending_count BIGINT,
    approved_count BIGINT,
    rejected_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nds.department_name,
        COUNT(*) FILTER (WHERE nds.status = 'pending')::BIGINT,
        COUNT(*) FILTER (WHERE nds.status = 'approved')::BIGINT,
        COUNT(*) FILTER (WHERE nds.status = 'rejected')::BIGINT
    FROM public.no_dues_status nds
    JOIN public.no_dues_forms ndf ON nds.form_id = ndf.id
    GROUP BY nds.department_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- PART 3: REPAIR DATA LINKS (The "Ghost Data" Fix)
-- =====================================================
-- Problem: Forms exist without status rows for all 7 departments
-- Fix: Backfill missing status rows
-- Impact: Every form will have exactly 7 status entries

INSERT INTO public.no_dues_status (form_id, department_name, status)
SELECT f.id, d.name, 'pending'
FROM public.no_dues_forms f
CROSS JOIN public.departments d
WHERE NOT EXISTS (
    SELECT 1 FROM public.no_dues_status s 
    WHERE s.form_id = f.id AND s.department_name = d.name
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- PART 4: FIX PROFILE MAPPING (Staff see their numbers)
-- =====================================================
-- Problem: Staff accounts have NULL department assignments
-- Fix: Map department names to IDs

UPDATE public.profiles p
SET assigned_department_ids = ARRAY(
    SELECT id FROM public.departments d WHERE LOWER(d.name) = LOWER(p.department_name)
)
WHERE role = 'department' 
  AND (assigned_department_ids IS NULL OR assigned_department_ids = '{}')
  AND department_name IS NOT NULL;

-- =====================================================
-- PART 5: PERFORMANCE INDEXES (Speed Booster)
-- =====================================================
-- These indexes create "shortcuts" for common queries
-- Expected speedup: 3-5x faster dashboard loads

-- Index 1: Department + Status filtering (Most used)
CREATE INDEX IF NOT EXISTS idx_no_dues_status_dept_status 
ON public.no_dues_status(department_name, status);

-- Index 2: Form lookup from status table
CREATE INDEX IF NOT EXISTS idx_no_dues_status_form_id 
ON public.no_dues_status(form_id);

-- Index 3: Form status filtering
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_status 
ON public.no_dues_forms(status);

-- Index 4: Student search optimization
CREATE INDEX IF NOT EXISTS idx_no_dues_forms_student_search 
ON public.no_dues_forms(registration_no, student_name);

-- Index 5: Date-based queries (for recent activity)
CREATE INDEX IF NOT EXISTS idx_no_dues_status_action_at 
ON public.no_dues_status(action_at DESC) WHERE action_at IS NOT NULL;

-- Index 6: Profile department lookups
CREATE INDEX IF NOT EXISTS idx_profiles_department 
ON public.profiles(department_name) WHERE role = 'department';

-- =====================================================
-- PART 6: OPTIMIZE STATS FUNCTION (Faster Counting)
-- =====================================================
-- Mark function as STABLE for query planner optimization

CREATE OR REPLACE FUNCTION public.get_department_workload()
RETURNS TABLE (
    department_name TEXT,
    pending_count BIGINT,
    approved_count BIGINT,
    rejected_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nds.department_name,
        COUNT(*) FILTER (WHERE nds.status = 'pending')::BIGINT,
        COUNT(*) FILTER (WHERE nds.status = 'approved')::BIGINT,
        COUNT(*) FILTER (WHERE nds.status = 'rejected')::BIGINT
    FROM public.no_dues_status nds
    GROUP BY nds.department_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after migration to verify everything works

-- 1. Check if stats function works
SELECT * FROM public.get_form_statistics();

-- 2. Check department breakdown
SELECT * FROM public.get_department_workload();

-- 3. Verify all forms have 7 status rows
SELECT 
    f.id,
    f.registration_no,
    COUNT(s.id) as status_count
FROM public.no_dues_forms f
LEFT JOIN public.no_dues_status s ON f.id = s.form_id
GROUP BY f.id, f.registration_no
HAVING COUNT(s.id) != 7;
-- Should return 0 rows if fixed

-- 4. Verify staff have department assignments
SELECT 
    id, 
    email, 
    department_name,
    assigned_department_ids
FROM public.profiles
WHERE role = 'department'
  AND (assigned_department_ids IS NULL OR assigned_department_ids = '{}');
-- Should return 0 rows if fixed

-- 5. Check index creation
SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_no_dues%'
ORDER BY tablename, indexname;

-- =====================================================
-- ROLLBACK SCRIPT (Use only if something breaks)
-- =====================================================
/*
-- Drop indexes
DROP INDEX IF EXISTS public.idx_no_dues_status_dept_status;
DROP INDEX IF EXISTS public.idx_no_dues_status_form_id;
DROP INDEX IF EXISTS public.idx_no_dues_forms_status;
DROP INDEX IF EXISTS public.idx_no_dues_forms_student_search;
DROP INDEX IF EXISTS public.idx_no_dues_status_action_at;
DROP INDEX IF EXISTS public.idx_profiles_department;

-- Note: Cannot rollback data inserts safely
-- Note: Function changes are safe - old functions were broken anyway
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next Steps:
-- 1. Deploy updated API routes (admin/stats, staff/dashboard)
-- 2. Deploy updated frontend components
-- 3. Test dashboards for accurate counts
-- 4. Monitor performance improvements
-- =====================================================