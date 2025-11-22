-- ============================================================================
-- FIX: Allow trigger to create department statuses (RLS blocking issue)
-- ============================================================================
-- The trigger_create_department_statuses runs without auth context,
-- so RLS policies block it from inserting records.
-- Solution: Add a policy that allows INSERT when auth.uid() is NULL (triggers)
-- ============================================================================

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Staff can insert status" ON public.no_dues_status;

-- Create new policy that allows:
-- 1. Staff/Admin authenticated users
-- 2. Triggers (when auth.uid() is NULL)
CREATE POLICY "Allow trigger and staff to insert status" ON public.no_dues_status
    FOR INSERT WITH CHECK (
        -- Allow if user is authenticated staff/admin
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role IN ('department', 'admin')
            )
        )
        -- OR allow if no auth context (trigger execution)
        OR auth.uid() IS NULL
    );

-- ============================================================================
-- BACKFILL: Create missing department statuses for existing forms
-- ============================================================================

-- For each form that has no department statuses, create them
INSERT INTO public.no_dues_status (form_id, department_name, status)
SELECT 
    f.id as form_id,
    d.name as department_name,
    'pending' as status
FROM no_dues_forms f
CROSS JOIN departments d
WHERE NOT EXISTS (
    SELECT 1 FROM no_dues_status nds
    WHERE nds.form_id = f.id AND nds.department_name = d.name
)
ORDER BY f.created_at, d.display_order;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check how many department statuses were created
SELECT 
    'Backfill Results' as check_type,
    COUNT(DISTINCT form_id) as forms_fixed,
    COUNT(*) as department_records_created
FROM no_dues_status
WHERE created_at > NOW() - INTERVAL '1 minute';

-- Show current state for all forms
SELECT 
    f.registration_no,
    f.student_name,
    f.status as form_status,
    COUNT(nds.id) as department_records_count,
    COUNT(*) FILTER (WHERE nds.status = 'pending') as pending,
    COUNT(*) FILTER (WHERE nds.status = 'approved') as approved,
    COUNT(*) FILTER (WHERE nds.status = 'rejected') as rejected
FROM no_dues_forms f
LEFT JOIN no_dues_status nds ON f.id = nds.form_id
GROUP BY f.id, f.registration_no, f.student_name, f.status
ORDER BY f.created_at DESC;