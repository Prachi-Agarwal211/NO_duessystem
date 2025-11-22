-- ============================================================================
-- REMOVE ALL AUTO-UPDATE TRIGGERS
-- ============================================================================
-- This removes the problematic triggers that were causing auto-approval
-- Form status will now be managed by API code instead
-- ============================================================================

-- Drop the form status update trigger
DROP TRIGGER IF EXISTS trigger_update_form_status ON public.no_dues_status;

-- Drop the trigger function (no longer needed)
DROP FUNCTION IF EXISTS update_form_status_on_department_action();

-- Keep the trigger that creates initial department statuses - this one is safe
-- DROP TRIGGER IF EXISTS trigger_create_department_statuses ON public.no_dues_forms;
-- We keep this because it just creates 12 pending records, doesn't cause issues

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('no_dues_forms', 'no_dues_status')
ORDER BY trigger_name;

-- Should now show ONLY:
-- trigger_create_department_statuses | INSERT | no_dues_forms
-- trigger_update_forms_updated_at | UPDATE | no_dues_forms
-- trigger_update_profiles_updated_at | UPDATE | profiles

-- ============================================================================
-- NEXT STEPS:
-- After running this SQL:
-- 1. Form status will remain 'pending' after submission ✅
-- 2. Staff action API will update form status when departments act
-- 3. No more race conditions or auto-approvals
-- ============================================================================