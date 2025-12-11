# JECRC No Dues System - Staff Account Migration Guide

## 📋 Overview

This guide will help you migrate from the old staff configuration to the new one with updated email addresses and proper department assignments.

## 🆕 New Staff Configuration

### Department Staff (9 departments - see all students)
1. **Accounts** - surbhi.jetavat@jecrcu.edu.in
2. **Library** - vishal.tiwari@jecrcu.edu.in
3. **IT Department** - seniormanager.it@jecrcu.edu.in
4. **Mess** - sailendra.trivedi@jecrcu.edu.in
5. **Hostel** - akshar.bhardwaj@jecrcu.edu.in
6. **Alumni** - anurag.sharma@jecrcu.edu.in
7. **Registrar** - ganesh.jat@jecrcu.edu.in
8. **Canteen** - umesh.sharma@jecrcu.edu.in
9. **TPO** - arjit.jain@jecrcu.edu.in

### School HODs (4 HODs - filtered by school/course/branch)
10. **BCA/MCA HOD** - prachiagarwal211@gmail.com
    - School: School of Computer Applications
    - Courses: BCA (13 branches), MCA (9 branches)
    - Total: 22 branches

11. **CSE HOD** - 15anuragsingh2003@gmail.com
    - School: School of Engineering & Technology
    - Courses: B.Tech CSE specializations, M.Tech CSE
    - Total: 16 branches

12. **Business School HOD** - anurag.22bcom1367@jecrcu.edu.in
    - School: Jaipur School of Business
    - Courses: MBA (17 branches), BBA (9 branches), B.Com (3 branches)
    - Total: 29 branches

13. **Multi-School HOD** - razorrag.official@gmail.com
    - Schools: 6 schools
      - Jaipur School of Mass Communication
      - School of Hospitality
      - Jaipur School of Design
      - School of Law
      - School of Sciences
      - School of Humanities & Social Sciences
    - All courses and branches in these schools

### Admin
- **System Admin** - admin@jecrcu.edu.in (unchanged)

## 🚀 Migration Steps

### Step 1: Update Department Emails in Database

Run the SQL script in Supabase SQL Editor:

```bash
# File: UPDATE_DEPARTMENT_EMAILS.sql
```

This updates the email addresses in the `departments` table so notifications go to the correct staff members.

### Step 2: Run Migration Script

```bash
node scripts/migrate-staff-accounts.js
```

This script will:
1. ✅ Remove old staff accounts (except admin)
2. ✅ Create all 13 new staff accounts
3. ✅ Assign proper department access
4. ✅ Configure school/course/branch scoping for HODs
5. ✅ Verify all accounts were created successfully

### Step 3: Verify Staff Accounts

The script automatically verifies all accounts. You should see output like:

```
Found 13 department staff accounts:

✓ surbhi.jetavat@jecrcu.edu.in
  Name: Surbhi Jetavat
  Department: accounts_department
  Scope: All students

✓ prachiagarwal211@gmail.com
  Name: Prachi Agarwal
  Department: school_hod
  Scope: 1 school(s)
         2 course(s)
         All branches

...etc
```

### Step 4: Test Login for Each Account

Test each account to ensure they can log in:

| Email | Password | Expected Dashboard |
|-------|----------|-------------------|
| surbhi.jetavat@jecrcu.edu.in | Test@1234 | All pending students |
| vishal.tiwari@jecrcu.edu.in | Test@1234 | All pending students |
| seniormanager.it@jecrcu.edu.in | Test@1234 | All pending students |
| sailendra.trivedi@jecrcu.edu.in | Test@1234 | All pending students |
| akshar.bhardwaj@jecrcu.edu.in | Test@1234 | All pending students |
| anurag.sharma@jecrcu.edu.in | Test@1234 | All pending students |
| ganesh.jat@jecrcu.edu.in | Test@1234 | All pending students |
| umesh.sharma@jecrcu.edu.in | Test@1234 | All pending students |
| arjit.jain@jecrcu.edu.in | Test@1234 | All pending students |
| prachiagarwal211@gmail.com | Test@1234 | BCA/MCA students only |
| 15anuragsingh2003@gmail.com | Test@1234 | CSE students only |
| anurag.22bcom1367@jecrcu.edu.in | Test@1234 | MBA/BBA/B.Com students only |
| razorrag.official@gmail.com | Test@1234 | 6 schools' students only |

### Step 5: Test Email Notifications

1. Submit a test student form
2. Verify all 10 departments receive email notifications:
   - ✅ School HOD (correct HOD based on student's school/course)
   - ✅ Library
   - ✅ IT Department
   - ✅ Hostel
   - ✅ Mess
   - ✅ Canteen
   - ✅ TPO
   - ✅ Alumni Association
   - ✅ Accounts
   - ✅ Registrar

3. Check that email button redirects to: `https://no-duessystem.vercel.app/staff/login`

### Step 6: Test Workflow

1. **HOD Testing**: Login as each HOD and verify they only see their assigned students
2. **Department Testing**: Login as department staff and verify they see all students
3. **Approve/Reject**: Test approving and rejecting applications
4. **Email Flow**: Verify status update emails are sent correctly

## 📊 Account Scoping Details

### Department Staff (Non-HOD)
- **Scope**: See ALL students across ALL schools/courses/branches
- **Reason**: These departments serve all students (library, canteen, etc.)
- **Database**: `school_ids = NULL, course_ids = NULL, branch_ids = NULL`

### School HODs
- **Scope**: Filtered by specific schools, courses, and/or branches
- **Reason**: HODs only manage their specific academic programs
- **Database**: UUID arrays in `school_ids`, `course_ids`, `branch_ids`

#### BCA/MCA HOD (prachiagarwal211@gmail.com)
```sql
school_ids: [School of Computer Applications UUID]
course_ids: [BCA UUID, MCA UUID]
branch_ids: NULL (all branches under BCA/MCA)
```

#### CSE HOD (15anuragsingh2003@gmail.com)
```sql
school_ids: [School of Engineering & Technology UUID]
course_ids: [B.Tech UUID, M.Tech UUID]
branch_ids: [16 CSE-related branch UUIDs]
```

#### Business HOD (anurag.22bcom1367@jecrcu.edu.in)
```sql
school_ids: [Jaipur School of Business UUID]
course_ids: [MBA UUID, BBA UUID, B.Com UUID]
branch_ids: NULL (all branches under MBA/BBA/B.Com)
```

#### Multi-School HOD (razorrag.official@gmail.com)
```sql
school_ids: [6 school UUIDs]
course_ids: NULL (all courses in these schools)
branch_ids: NULL (all branches in these schools)
```

## 🔍 Troubleshooting

### Issue: Account creation fails
**Solution**: Check that auth user exists in Supabase Authentication dashboard

### Issue: HOD sees wrong students
**Solution**: Verify school_ids, course_ids, branch_ids in profiles table match expected UUIDs

### Issue: Email not received
**Solution**: 
1. Check department email in `departments` table
2. Verify RESEND_API_KEY in Vercel environment variables
3. Check Resend dashboard for delivery status

### Issue: Login fails
**Solution**: Reset password in Supabase Authentication dashboard

## 📝 Database Queries for Verification

### Check all staff accounts:
```sql
SELECT 
  email, 
  full_name, 
  department_name,
  COALESCE(array_length(school_ids, 1), 0) as school_count,
  COALESCE(array_length(course_ids, 1), 0) as course_count,
  COALESCE(array_length(branch_ids, 1), 0) as branch_count
FROM profiles
WHERE role = 'department'
ORDER BY department_name;
```

### Check department emails:
```sql
SELECT name, display_name, email, display_order
FROM departments
WHERE is_active = true
ORDER BY display_order;
```

### Test HOD filtering (example for BCA/MCA HOD):
```sql
-- Get the HOD's scoping
SELECT school_ids, course_ids, branch_ids
FROM profiles
WHERE email = 'prachiagarwal211@gmail.com';

-- See which students they should see
SELECT id, student_name, registration_no, school, course, branch
FROM no_dues_forms
WHERE school_id = ANY((SELECT school_ids FROM profiles WHERE email = 'prachiagarwal211@gmail.com'))
  AND course_id = ANY((SELECT course_ids FROM profiles WHERE email = 'prachiagarwal211@gmail.com'));
```

## ✅ Post-Migration Checklist

- [ ] All 13 staff accounts created successfully
- [ ] All staff can login with Test@1234 password
- [ ] Department emails updated in database
- [ ] HODs see only their assigned students
- [ ] Department staff see all students
- [ ] Email notifications sent to correct addresses
- [ ] Email redirect URLs point to production
- [ ] Approve/reject workflow works
- [ ] Certificate generation works
- [ ] Realtime dashboard updates work

## 🎯 Success Criteria

The migration is successful when:
1. ✅ All 13 staff accounts login successfully
2. ✅ Test form submission sends 10 emails to correct addresses
3. ✅ Each staff member sees appropriate students in dashboard
4. ✅ Approve/reject actions update database correctly
5. ✅ Admin can see all applications and statistics

## 📞 Support

If you encounter issues during migration:
1. Check the script output for error messages
2. Review the troubleshooting section above
3. Verify database state with provided SQL queries
4. Check Supabase logs for authentication errors
5. Review Vercel logs for API errors