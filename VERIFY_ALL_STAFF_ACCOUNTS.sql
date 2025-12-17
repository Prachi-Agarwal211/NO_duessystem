-- ============================================
-- VERIFY ALL DEPARTMENT STAFF ACCOUNTS
-- Check if every staff member has been properly linked to departments
-- ============================================

-- Check all department staff accounts
SELECT 
    email,
    full_name,
    role,
    department_name as old_text_field,
    assigned_department_ids as uuid_array,
    array_length(assigned_department_ids, 1) as uuid_count,
    CASE 
        WHEN assigned_department_ids IS NULL THEN '❌ NULL - BROKEN'
        WHEN array_length(assigned_department_ids, 1) IS NULL THEN '❌ EMPTY ARRAY - BROKEN'
        WHEN array_length(assigned_department_ids, 1) = 0 THEN '❌ ZERO LENGTH - BROKEN'
        ELSE '✅ FIXED'
    END as status,
    (
        SELECT string_agg(d.name, ', ')
        FROM departments d
        WHERE d.id = ANY(assigned_department_ids)
    ) as resolved_departments
FROM public.profiles 
WHERE role = 'department'
ORDER BY email;

-- Show summary
DO $$
DECLARE
    total_staff INTEGER;
    fixed_staff INTEGER;
    broken_staff INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_staff 
    FROM public.profiles 
    WHERE role = 'department';
    
    SELECT COUNT(*) INTO fixed_staff 
    FROM public.profiles 
    WHERE role = 'department' 
      AND array_length(assigned_department_ids, 1) > 0;
    
    broken_staff := total_staff - fixed_staff;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'STAFF ACCOUNT VERIFICATION';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Total Department Staff: %', total_staff;
    RAISE NOTICE 'Fixed (Working): %', fixed_staff;
    RAISE NOTICE 'Broken (Need Fix): %', broken_staff;
    RAISE NOTICE '';
    
    IF broken_staff = 0 THEN
        RAISE NOTICE '✅ ALL STAFF ACCOUNTS ARE WORKING';
    ELSE
        RAISE WARNING '❌ % STAFF ACCOUNTS ARE BROKEN', broken_staff;
        RAISE NOTICE 'Run FIX_ALL_BROKEN_STAFF.sql to fix them';
    END IF;
    RAISE NOTICE '===========================================';
END $$;