-- ============================================
-- DEFINITIVE FIX FOR LIBRARIAN AUTHORIZATION
-- Run this in Supabase SQL Editor NOW
-- ============================================

-- Step 1: Add the column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS assigned_department_ids UUID[] DEFAULT '{}';

-- Step 2: Populate for ALL department staff by linking their text department_name to the UUID
UPDATE public.profiles p
SET assigned_department_ids = ARRAY(
    SELECT d.id 
    FROM public.departments d 
    WHERE d.name = p.department_name
)
WHERE p.role = 'department' 
  AND p.department_name IS NOT NULL
  AND (p.assigned_department_ids IS NULL OR array_length(p.assigned_department_ids, 1) IS NULL);

-- Step 3: Verify the fix worked
DO $$
DECLARE
    librarian_record RECORD;
    staff_count INTEGER;
    fixed_count INTEGER;
BEGIN
    -- Check the librarian specifically
    SELECT 
        email,
        department_name,
        assigned_department_ids,
        array_length(assigned_department_ids, 1) as array_len
    INTO librarian_record
    FROM public.profiles 
    WHERE email = '15anuragsingh2003@gmail.com';
    
    -- Count all staff
    SELECT COUNT(*) INTO staff_count 
    FROM public.profiles 
    WHERE role = 'department';
    
    -- Count fixed staff
    SELECT COUNT(*) INTO fixed_count 
    FROM public.profiles 
    WHERE role = 'department' 
      AND array_length(assigned_department_ids, 1) > 0;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'AUTHORIZATION FIX COMPLETE';
    RAISE NOTICE '===========================================';
    
    IF librarian_record.email IS NOT NULL THEN
        RAISE NOTICE 'Librarian Account (15anuragsingh2003@gmail.com):';
        RAISE NOTICE '  - Department: %', librarian_record.department_name;
        RAISE NOTICE '  - UUID Count: %', librarian_record.array_len;
        
        IF librarian_record.array_len > 0 THEN
            RAISE NOTICE '  - Status: ✅ FIXED - Can now approve/reject';
        ELSE
            RAISE WARNING '  - Status: ❌ STILL BROKEN';
        END IF;
    ELSE
        RAISE WARNING 'Librarian account not found!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'All Staff Accounts:';
    RAISE NOTICE '  - Total: %', staff_count;
    RAISE NOTICE '  - Fixed: %', fixed_count;
    
    IF staff_count = fixed_count THEN
        RAISE NOTICE '  - Status: ✅ ALL ACCOUNTS WORKING';
    ELSE
        RAISE WARNING '  - Status: ⚠️  % accounts need manual review', (staff_count - fixed_count);
    END IF;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Hard refresh dashboard (Ctrl+Shift+R)';
    RAISE NOTICE '2. Login as librarian (15anuragsingh2003@gmail.com)';
    RAISE NOTICE '3. Stats should show correct counts';
    RAISE NOTICE '4. Approve/reject should work';
    RAISE NOTICE '===========================================';
END $$;

-- Step 4: Show what the librarian account looks like now
SELECT 
    email,
    role,
    department_name as old_text_field,
    assigned_department_ids as new_uuid_array,
    array_length(assigned_department_ids, 1) as uuid_count,
    (SELECT name FROM departments WHERE id = ANY(assigned_department_ids)) as resolved_department
FROM public.profiles 
WHERE email = '15anuragsingh2003@gmail.com';