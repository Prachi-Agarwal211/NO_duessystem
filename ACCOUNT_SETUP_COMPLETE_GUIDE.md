# Complete Account Setup Guide
## JECRC No Dues System - Department, HOD & Staff Accounts

> **Last Updated:** December 19, 2024  
> **Status:** Ready for Production Deployment

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [What Has Been Done](#what-has-been-done)
3. [Account Summary](#account-summary)
4. [Step-by-Step Setup Instructions](#step-by-step-setup-instructions)
5. [Verification & Testing](#verification--testing)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This guide provides complete instructions for setting up all department staff and HOD (Head of Department) accounts in the JECRC No Dues System. All accounts have been pre-configured with proper scoping, departments, and authentication.

### System Architecture
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with email/password
- **Role System:** 
  - `admin` - Full system access
  - `department` - Filtered access based on scope
- **Password:** All accounts use `Test@1234` (must be changed on first login)

---

## ✅ What Has Been Done

### 1. **Scripts Created** ✓
- ✅ `scripts/create-updated-department-staff.js` - Creates 6 department staff accounts
- ✅ `scripts/create-all-hod-accounts.js` - Creates 31 HOD accounts with school scoping
- ✅ `scripts/send-staff-welcome-emails.js` - Sends welcome emails to all staff

### 2. **UI Components Fixed** ✓
- ✅ Created `src/components/admin/MultiSelectCheckbox.js` - User-friendly checkbox multi-select
- ✅ Updated `src/app/admin/settings/page.js` - Integrated new multi-select component
- ✅ Fixed OTP verification page auto-submit issue

### 3. **Account Types Configured** ✓
All accounts are ready to be created with proper configuration:

#### Department Staff (6 accounts) - See ALL Students
```javascript
1. IT Department (it@jecrc.ac.in)
2. Hostel (hostel@jecrc.ac.in)
3. Library (library@jecrc.ac.in)
4. Registrar (registrar@jecrc.ac.in)
5. Alumni (alumni@jecrc.ac.in)
6. Accounts (accounts@jecrc.ac.in)
```

#### HOD Accounts (31 accounts) - Scoped by School/Course
```javascript
School of Engineering & Technology (15 HODs)
School of Business & Management (4 HODs)
School of Law & Governance (2 HODs)
School of Sciences (4 HODs)
School of Humanities & Social Sciences (3 HODs)
School of Computer Applications (2 HODs)
School of Commerce (1 HOD)
```

---

## 📊 Account Summary

| Account Type | Count | Scope | Access Level |
|--------------|-------|-------|--------------|
| Department Staff | 6 | NULL (All Students) | Full visibility |
| HOD Accounts | 31 | School-specific | Filtered by school/course/branch |
| **TOTAL** | **37** | - | - |

### Common Password
- **Default Password:** `Test@1234`
- **Password Policy:** Minimum 6 characters
- **Security:** Must be changed on first login

---

## 🚀 Step-by-Step Setup Instructions

### Prerequisites
✅ Supabase project configured  
✅ `.env.local` file with correct credentials  
✅ Node.js and npm installed  
✅ Database tables created (auth.users, profiles)

---

### Step 1: Create All Accounts

#### Option A: Create All Accounts at Once (Recommended)

```bash
# Navigate to project directory
cd "d:/nextjs projects/no_dues_app_new/jecrc-no-dues-system"

# Install dependencies if not already installed
npm install

# Run department staff creation script
node scripts/create-updated-department-staff.js

# Run HOD accounts creation script
node scripts/create-all-hod-accounts.js
```

**Expected Output:**
```
✅ Department Staff: 6/6 accounts created successfully
✅ HOD Accounts: 31/31 accounts created successfully
✅ Total: 37/37 accounts created
```

#### Option B: Create Accounts Manually via Admin Panel

1. **Login to Admin Panel:**
   ```
   URL: http://localhost:3000/admin
   Email: admin@jecrc.ac.in
   Password: [your admin password]
   ```

2. **Navigate to Settings:**
   - Click on "Settings" tab
   - Click on "Staff Accounts" sub-tab

3. **Create Each Account:**
   - Fill in: Email, Password, Full Name, Department
   - **For Department Staff:** Leave scope fields EMPTY (grants full access)
   - **For HOD Accounts:** 
     - Select specific schools from checkbox dropdown
     - Select specific courses from checkbox dropdown
     - Select specific branches from checkbox dropdown
   - Click "Create Staff Account with Scope"

4. **Repeat for All 37 Accounts** (see account list below)

---

### Step 2: Verify Account Creation

#### Check via Database
```sql
-- Count total staff accounts
SELECT COUNT(*) FROM profiles WHERE role = 'department';

-- List all department staff
SELECT email, full_name, department_name, school_ids, course_ids, branch_ids 
FROM profiles 
WHERE role = 'department' 
ORDER BY department_name;

-- Verify scoping
SELECT 
  full_name,
  department_name,
  CASE 
    WHEN school_ids IS NULL THEN 'Full Access'
    ELSE CONCAT(array_length(school_ids, 1), ' Schools')
  END as scope
FROM profiles 
WHERE role = 'department';
```

#### Check via Admin Panel
1. Go to `/admin/settings`
2. Click "Staff Accounts" tab
3. Verify: Should show 37 staff members
4. Check: Each account shows correct scope badges (🏫 Schools, 📚 Courses, 🎓 Branches)

---

### Step 3: Send Welcome Emails (Optional but Recommended)

```bash
# Send personalized welcome emails to all 37 staff
node scripts/send-staff-welcome-emails.js
```

**Email Includes:**
- ✅ Login credentials (email + temporary password)
- ✅ Step-by-step password change instructions
- ✅ Security tips
- ✅ Role responsibilities
- ✅ Support contact information

**Note:** Requires SMTP configuration in `.env.local`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

### Step 4: Test Each Account Type

#### Test 1: Department Staff (Full Access)
```
1. Login: library@jecrc.ac.in / Test@1234
2. Navigate to: /staff/dashboard
3. Verify: Can see ALL students from all schools/courses/branches
4. Test search: Should return students from any branch
```

#### Test 2: HOD Account (Scoped Access)
```
1. Login: hod.cse@jecrc.ac.in / Test@1234
2. Navigate to: /staff/dashboard
3. Verify: Can ONLY see Computer Science Engineering students
4. Test search: Should only return CSE students
```

#### Test 3: Password Change Flow
```
1. Login with any account
2. Click "Change Password" (should be prompted)
3. Enter: Old Password (Test@1234)
4. Enter: New Password (minimum 6 chars)
5. Verify: Can login with new password
```

#### Test 4: No Dues Action
```
1. Login as staff/HOD
2. Search for a student
3. Click "View Details"
4. Clear dues or add remarks
5. Submit action
6. Verify: Student status updated correctly
```

---

## 📝 Complete Account List

### Department Staff Accounts (No Scope Restrictions)

| # | Email | Full Name | Department | Scope |
|---|-------|-----------|------------|-------|
| 1 | it@jecrc.ac.in | IT Department | IT | ALL |
| 2 | hostel@jecrc.ac.in | Hostel Department | Hostel | ALL |
| 3 | library@jecrc.ac.in | Library Department | Library | ALL |
| 4 | registrar@jecrc.ac.in | Registrar Office | Registrar | ALL |
| 5 | alumni@jecrc.ac.in | Alumni Relations | Alumni | ALL |
| 6 | accounts@jecrc.ac.in | Accounts Department | Accounts | ALL |

### HOD Accounts - School of Engineering & Technology

| # | Email | Full Name | Course | Scope |
|---|-------|-----------|--------|-------|
| 1 | hod.cse@jecrc.ac.in | HOD Computer Science | B.Tech CSE | School: Engineering |
| 2 | hod.csbs@jecrc.ac.in | HOD CS (Business Systems) | B.Tech CSBS | School: Engineering |
| 3 | hod.aiml@jecrc.ac.in | HOD AI & ML | B.Tech AI&ML | School: Engineering |
| 4 | hod.aids@jecrc.ac.in | HOD AI & Data Science | B.Tech AI&DS | School: Engineering |
| 5 | hod.ece@jecrc.ac.in | HOD Electronics | B.Tech ECE | School: Engineering |
| 6 | hod.eee@jecrc.ac.in | HOD Electrical | B.Tech EEE | School: Engineering |
| 7 | hod.me@jecrc.ac.in | HOD Mechanical | B.Tech ME | School: Engineering |
| 8 | hod.ce@jecrc.ac.in | HOD Civil | B.Tech CE | School: Engineering |
| 9 | hod.che@jecrc.ac.in | HOD Chemical | B.Tech CHE | School: Engineering |
| 10 | hod.ae@jecrc.ac.in | HOD Automobile | B.Tech AE | School: Engineering |
| 11 | hod.biotech@jecrc.ac.in | HOD Biotechnology | B.Tech Biotech | School: Engineering |
| 12 | hod.mtech.cse@jecrc.ac.in | HOD M.Tech CSE | M.Tech CSE | School: Engineering |
| 13 | hod.mtech.vlsi@jecrc.ac.in | HOD M.Tech VLSI | M.Tech VLSI | School: Engineering |
| 14 | hod.mtech.thermal@jecrc.ac.in | HOD M.Tech Thermal | M.Tech Thermal | School: Engineering |
| 15 | hod.mtech.structure@jecrc.ac.in | HOD M.Tech Structures | M.Tech Structures | School: Engineering |

### HOD Accounts - School of Business & Management

| # | Email | Full Name | Course | Scope |
|---|-------|-----------|--------|-------|
| 16 | hod.mba@jecrc.ac.in | HOD MBA | MBA | School: Business |
| 17 | hod.bba@jecrc.ac.in | HOD BBA | BBA | School: Business |
| 18 | hod.bba.fintech@jecrc.ac.in | HOD BBA FinTech | BBA FinTech | School: Business |
| 19 | hod.mba.fintech@jecrc.ac.in | HOD MBA FinTech | MBA FinTech | School: Business |

### HOD Accounts - School of Law & Governance

| # | Email | Full Name | Course | Scope |
|---|-------|-----------|--------|-------|
| 20 | hod.ballb@jecrc.ac.in | HOD BA LLB | BA LLB | School: Law |
| 21 | hod.bballb@jecrc.ac.in | HOD BBA LLB | BBA LLB | School: Law |

### HOD Accounts - School of Sciences

| # | Email | Full Name | Course | Scope |
|---|-------|-----------|--------|-------|
| 22 | hod.bsc.physics@jecrc.ac.in | HOD BSc Physics | B.Sc Physics | School: Sciences |
| 23 | hod.bsc.chemistry@jecrc.ac.in | HOD BSc Chemistry | B.Sc Chemistry | School: Sciences |
| 24 | hod.bsc.maths@jecrc.ac.in | HOD BSc Mathematics | B.Sc Mathematics | School: Sciences |
| 25 | hod.bsc.biotech@jecrc.ac.in | HOD BSc Biotech | B.Sc Biotech | School: Sciences |

### HOD Accounts - School of Humanities

| # | Email | Full Name | Course | Scope |
|---|-------|-----------|--------|-------|
| 26 | hod.ba.english@jecrc.ac.in | HOD BA English | BA English | School: Humanities |
| 27 | hod.ba.sociology@jecrc.ac.in | HOD BA Sociology | BA Sociology | School: Humanities |
| 28 | hod.ma.english@jecrc.ac.in | HOD MA English | MA English | School: Humanities |

### HOD Accounts - School of Computer Applications

| # | Email | Full Name | Course | Scope |
|---|-------|-----------|--------|-------|
| 29 | hod.mca@jecrc.ac.in | HOD MCA | MCA | School: Comp Apps |
| 30 | hod.bca@jecrc.ac.in | HOD BCA | BCA | School: Comp Apps |

### HOD Accounts - School of Commerce

| # | Email | Full Name | Course | Scope |
|---|-------|-----------|--------|-------|
| 31 | hod.bcom@jecrc.ac.in | HOD B.Com | B.Com | School: Commerce |

---

## 🔍 Verification & Testing

### Automated Verification Script

Create `scripts/verify-all-accounts.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAccounts() {
  try {
    // Get all department staff
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'department')
      .order('department_name');

    if (error) throw error;

    console.log('\n📊 ACCOUNT VERIFICATION REPORT');
    console.log('='.repeat(60));
    console.log(`Total Accounts: ${profiles.length}/37`);
    console.log('');

    // Group by department
    const deptStaff = profiles.filter(p => 
      !p.school_ids && !p.course_ids && !p.branch_ids
    );
    const hodStaff = profiles.filter(p => 
      p.school_ids || p.course_ids || p.branch_ids
    );

    console.log(`✅ Department Staff: ${deptStaff.length}/6 (Full Access)`);
    console.log(`✅ HOD Accounts: ${hodStaff.length}/31 (Scoped)`);
    console.log('');

    // List each account
    console.log('DEPARTMENT STAFF (No Restrictions):');
    console.log('-'.repeat(60));
    deptStaff.forEach(p => {
      console.log(`  ${p.email.padEnd(30)} - ${p.full_name}`);
    });

    console.log('');
    console.log('HOD ACCOUNTS (With Scope):');
    console.log('-'.repeat(60));
    hodStaff.forEach(p => {
      const scope = [];
      if (p.school_ids) scope.push(`${p.school_ids.length} schools`);
      if (p.course_ids) scope.push(`${p.course_ids.length} courses`);
      if (p.branch_ids) scope.push(`${p.branch_ids.length} branches`);
      console.log(`  ${p.email.padEnd(30)} - ${scope.join(', ')}`);
    });

    console.log('');
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyAccounts();
```

Run: `node scripts/verify-all-accounts.js`

---

## 🔧 Troubleshooting

### Issue 1: Script Fails with "User already exists"
**Solution:** Some accounts already created. Check database first:
```sql
SELECT email FROM profiles WHERE role = 'department';
```

### Issue 2: Cannot Login with Created Account
**Checklist:**
- ✅ Check email is correct
- ✅ Verify password is `Test@1234`
- ✅ Check account exists in `auth.users` table
- ✅ Verify profile exists in `profiles` table
- ✅ Check `email_confirmed_at` is set in auth.users

**Fix:**
```sql
-- Force confirm email
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'problem-email@jecrc.ac.in';
```

### Issue 3: Staff Cannot See Any Students
**Checklist:**
- ✅ Check `role = 'department'` in profiles table
- ✅ Verify scope fields (school_ids, course_ids, branch_ids)
- ✅ Check if students exist in database
- ✅ Verify API endpoint filtering logic

**Debug:**
```sql
-- Check staff scope
SELECT email, department_name, school_ids, course_ids, branch_ids 
FROM profiles 
WHERE email = 'problem-email@jecrc.ac.in';

-- Check students in scope
SELECT COUNT(*) FROM students 
WHERE school_id = ANY(ARRAY[1,2,3]); -- Replace with staff's school_ids
```

### Issue 4: Multi-Select Dropdown Not Working
**Solution:** Component already fixed! Make sure:
- ✅ Using `MultiSelectCheckbox` component
- ✅ Not using native `<select multiple>`
- ✅ Latest code deployed: `src/components/admin/MultiSelectCheckbox.js`

### Issue 5: Welcome Emails Not Sending
**Checklist:**
- ✅ SMTP credentials configured in `.env.local`
- ✅ Gmail: Use App Password (not regular password)
- ✅ Check SMTP host/port correct
- ✅ Verify email script has correct credentials

**Test SMTP:**
```bash
node scripts/test-email-smtp.js
```

---

## 📧 Email Configuration

### Gmail SMTP Setup
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-digit-app-password
SMTP_FROM=JECRC No Dues System <your-email@gmail.com>
```

### Get Gmail App Password
1. Go to: https://myaccount.google.com/security
2. Enable 2-Factor Authentication
3. Search for "App passwords"
4. Create new app password for "Mail"
5. Copy 16-digit password
6. Use in `SMTP_PASS`

---

## 🎓 Best Practices

### Security
1. ✅ **Change Default Passwords** - Force password change on first login
2. ✅ **Use Strong Passwords** - Minimum 8 characters with mixed case, numbers, symbols
3. ✅ **Enable Email Verification** - Ensure `email_confirmed_at` is set
4. ✅ **Regular Audits** - Review staff accounts quarterly
5. ✅ **Least Privilege** - Only grant necessary scope access

### Maintenance
1. ✅ **Document Changes** - Keep this guide updated
2. ✅ **Backup Regularly** - Export staff list before bulk operations
3. ✅ **Test in Development** - Always test account creation locally first
4. ✅ **Monitor Login Activity** - Track failed login attempts
5. ✅ **Deactivate Unused Accounts** - Remove accounts for departed staff

### Scoping Guidelines
- **Department Staff:** NULL scope (can see all students)
- **HOD Accounts:** Scoped to specific school/course/branch
- **When in doubt:** Start with more restrictive scope, expand if needed

---

## ✅ Final Checklist

Before going to production:

- [ ] All 37 accounts created successfully
- [ ] Each account verified via database query
- [ ] Tested login for at least 3 different account types
- [ ] Password change flow tested
- [ ] Department staff can see ALL students
- [ ] HOD accounts see ONLY their scope
- [ ] Multi-select dropdowns working in admin panel
- [ ] Welcome emails sent (optional)
- [ ] Documentation reviewed and updated
- [ ] Backup of current database created
- [ ] Admin panel accessible and functional

---

## 🆘 Support

### For Technical Issues
- **Documentation:** This file + MIGRATION_GUIDE.md
- **Code Reference:** Check scripts in `/scripts` folder
- **Database Schema:** See migration files in root directory

### For Questions
1. Check this guide first
2. Review related scripts
3. Check database directly via Supabase dashboard
4. Review API endpoint code in `/src/app/api/admin/staff/route.js`

---

**Document Version:** 1.0  
**Created:** December 19, 2024  
**Author:** System Administrator  
**Status:** ✅ Production Ready