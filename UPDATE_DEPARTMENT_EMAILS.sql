-- ============================================================================
-- JECRC NO DUES SYSTEM - UPDATE DEPARTMENT EMAIL ADDRESSES
-- ============================================================================
-- This script updates the department email addresses to match the new staff
-- Run this in Supabase SQL Editor BEFORE running the migration script
-- ============================================================================

-- Update all department email addresses
UPDATE public.departments SET email = 'surbhi.jetavat@jecrcu.edu.in' WHERE name = 'accounts_department';
UPDATE public.departments SET email = 'vishal.tiwari@jecrcu.edu.in' WHERE name = 'library';
UPDATE public.departments SET email = 'seniormanager.it@jecrcu.edu.in' WHERE name = 'it_department';
UPDATE public.departments SET email = 'sailendra.trivedi@jecrcu.edu.in' WHERE name = 'mess';
UPDATE public.departments SET email = 'akshar.bhardwaj@jecrcu.edu.in' WHERE name = 'hostel';
UPDATE public.departments SET email = 'anurag.sharma@jecrcu.edu.in' WHERE name = 'alumni_association';
UPDATE public.departments SET email = 'ganesh.jat@jecrcu.edu.in' WHERE name = 'registrar';
UPDATE public.departments SET email = 'umesh.sharma@jecrcu.edu.in' WHERE name = 'canteen';
UPDATE public.departments SET email = 'arjit.jain@jecrcu.edu.in' WHERE name = 'tpo';

-- School HOD email will be determined dynamically based on school/course/branch
-- So we keep it as a generic HOD email
UPDATE public.departments SET email = 'hod@jecrcu.edu.in' WHERE name = 'school_hod';

-- Verify the updates
SELECT name, display_name, email, display_order 
FROM public.departments 
WHERE is_active = true 
ORDER BY display_order;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to see all departments with their new email addresses
DO $$
DECLARE
    dept_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  DEPARTMENT EMAIL ADDRESSES UPDATED                   ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    FOR dept_record IN 
        SELECT name, display_name, email, display_order 
        FROM public.departments 
        WHERE is_active = true 
        ORDER BY display_order
    LOOP
        RAISE NOTICE '% (%)', 
            RPAD(dept_record.display_name, 30), 
            dept_record.email;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ All department emails updated successfully!';
    RAISE NOTICE '';
END $$;