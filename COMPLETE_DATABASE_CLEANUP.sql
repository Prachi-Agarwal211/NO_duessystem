-- ============================================
-- COMPLETE DATABASE CLEANUP & FIX
-- Separates manual entries and fixes all authorization
-- ============================================

-- ============================================
-- STEP 1: CREATE SEPARATE TABLE FOR MANUAL ENTRIES
-- ============================================
CREATE TABLE IF NOT EXISTS public.manual_no_dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_no TEXT UNIQUE NOT NULL,
    student_name TEXT NOT NULL,
    personal_email TEXT,
    college_email TEXT,
    contact_no TEXT,
    country_code TEXT DEFAULT '+91',
    school TEXT,
    school_id UUID REFERENCES public.config_schools(id),
    course TEXT,
    course_id UUID REFERENCES public.config_courses(id),
    branch TEXT,
    branch_id UUID REFERENCES public.config_branches(id),
    admission_year TEXT,
    passing_year TEXT,
    certificate_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_manual_no_dues_status ON public.manual_no_dues(status);
CREATE INDEX IF NOT EXISTS idx_manual_no_dues_reg_no ON public.manual_no_dues(registration_no);

-- ============================================
-- STEP 2: CHECK IF MANUAL COLUMNS EXIST
-- ============================================
DO $$
DECLARE
    has_manual_columns BOOLEAN;
BEGIN
    -- Check if manual entry columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'no_dues_forms'
        AND column_name = 'is_manual_entry'
    ) INTO has_manual_columns;
    
    IF has_manual_columns THEN
        RAISE NOTICE 'Manual entry columns found - migrating data...';
        
        -- Migrate existing manual entries
        INSERT INTO public.manual_no_dues (
            registration_no,
            student_name,
            personal_email,
            college_email,
            contact_no,
            country_code,
            school,
            school_id,
            course,
            course_id,
            branch,
            branch_id,
            admission_year,
            passing_year,
            certificate_url,
            status,
            approved_by,
            approved_at,
            rejection_reason,
            created_at,
            updated_at
        )
        SELECT
            registration_no,
            student_name,
            personal_email,
            college_email,
            contact_no,
            COALESCE(country_code, '+91'),
            school,
            school_id,
            course,
            course_id,
            branch,
            branch_id,
            admission_year,
            passing_year,
            COALESCE(manual_certificate_url, certificate_url),
            CASE
                WHEN manual_status = 'approved' THEN 'approved'
                WHEN manual_status = 'rejected' THEN 'rejected'
                ELSE 'pending_review'
            END,
            manual_entry_approved_by,
            manual_entry_approved_at,
            manual_entry_rejection_reason,
            created_at,
            updated_at
        FROM public.no_dues_forms
        WHERE is_manual_entry = true
        ON CONFLICT (registration_no) DO NOTHING;
        
        -- Delete manual entries from main table
        DELETE FROM public.no_dues_forms WHERE is_manual_entry = true;
        
        -- Remove manual entry columns
        ALTER TABLE public.no_dues_forms
        DROP COLUMN IF EXISTS is_manual_entry CASCADE,
        DROP COLUMN IF EXISTS manual_status CASCADE,
        DROP COLUMN IF EXISTS manual_certificate_url CASCADE,
        DROP COLUMN IF EXISTS manual_entry_approved_by CASCADE,
        DROP COLUMN IF EXISTS manual_entry_approved_at CASCADE,
        DROP COLUMN IF EXISTS manual_entry_rejection_reason CASCADE;
        
        RAISE NOTICE 'Manual entries migrated and columns removed ✅';
    ELSE
        RAISE NOTICE 'Manual columns already removed - skipping migration ✅';
    END IF;
END $$;

-- ============================================
-- STEP 5: FIX PROFILE -> DEPARTMENT MAPPING
-- ============================================

-- Add the UUID array column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS assigned_department_ids UUID[] DEFAULT '{}';

-- Link ALL department staff to their departments via UUID
UPDATE public.profiles p
SET assigned_department_ids = ARRAY(
    SELECT d.id 
    FROM public.departments d 
    WHERE d.name = p.department_name
)
WHERE p.role = 'department' 
  AND p.department_name IS NOT NULL
  AND (
    p.assigned_department_ids IS NULL 
    OR array_length(p.assigned_department_ids, 1) IS NULL
    OR array_length(p.assigned_department_ids, 1) = 0
  );

-- ============================================
-- STEP 6: ENSURE ALL FORMS HAVE STATUS ROWS
-- ============================================

-- Generate missing status rows for all existing online forms
INSERT INTO public.no_dues_status (form_id, department_name, status)
SELECT f.id, d.name, 'pending'
FROM public.no_dues_forms f
CROSS JOIN public.departments d
WHERE NOT EXISTS (
    SELECT 1 FROM public.no_dues_status s 
    WHERE s.form_id = f.id AND s.department_name = d.name
);

-- ============================================
-- STEP 7: VERIFICATION & SUMMARY
-- ============================================

DO $$
DECLARE
    manual_count INTEGER;
    online_count INTEGER;
    staff_count INTEGER;
    fixed_staff INTEGER;
    broken_staff INTEGER;
    missing_status_count INTEGER;
BEGIN
    -- Count manual entries
    SELECT COUNT(*) INTO manual_count FROM public.manual_no_dues;
    
    -- Count online forms
    SELECT COUNT(*) INTO online_count FROM public.no_dues_forms;
    
    -- Count staff accounts
    SELECT COUNT(*) INTO staff_count FROM public.profiles WHERE role = 'department';
    
    -- Count fixed staff
    SELECT COUNT(*) INTO fixed_staff 
    FROM public.profiles 
    WHERE role = 'department' AND array_length(assigned_department_ids, 1) > 0;
    
    broken_staff := staff_count - fixed_staff;
    
    -- Check for missing statuses
    SELECT COUNT(DISTINCT f.id) INTO missing_status_count
    FROM public.no_dues_forms f
    WHERE NOT EXISTS (
        SELECT 1 FROM public.no_dues_status s 
        WHERE s.form_id = f.id
    );
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'DATABASE CLEANUP COMPLETE';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'MANUAL ENTRIES:';
    RAISE NOTICE '  - Migrated: % records', manual_count;
    RAISE NOTICE '  - New Table: manual_no_dues';
    RAISE NOTICE '';
    RAISE NOTICE 'ONLINE FORMS:';
    RAISE NOTICE '  - Active: % records', online_count;
    RAISE NOTICE '  - Manual columns: REMOVED ✅';
    RAISE NOTICE '';
    RAISE NOTICE 'STAFF AUTHORIZATION:';
    RAISE NOTICE '  - Total Staff: %', staff_count;
    RAISE NOTICE '  - Fixed: % ✅', fixed_staff;
    RAISE NOTICE '  - Broken: % %', broken_staff, CASE WHEN broken_staff = 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';
    RAISE NOTICE 'STATUS ROWS:';
    RAISE NOTICE '  - Forms missing status: % %', missing_status_count, CASE WHEN missing_status_count = 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';
    
    IF broken_staff = 0 AND missing_status_count = 0 THEN
        RAISE NOTICE '🎉 SUCCESS: ALL SYSTEMS OPERATIONAL!';
        RAISE NOTICE '';
        RAISE NOTICE 'Next Steps:';
        RAISE NOTICE '1. Hard refresh all dashboards (Ctrl+Shift+R)';
        RAISE NOTICE '2. Test login for each department';
        RAISE NOTICE '3. Verify approve/reject works';
        RAISE NOTICE '4. Check stats show correct numbers';
    ELSE
        IF broken_staff > 0 THEN
            RAISE WARNING '⚠️  % staff accounts need manual review', broken_staff;
        END IF;
        IF missing_status_count > 0 THEN
            RAISE WARNING '⚠️  % forms are missing status rows', missing_status_count;
        END IF;
    END IF;
    RAISE NOTICE '===========================================';
END $$;

-- Show detailed status of all staff accounts
SELECT 
    email,
    full_name,
    role,
    department_name as old_text_field,
    assigned_department_ids,
    array_length(assigned_department_ids, 1) as uuid_count,
    CASE 
        WHEN array_length(assigned_department_ids, 1) > 0 THEN '✅ WORKING'
        ELSE '❌ BROKEN'
    END as status,
    (
        SELECT string_agg(d.display_name, ', ')
        FROM departments d
        WHERE d.id = ANY(assigned_department_ids)
    ) as assigned_departments
FROM public.profiles 
WHERE role = 'department'
ORDER BY 
    CASE WHEN array_length(assigned_department_ids, 1) > 0 THEN 1 ELSE 0 END,
    email;