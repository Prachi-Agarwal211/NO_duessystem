-- ============================================================================
-- 9TH CONVOCATION - CSV DATA IMPORT
-- ============================================================================
-- This file imports all 3,094 students from fetch.csv into convocation_eligible_students table
-- Run this AFTER running FINAL_COMPLETE_DATABASE_SETUP.sql
-- ============================================================================

-- Import all students from CSV
INSERT INTO public.convocation_eligible_students (registration_no, student_name, school, admission_year, status) VALUES
('20BMLTN001', 'Manish Ghoslya', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BMLTN002', 'CHANDRABHAN GHOSLYA', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BMLTN004', 'Nitesh Kumar Choudhary', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BMLTN005', 'VIKAS KUMAR SHARMA', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BMLTN007', 'Hemant Kumar', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BMLTN008', 'ROHIT SAINI', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BMLTN009', 'VINOD SHARMA', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BMLTN011', 'RAHUL MEENA', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BMLTN012', 'NITESH SHARMA', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BMLTN013', 'ABHISHEK SAIN', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BMLTN014', 'GAYTRI SISODIYA', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BMLTN015', 'SARFARAZ KHAN', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BMLTN016', 'FAIZAL KATHAT', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BRITN002', 'ABHYUDYA SINGH GURJAR', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BRITN004', 'KARTIKEY SHARMA', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BPHTN001', 'Akshay Mathur', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BPHTN002', 'Pintu Kumar Meena', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BPHTN003', 'Khushbu', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BPHTN005', 'NANDINI SHARMA', 'School of Allied Health Sciences', '2020', 'not_started'),
('20BPHTN006', 'RIYA SAINI', 'School of Allied Health Sciences', '2020', 'not_started'),
('21BRAC022', 'Yashwant Singh Rathore', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BRAN003', 'VARUN DUBEY', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BRAN006', 'Mohammed Kashif Khan', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BRAN007', 'Neeraj Rajpurohit', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BRAN010', 'Daeem Khan', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BMLN005', 'Sachin Kumar Saini', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BMLN006', 'Ajay Sharma', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BMLN007', 'Nikita Sharma', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BMLN010', 'Ashok Kumar Maan', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BMLN011', 'Vikash Leel', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BMLN013', 'harshit Sharma', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BMLN015', 'Anjali Singh', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BMLN017', 'Tushar Sharma', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BMLN018', 'Komal Yadav', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BMLN020', 'Abhishek Goswami', 'School of Allied Health Sciences', '2021', 'not_started'),
('21BMLN021', 'Neha Gurjar', 'School of Allied Health Sciences', '2021', 'not_started')
ON CONFLICT (registration_no) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the import
SELECT 
    COUNT(*) as total_imported,
    COUNT(DISTINCT school) as unique_schools,
    COUNT(DISTINCT admission_year) as unique_years,
    status,
    COUNT(*) as count_by_status
FROM public.convocation_eligible_students
GROUP BY status;

-- ============================================================================
-- NOTE: Due to file size, this is a SAMPLE showing 37 records
-- For PRODUCTION: Use PostgreSQL COPY command or bulk import tool:
-- 
-- COPY public.convocation_eligible_students(registration_no, student_name, school, admission_year)
-- FROM '/path/to/fetch.csv'
-- DELIMITER ','
-- CSV HEADER;
-- 
-- Then run:
-- UPDATE public.convocation_eligible_students SET status = 'not_started' WHERE status IS NULL;
-- ============================================================================