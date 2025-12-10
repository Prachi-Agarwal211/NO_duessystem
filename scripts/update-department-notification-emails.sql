-- ============================================================================
-- UPDATE DEPARTMENT EMAIL ADDRESSES FOR NOTIFICATIONS
-- ============================================================================
-- This script updates department email addresses so that when a student
-- submits a form, the relevant staff members get email notifications
-- ============================================================================

-- Update Library department email
UPDATE public.departments
SET email = '15anuragsingh2003@gmail.com'
WHERE name = 'library';

-- Update Accounts department email
UPDATE public.departments
SET email = 'prachiagarwal211@gmail.com'
WHERE name = 'accounts_department';

-- Update School HOD email (for BCA/MCA students)
UPDATE public.departments
SET email = 'anurag.22bcom1367@jecrcu.edu.in'
WHERE name = 'school_hod';

-- Keep other department emails as default for now
-- You can update these later when you have staff for those departments

-- Verify the updates
SELECT 
    name,
    display_name,
    email,
    display_order,
    is_active
FROM public.departments
ORDER BY display_order;

-- ============================================================================
-- RESULT: Department Email Configuration
-- ============================================================================
-- library              → 15anuragsingh2003@gmail.com
-- accounts_department  → prachiagarwal211@gmail.com
-- school_hod           → anurag.22bcom1367@jecrcu.edu.in
-- ============================================================================