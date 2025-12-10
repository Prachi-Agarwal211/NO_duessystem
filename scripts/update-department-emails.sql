-- ============================================================================
-- UPDATE DEPARTMENT EMAIL ADDRESSES FOR NOTIFICATIONS
-- ============================================================================
-- This script updates department emails so notifications go to the right staff
-- Run this AFTER creating staff accounts
-- ============================================================================

-- Update department email addresses to match staff accounts
UPDATE public.departments 
SET email = '15anuragsingh2003@gmail.com'
WHERE name = 'library';

UPDATE public.departments 
SET email = 'prachiagarwal211@gmail.com'
WHERE name = 'accounts_department';

UPDATE public.departments 
SET email = 'anurag.22bcom1367@jecrcu.edu.in'
WHERE name = 'school_hod';

UPDATE public.departments 
SET email = 'razorrag.official@gmail.com'
WHERE name = 'it_department';

UPDATE public.departments 
SET email = 'razorrag.official@gmail.com'
WHERE name = 'hostel';

UPDATE public.departments 
SET email = 'razorrag.official@gmail.com'
WHERE name = 'mess';

UPDATE public.departments 
SET email = 'razorrag.official@gmail.com'
WHERE name = 'canteen';

UPDATE public.departments 
SET email = 'razorrag.official@gmail.com'
WHERE name = 'tpo';

UPDATE public.departments 
SET email = 'razorrag.official@gmail.com'
WHERE name = 'alumni_association';

UPDATE public.departments 
SET email = 'razorrag.official@gmail.com'
WHERE name = 'jic';

UPDATE public.departments 
SET email = 'razorrag.official@gmail.com'
WHERE name = 'student_council';

-- Verify updates
SELECT 
    name,
    display_name,
    email,
    display_order
FROM public.departments
ORDER BY display_order;

-- ============================================================================
-- VERIFICATION COMPLETE
-- ============================================================================
-- Now emails will be sent to:
-- - Library: 15anuragsingh2003@gmail.com
-- - Accounts: prachiagarwal211@gmail.com
-- - School HOD: anurag.22bcom1367@jecrcu.edu.in
-- - Other departments: razorrag.official@gmail.com (Admin)
-- ============================================================================