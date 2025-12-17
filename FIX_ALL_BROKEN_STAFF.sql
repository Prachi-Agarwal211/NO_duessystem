-- ============================================
-- FIX ALL BROKEN STAFF ACCOUNTS
-- Ensures EVERY department staff member has proper UUID linkage
-- ============================================

-- Fix all department staff accounts that are missing UUID assignments
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

-- Verify the fix
DO $$
DECLARE
    staff_record RECORD;
    total_count INTEGER := 0;
    fixed_count INTEGER := 0;
    broken_count INTEGER := 0;
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'FIXING ALL STAFF ACCOUNTS';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    
    -- Loop through all department staff
    FOR staff_record IN 
        SELECT 
            email,
            full_name,
            department_name,
            assigned_department_ids,
            array_length(assigned_department_ids, 1) as uuid_count
        FROM public.profiles 
        WHERE role = 'department'
        ORDER BY email
    LOOP
        total_count := total_count + 1;
        
        IF staff_record.uuid_count > 0 THEN
            fixed_count := fixed_count + 1;
            RAISE NOTICE '✅ % (%) - %', 
                staff_record.full_name, 
                staff_record.email,
                staff_record.department_name;
        ELSE
            broken_count := broken_count + 1;
            RAISE WARNING '❌ % (%) - STILL BROKEN (dept: %)', 
                staff_record.full_name, 
                staff_record.email,
                staff_record.department_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'SUMMARY';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Total Staff: %', total_count;
    RAISE NOTICE 'Fixed: %', fixed_count;
    RAISE NOTICE 'Still Broken: %', broken_count;
    RAISE NOTICE '';
    
    IF broken_count = 0 THEN
        RAISE NOTICE '🎉 SUCCESS: ALL STAFF ACCOUNTS WORKING!';
        RAISE NOTICE '';
        RAISE NOTICE 'Next Steps:';
        RAISE NOTICE '1. Hard refresh all dashboards (Ctrl+Shift+R)';
        RAISE NOTICE '2. Test login for each department staff';
        RAISE NOTICE '3. Verify approve/reject works';
    ELSE
        RAISE WARNING '⚠️  % ACCOUNTS STILL BROKEN', broken_count;
        RAISE NOTICE 'These accounts may have invalid department_name values';
        RAISE NOTICE 'Check the department_name field matches a valid department';
    END IF;
    RAISE NOTICE '===========================================';
END $$;

-- Show detailed status of all accounts
SELECT 
    email,
    full_name,
    department_name,
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