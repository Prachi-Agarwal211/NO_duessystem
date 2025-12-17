# Add Two HOD Staff Accounts

## Overview
This document provides instructions to add two HOD staff accounts to the JECRC No Dues System.

## Account Details

### 1. Engineering HOD
- **Email**: razorrag.official@gmail.com
- **Password**: JECRC@2024
- **Department**: school_hod
- **School**: School of Engineering & Technology
- **Courses**: B.Tech, M.Tech
- **Scope**: All branches within B.Tech and M.Tech programs

### 2. Business School HOD
- **Email**: prachiagarwal211@gmail.com
- **Password**: JECRC@2024
- **Department**: school_hod
- **School**: Jaipur School of Business
- **Courses**: BBA, MBA
- **Scope**: All branches within BBA and MBA programs

## How These HODs Work

### Scoped Access
These HOD accounts use the school_hod department type with **scoped access**:

1. **Engineering HOD** will only see students from:
   - School: School of Engineering & Technology
   - Courses: B.Tech OR M.Tech
   - Branches: All branches in these courses (CSE, IT, ECE, Mechanical, Civil, AI/ML, etc.)

2. **Business School HOD** will only see students from:
   - School: Jaipur School of Business
   - Courses: BBA OR MBA
   - Branches: All branches in these courses (Finance, Marketing, HR, Digital Marketing, etc.)

### Database Schema
The profiles table stores scope using UUID arrays:
```sql
school_ids UUID[]  -- Array of school UUIDs they can see
course_ids UUID[]  -- Array of course UUIDs they can see
branch_ids UUID[]  -- Array of branch UUIDs (empty = all branches in courses)
```

## Installation Methods

### Method 1: Run Node.js Script (Recommended)

```bash
# Install dependencies if not already installed
npm install

# Run the script
node scripts/add-two-hod-accounts.js
```

The script will:
1. Look up the correct school and course UUIDs from the database
2. Create auth users in Supabase Auth
3. Create profile records with proper scope configuration
4. Display login credentials

### Method 2: Manual SQL (Alternative)

If you prefer to add manually via Supabase SQL Editor:

```sql
-- Step 1: Get School and Course IDs
SELECT id, name FROM config_schools 
WHERE name IN ('School of Engineering & Technology', 'Jaipur School of Business');

SELECT id, name, school_id FROM config_courses 
WHERE name IN ('B.Tech', 'M.Tech', 'BBA', 'MBA');

-- Step 2: Create users in Supabase Auth Dashboard
-- Go to Authentication > Users > Add User
-- Email: razorrag.official@gmail.com, Password: JECRC@2024
-- Email: prachiagarwal211@gmail.com, Password: JECRC@2024

-- Step 3: Insert profiles (replace UUIDs with actual values from Step 1)
-- Engineering HOD
INSERT INTO profiles (id, email, full_name, role, department_name, school_ids, course_ids, branch_ids, is_active)
VALUES (
  'AUTH_USER_UUID_FROM_STEP_2',
  'razorrag.official@gmail.com',
  'Engineering HOD',
  'department',
  'school_hod',
  ARRAY['ENGINEERING_SCHOOL_UUID']::uuid[],
  ARRAY['BTECH_COURSE_UUID', 'MTECH_COURSE_UUID']::uuid[],
  ARRAY[]::uuid[],
  true
);

-- Business School HOD
INSERT INTO profiles (id, email, full_name, role, department_name, school_ids, course_ids, branch_ids, is_active)
VALUES (
  'AUTH_USER_UUID_FROM_STEP_2',
  'prachiagarwal211@gmail.com',
  'Business School HOD',
  'department',
  'school_hod',
  ARRAY['BUSINESS_SCHOOL_UUID']::uuid[],
  ARRAY['BBA_COURSE_UUID', 'MBA_COURSE_UUID']::uuid[],
  ARRAY[]::uuid[],
  true
);
```

## Testing the Accounts

### 1. Login Test
1. Go to https://no-duessystem.onrender.com/staff/login
2. Login with either account
3. Verify you're redirected to the staff dashboard

### 2. Scope Test - Engineering HOD
1. Login as razorrag.official@gmail.com
2. Submit a test form for a B.Tech CSE student
3. Verify the Engineering HOD sees this application
4. Submit a test form for an MBA student
5. Verify the Engineering HOD does NOT see this application

### 3. Scope Test - Business HOD
1. Login as prachiagarwal211@gmail.com
2. Submit a test form for an MBA student
3. Verify the Business HOD sees this application
4. Submit a test form for a B.Tech student
5. Verify the Business HOD does NOT see this application

## Email Notifications

Both HODs will receive email notifications for:
- New applications from students in their scope
- Reapplications from students they previously rejected
- Status updates

Email notifications are filtered by scope:
- Engineering HOD: Only students from Engineering school with B.Tech/M.Tech courses
- Business HOD: Only students from Business school with BBA/MBA courses

## Verification Queries

After creating the accounts, verify they were set up correctly:

```sql
-- Check profiles
SELECT 
  email,
  full_name,
  department_name,
  school_ids,
  course_ids,
  branch_ids,
  is_active
FROM profiles
WHERE email IN ('razorrag.official@gmail.com', 'prachiagarwal211@gmail.com');

-- Check they can see correct schools
SELECT 
  p.email,
  s.name as school_name
FROM profiles p
CROSS JOIN unnest(p.school_ids) as school_id
JOIN config_schools s ON s.id = school_id
WHERE p.email IN ('razorrag.official@gmail.com', 'prachiagarwal211@gmail.com');

-- Check they can see correct courses
SELECT 
  p.email,
  c.name as course_name,
  s.name as school_name
FROM profiles p
CROSS JOIN unnest(p.course_ids) as course_id
JOIN config_courses c ON c.id = course_id
JOIN config_schools s ON s.id = c.school_id
WHERE p.email IN ('razorrag.official@gmail.com', 'prachiagarwal211@gmail.com');
```

## Troubleshooting

### Account Already Exists
If you see "User already exists" error:
1. Delete the existing user from Supabase Auth Dashboard
2. Delete the profile record: `DELETE FROM profiles WHERE email = 'email@example.com'`
3. Run the script again

### Can't See Applications
If an HOD can't see expected applications:
1. Verify their `school_ids`, `course_ids`, and `branch_ids` arrays
2. Check the student's form has matching `school_id`, `course_id`, and `branch_id`
3. Check `is_active = true` for the profile

### Email Not Receiving Notifications
1. Verify email address is correct in profiles table
2. Check email queue: `SELECT * FROM email_queue WHERE recipient_email = 'email@example.com'`
3. Check SMTP configuration in environment variables

## Security Notes

- ✅ Default password: JECRC@2024 (users should change this on first login)
- ✅ HODs can only see students within their scope
- ✅ HODs cannot approve/reject students from other schools/courses
- ✅ All actions are logged in audit_log table
- ✅ Passwords are hashed in Supabase Auth (never stored in plain text)

## Support

If you encounter issues:
1. Check Supabase logs for auth errors
2. Check application logs for scope filtering errors
3. Verify database schema matches ULTIMATE_DATABASE_SETUP.sql
4. Contact system administrator

---
**Created**: 2025-12-17  
**Status**: Ready for deployment