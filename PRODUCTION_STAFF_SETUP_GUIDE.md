# Production Staff Account Setup Guide

## Overview

This guide explains how to set up all 14 staff accounts for the JECRC No Dues System with proper department and scope assignments.

## Staff Accounts Configuration

### 1. Admin Account (1)
- **Email**: admin@jecrcu.edu.in
- **Password**: Admin@2025
- **Role**: admin
- **Access**: Full system access to everything

### 2. Department Staff (9 accounts)
These staff members can see **ALL students** regardless of school/course/branch:

| Email | Department | Full Name |
|-------|------------|-----------|
| surbhi.jetavat@jecrcu.edu.in | Accounts | Surbhi Jetavat |
| vishaltiwari642@gmail.com | Library | Vishal Tiwari |
| seniormanager.it@jecrcu.edu.in | IT Department | IT Senior Manager |
| sailendra.trivedi@jecrcu.edu.in | Mess | Sailendra Trivedi |
| akshar.bhardwaj@jecrcu.edu.in | Hostel | Akshar Bhardwaj |
| anurag.sharma@jecrcu.edu.in | Alumni | Anurag Sharma |
| ganesh.jat@jecrcu.edu.in | Registrar | Ganesh Jat |
| umesh.sharma@jecrcu.edu.in | Canteen | Umesh Sharma |
| arjit.jain@jecrcu.edu.in | TPO | Arjit Jain |

**Password for all**: `Test@1234`

### 3. School HODs (4 accounts)
These staff members have **SCOPED ACCESS** to specific schools/courses/branches:

#### 3.1 BCA/MCA HOD
- **Email**: prachiagarwal211@gmail.com
- **Password**: Test@1234
- **Scope**: School of Computer Applications
  - BCA (all branches)
  - MCA (all branches)
  - **Total**: 22 branches

#### 3.2 CSE HOD
- **Email**: 15anuragsingh2003@gmail.com
- **Password**: Test@1234
- **Scope**: School of Engineering & Technology (CSE ONLY)
  - **B.Tech Branches** (15):
    1. Computer Science and Engineering
    2. CSE - Artificial Intelligence and Data Science
    3. CSE - Generative AI (L&T EduTech)
    4. CSE - Software Product Engineering with Kalvium
    5. CSE - Artificial Intelligence and Machine Learning (Xebia)
    6. CSE - Full Stack Web Design and Development (Xebia)
    7. CSE - Artificial Intelligence and Machine Learning (Samatrix.io)
    8. CSE - Data Science and Data Analytics (Samatrix.io)
    9. CSE - Cyber Security (EC-Council, USA)
    10. Computer Science and Business Systems (CSBS) - TCS
    11. CSE - Artificial Intelligence and Machine Learning (IBM)
    12. CSE - Cloud Computing (Microsoft)
    13. CSE - Cloud Computing (AWS Verified Program)
    14. CSE - Blockchain (upGrad Campus)
    15. B.Tech Lateral Entry / Migration
  - **M.Tech Branches** (1):
    1. Computer Science and Engineering
  - **Total**: 16 branches (15 B.Tech + 1 M.Tech)

#### 3.3 Business School HOD
- **Email**: anurag.22bcom1367@jecrcu.edu.in
- **Password**: Test@1234
- **Scope**: Jaipur School of Business
  - MBA (all branches)
  - BBA (all branches)
  - B.Com (all branches)

#### 3.4 Multi-School HOD
- **Email**: razorrag.official@gmail.com
- **Password**: Test@1234
- **Scope**: Multiple Schools (all courses and branches in each)
  1. Jaipur School of Mass Communication (JMC)
  2. School of Hospitality (Hotel)
  3. Jaipur School of Design
  4. School of Law
  5. School of Sciences
  6. School of Humanities & Social Sciences

## Setup Instructions

### Step 1: Run the Setup Script

```bash
# Navigate to project root
cd /path/to/jecrc-no-dues-system

# Run the production staff setup script
node scripts/setup-production-staff-accounts.js
```

### Step 2: Verify Environment Variables

Ensure your `.env.local` file has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 3: Review Output

The script will:
1. ✅ Create new accounts that don't exist
2. ⚠️  Skip accounts that already exist
3. ❌ Report any errors

Expected output:
```
╔═══════════════════════════════════════════════════════════╗
║  JECRC NO DUES - PRODUCTION STAFF ACCOUNT SETUP           ║
╚═══════════════════════════════════════════════════════════╝

📋 Total accounts to process: 14
   - 1 Admin
   - 9 Department Staff (non-HOD)
   - 4 School HODs

📧 Processing: admin@jecrcu.edu.in
   Name: System Administrator
   Role: admin
   Department: N/A (Admin)
   Scope: ALL
   ✅ Auth user created: 12345678...
   ✅ Admin - Full access to all students
   ✅ Profile created successfully

[... continues for all 14 accounts ...]

╔═══════════════════════════════════════════════════════════╗
║              ACCOUNT CREATION SUMMARY                      ║
╚═══════════════════════════════════════════════════════════╝

✅ Successfully Created:
──────────────────────────────────────────────────────────────────
   ✓ admin@jecrcu.edu.in
   ✓ surbhi.jetavat@jecrcu.edu.in
   ✓ vishaltiwari642@gmail.com
   [... all created accounts ...]
──────────────────────────────────────────────────────────────────

📊 Statistics:
   Created: 14
   Skipped: 0
   Errors:  0
   Total:   14
```

## Access and Scope Explanation

### Department Staff vs School HODs

| Type | Access | Examples |
|------|--------|----------|
| **Admin** | All students, all departments | admin@jecrcu.edu.in |
| **Department Staff** | All students (no filtering) | Library, IT, Mess, Hostel, etc. |
| **School HODs** | Only students in their school/course/branch | BCA/MCA HOD, CSE HOD, etc. |

### How Scoping Works

#### For Department Staff (Non-HOD):
```javascript
{
  school_ids: null,     // null = sees ALL schools
  course_ids: null,     // null = sees ALL courses
  branch_ids: null      // null = sees ALL branches
}
```
**Result**: They see **every student** who submits a form, regardless of school/course/branch.

#### For School HODs:
```javascript
// Example: BCA/MCA HOD
{
  school_ids: ['uuid-of-school-of-computer-applications'],
  course_ids: ['uuid-of-bca', 'uuid-of-mca'],
  branch_ids: ['uuid-of-branch1', 'uuid-of-branch2', ...] // All 22 branches
}
```
**Result**: They **only see** students enrolled in BCA or MCA programs.

#### For Multi-School HOD:
```javascript
// Example: razorrag (6 schools)
{
  school_ids: ['uuid-jmc', 'uuid-hotel', 'uuid-design', 'uuid-law', 'uuid-sciences', 'uuid-humanities'],
  course_ids: [all courses in these 6 schools],
  branch_ids: [all branches in these courses]
}
```
**Result**: They see students from any of the 6 assigned schools.

## Login URLs

- **Admin**: https://no-duessystem.vercel.app/admin/login
- **Staff/HODs**: https://no-duessystem.vercel.app/staff/login

## Post-Setup Verification

### 1. Test Admin Login
```bash
Email: admin@jecrcu.edu.in
Password: Admin@2025
```
✅ Should see: Admin dashboard with full access to all forms

### 2. Test Department Staff Login
```bash
Email: surbhi.jetavat@jecrcu.edu.in
Password: Test@1234
```
✅ Should see: All pending forms from all schools/courses

### 3. Test School HOD Login
```bash
Email: prachiagarwal211@gmail.com
Password: Test@1234
```
✅ Should see: Only BCA/MCA students' forms
❌ Should NOT see: Students from other schools/courses

## Database Verification Queries

### Check All Staff Accounts
```sql
SELECT 
  email,
  full_name,
  role,
  department_name,
  CASE 
    WHEN school_ids IS NULL THEN 'ALL'
    ELSE array_length(school_ids, 1)::text || ' schools'
  END as scope,
  is_active
FROM profiles
WHERE role IN ('admin', 'department')
ORDER BY role, department_name;
```

### Verify HOD Scoping
```sql
SELECT 
  p.email,
  p.full_name,
  p.department_name,
  array_length(p.school_ids, 1) as num_schools,
  array_length(p.course_ids, 1) as num_courses,
  array_length(p.branch_ids, 1) as num_branches
FROM profiles p
WHERE p.department_name = 'school_hod'
ORDER BY p.email;
```

Expected results:
| Email | Schools | Courses | Branches |
|-------|---------|---------|----------|
| prachiagarwal211@gmail.com | 1 | 2 | 22 |
| 15anuragsingh2003@gmail.com | 1 | 2 | 16 |
| anurag.22bcom1367@jecrcu.edu.in | 1 | 3 | ~15 |
| razorrag.official@gmail.com | 6 | ~20 | ~40 |

## Troubleshooting

### Problem: "Account already exists"
**Solution**: This is normal if you've run the script before. The script will skip existing accounts.

### Problem: "Error fetching school/course/branch"
**Solution**: 
1. Verify school/course/branch names in the script match database exactly
2. Run this query to check:
```sql
SELECT name FROM config_schools ORDER BY name;
SELECT name FROM config_courses ORDER BY name;
SELECT name FROM config_branches ORDER BY name;
```

### Problem: "Profile creation failed"
**Solution**: 
1. Check database constraints
2. Verify RLS policies allow service role to insert
3. Check logs in Supabase dashboard

### Problem: HOD sees wrong students
**Solution**:
1. Verify their `school_ids`, `course_ids`, `branch_ids` in profiles table
2. Check the filtering logic in `/api/staff/dashboard`
3. Re-run the script to update their scoping

## Security Notes

1. ⚠️ **Change default passwords** after first login
2. 🔐 Store `SUPABASE_SERVICE_ROLE_KEY` securely (never commit to git)
3. 🔒 Verify RLS policies prevent unauthorized access
4. 📝 Audit staff actions regularly

## Next Steps After Setup

1. ✅ Test login for each account type
2. ✅ Submit a test form and verify notifications reach correct staff
3. ✅ Verify HOD filtering works correctly
4. ✅ Check email delivery to staff members
5. ✅ Deploy to production

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard → Logs
2. Check application logs: Vercel → Deployments → Logs
3. Verify environment variables in Vercel
4. Re-run the setup script

---

**Created**: December 12, 2024
**Last Updated**: December 12, 2024
**Version**: 1.0