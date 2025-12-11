-- ============================================================================
-- URGENT FIX: Change admission_year and passing_year from INTEGER to TEXT
-- ============================================================================
-- 
-- PROBLEM: Database has admission_year and passing_year as INTEGER
--          But API sends them as TEXT strings like "2021", "2025"
--          This causes form submission to fail
--
-- SOLUTION: Convert columns to TEXT type
--
-- Run this in Supabase SQL Editor NOW to fix form submissions
-- ============================================================================

BEGIN;

-- Step 1: Check current data type
DO $$
DECLARE
    admission_type text;
    passing_type text;
BEGIN
    SELECT data_type INTO admission_type
    FROM information_schema.columns
    WHERE table_name = 'no_dues_forms'
    AND column_name = 'admission_year';
    
    SELECT data_type INTO passing_type
    FROM information_schema.columns
    WHERE table_name = 'no_dues_forms'
    AND column_name = 'passing_year';
    
    RAISE NOTICE 'Current admission_year type: %', admission_type;
    RAISE NOTICE 'Current passing_year type: %', passing_type;
END $$;

-- Step 2: Convert existing INTEGER data to TEXT
-- This preserves any existing form data
UPDATE no_dues_forms
SET 
    admission_year_temp = admission_year::text,
    passing_year_temp = passing_year::text
WHERE admission_year IS NOT NULL OR passing_year IS NOT NULL;

-- Step 3: Drop the INTEGER columns
ALTER TABLE no_dues_forms 
DROP COLUMN IF EXISTS admission_year CASCADE;

ALTER TABLE no_dues_forms 
DROP COLUMN IF EXISTS passing_year CASCADE;

-- Step 4: Add columns back as TEXT
ALTER TABLE no_dues_forms 
ADD COLUMN admission_year TEXT;

ALTER TABLE no_dues_forms 
ADD COLUMN passing_year TEXT;

-- Step 5: Restore the data (if temp columns exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' 
        AND column_name = 'admission_year_temp'
    ) THEN
        UPDATE no_dues_forms
        SET admission_year = admission_year_temp;
        
        ALTER TABLE no_dues_forms DROP COLUMN admission_year_temp;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'no_dues_forms' 
        AND column_name = 'passing_year_temp'
    ) THEN
        UPDATE no_dues_forms
        SET passing_year = passing_year_temp;
        
        ALTER TABLE no_dues_forms DROP COLUMN passing_year_temp;
    END IF;
END $$;

-- Step 6: Verify the change
DO $$
DECLARE
    admission_type text;
    passing_type text;
BEGIN
    SELECT data_type INTO admission_type
    FROM information_schema.columns
    WHERE table_name = 'no_dues_forms'
    AND column_name = 'admission_year';
    
    SELECT data_type INTO passing_type
    FROM information_schema.columns
    WHERE table_name = 'no_dues_forms'
    AND column_name = 'passing_year';
    
    RAISE NOTICE '✅ NEW admission_year type: %', admission_type;
    RAISE NOTICE '✅ NEW passing_year type: %', passing_type;
    
    IF admission_type != 'text' OR passing_type != 'text' THEN
        RAISE EXCEPTION 'Column types not updated correctly!';
    END IF;
    
    RAISE NOTICE '✅ SUCCESS: Columns are now TEXT type';
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY - Run after the above completes
-- ============================================================================
-- This should show "text" for both columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'no_dues_forms'
AND column_name IN ('admission_year', 'passing_year')
ORDER BY column_name;

-- ============================================================================
-- TEST QUERY - Try inserting a test record with TEXT years
-- ============================================================================
-- This should succeed now
/*
INSERT INTO no_dues_forms (
    registration_no,
    student_name,
    admission_year,
    passing_year,
    school_id,
    school,
    course_id,
    course,
    branch_id,
    branch,
    contact_no,
    personal_email,
    college_email,
    status
) VALUES (
    'TEST999',
    'Test Student',
    '2020',  -- TEXT string
    '2024',  -- TEXT string
    'df4a9984-a7b7-40d6-97b9-75b1ee3d94d4',  -- School of Engineering UUID
    'School of Engineering & Technology',
    '0f516ed2-7e90-4c7f-9f7f-2f8e3d4c5b6a',  -- Some course UUID
    'B.Tech',
    '91b7ff7a-1234-5678-9abc-def012345678',  -- Some branch UUID
    'Computer Science',
    '9876543210',
    'test@example.com',
    'test@jecrcu.edu.in',
    'pending'
);

-- Clean up test record
DELETE FROM no_dues_forms WHERE registration_no = 'TEST999';
*/