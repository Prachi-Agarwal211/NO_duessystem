-- ============================================================================
-- FIX: Missing convocation_students Table Error
-- ============================================================================
-- Error: relation "public.convocation_students" does not exist
-- Solution: Either create the table OR disable the trigger (recommended for now)
-- ============================================================================

-- ============================================================================
-- OPTION 1: QUICK FIX - Disable the Convocation Trigger (RECOMMENDED)
-- ============================================================================
-- This allows form submission to work immediately without the convocation feature

DROP TRIGGER IF EXISTS trigger_update_convocation_status ON public.no_dues_forms;

-- Replace the function with a no-op version that doesn't fail
DROP FUNCTION IF EXISTS public.update_convocation_status() CASCADE;

CREATE FUNCTION public.update_convocation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Disabled: Convocation table not yet created
    -- This trigger will be re-enabled when convocation_students table exists
    RETURN NEW;
END;
$$;

-- Recreate trigger (now it does nothing, but won't crash)
CREATE TRIGGER trigger_update_convocation_status
AFTER INSERT OR UPDATE ON public.no_dues_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_convocation_status();

-- ============================================================================
-- OPTION 2: FULL FIX - Create the Convocation Table (Run this later if needed)
-- ============================================================================
-- Uncomment and run this when you want to enable convocation tracking

/*
CREATE TABLE IF NOT EXISTS public.convocation_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_no TEXT UNIQUE NOT NULL,
    student_name TEXT NOT NULL,
    school_id UUID REFERENCES public.config_schools(id),
    course_id UUID REFERENCES public.config_courses(id),
    branch_id UUID REFERENCES public.config_branches(id),
    school TEXT,
    course TEXT,
    branch TEXT,
    admission_year TEXT,
    passing_year TEXT,
    personal_email TEXT,
    contact_no TEXT,
    no_dues_submitted BOOLEAN DEFAULT false,
    no_dues_status TEXT DEFAULT 'not_submitted' CHECK (no_dues_status IN ('not_submitted', 'pending', 'completed', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_convocation_registration ON public.convocation_students(registration_no);
CREATE INDEX IF NOT EXISTS idx_convocation_status ON public.convocation_students(no_dues_status);
CREATE INDEX IF NOT EXISTS idx_convocation_year ON public.convocation_students(passing_year);

-- Then re-enable the full trigger function:
DROP FUNCTION IF EXISTS public.update_convocation_status() CASCADE;

CREATE FUNCTION public.update_convocation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.convocation_students
        SET 
            no_dues_submitted = true,
            no_dues_status = NEW.status,
            updated_at = NOW()
        WHERE registration_no = NEW.registration_no;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_convocation_status
AFTER INSERT OR UPDATE ON public.no_dues_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_convocation_status();
*/

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that the trigger exists and won't crash
SELECT 
    tgname as trigger_name,
    tgenabled as is_enabled,
    'convocation_students table not required anymore' as status
FROM pg_trigger
WHERE tgname = 'trigger_update_convocation_status'
AND tgrelid = 'public.no_dues_forms'::regclass;

-- Verify all 4 critical triggers exist
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    'Active' as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid IN ('public.no_dues_forms'::regclass, 'public.no_dues_status'::regclass)
ORDER BY t.tgname;