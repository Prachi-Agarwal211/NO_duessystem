# 🎓 How to Add HOD Accounts with Proper Scoping

## 📋 Current Status (From Verification)

**You have 3 HODs configured:**
1. ✅ `prachiagarwal211@gmail.com` - BCA/MCA HOD (School of Computer Applications)
2. ✅ `razorrag.official@gmail.com` - TPO Staff (Jaipur School of Business)
3. ✅ `15anuragsingh2003@gmail.com` - B.Tech/M.Tech CSE HOD (School of Engineering & Technology)

**All 3 can login and see students in staff dashboard!** ✅

---

## 🚀 How to Add More HODs

### Method 1: Using the Script (Recommended)

#### Step 1: Open the HOD Accounts Script

Open file: [`scripts/create-all-hod-accounts.js`](scripts/create-all-hod-accounts.js:28)

#### Step 2: Add New HOD to the Array

Find the `HOD_ACCOUNTS` array (line 28) and add your new HOD. Here's the template:

```javascript
const HOD_ACCOUNTS = [
  // ... existing HODs ...
  
  // 👇 ADD YOUR NEW HOD HERE
  {
    email: 'hod.yourdepartment@jecrcu.edu.in',  // HOD email
    full_name: 'HOD Name - Department Name',    // Display name
    department_name: 'school_hod',              // Always 'school_hod' for HODs
    school_name: 'School of XYZ',               // Exact school name from database
    courses: ['Course1', 'Course2'],            // Courses they manage
    description: 'Brief description'            // Optional description
  }
];
```

#### Step 3: Real Examples to Add

**Example 1: Add ECE HOD**
```javascript
{
  email: 'hod.ece@jecrcu.edu.in',
  full_name: 'HOD - Electronics and Communication Engineering',
  department_name: 'school_hod',
  school_name: 'School of Engineering & Technology',
  courses: ['B.Tech', 'M.Tech'],
  description: 'ECE Department HOD'
}
```

**Example 2: Add MBA HOD**
```javascript
{
  email: 'hod.mba@jecrcu.edu.in',
  full_name: 'HOD - MBA',
  department_name: 'school_hod',
  school_name: 'Jaipur School of Business',
  courses: ['MBA'],
  description: 'MBA Department HOD'
}
```

**Example 3: Add Law HOD**
```javascript
{
  email: 'hod.law@jecrcu.edu.in',
  full_name: 'HOD - School of Law',
  department_name: 'school_hod',
  school_name: 'School of Law',
  courses: ['Integrated Law Programs (Hons.)', 'LL.M - 2 Years'],
  description: 'Law Department HOD'
}
```

#### Step 4: Run the Script

```cmd
node scripts/create-all-hod-accounts.js
```

The script will:
- ✅ Skip existing HODs (won't duplicate)
- ✅ Create auth users for new HODs
- ✅ Create profiles with proper scoping
- ✅ Auto-confirm emails (can login immediately)
- ✅ Map to correct schools, courses, and branches

#### Step 5: Verify

```cmd
node scripts/verify-hod-accounts-complete.js
```

---

## 🔍 Understanding Scoping (How HODs See Students)

### **What is Scoping?**

Scoping controls **which students** each HOD can see and approve in their dashboard.

### **Three-Level Filter System:**

```
School → Course → Branch
   ↓        ↓        ↓
  1-13    1-28    1-139+
schools  courses branches
```

### **How It Works:**

```javascript
// Example: CSE HOD Configuration
{
  school_ids: [engineering_school_uuid],     // Only sees Engineering students
  course_ids: [btech_uuid, mtech_uuid],      // Only B.Tech & M.Tech students
  branch_ids: null                            // Sees ALL CSE branches
}
```

**Result:** This HOD sees **ONLY** students from:
- School: Engineering & Technology
- Courses: B.Tech OR M.Tech
- Branches: ALL branches within those courses

### **Scoping Rules:**

| Value | Meaning | Example |
|-------|---------|---------|
| `NULL` | **Sees everything** at that level | `branch_ids: null` = sees all branches |
| `[uuid1, uuid2]` | **Sees only specified** items | `course_ids: [btech, mtech]` = only these 2 courses |
| `[]` | **Sees nothing** (effectively disabled) | Avoid this! |

---

## 📊 What HODs See in Staff Dashboard

### **Dashboard View for: `15anuragsingh2003@gmail.com`**

When this HOD logs in to `/staff/dashboard`, they see:

```
╔════════════════════════════════════════════════════╗
║  Staff Dashboard - Anurag Singh                    ║
║  Department: School (HOD/Department)               ║
╚════════════════════════════════════════════════════╝

📊 Statistics
   Pending: 15 students
   Approved: 8 students
   Rejected: 2 students

📋 Student List (Filtered by your scope)
┌────────────────┬──────────────────────┬─────────┬────────┐
│ Reg. No        │ Name                 │ Course  │ Status │
├────────────────┼──────────────────────┼─────────┼────────┤
│ 21BCON750      │ Shubhangi Tripathi   │ B.Tech  │ Pending│
│ 21BCON123      │ Student Name         │ B.Tech  │ Pending│
│ 21MCON456      │ Another Student      │ M.Tech  │ Pending│
└────────────────┴──────────────────────┴─────────┴────────┘
```

**Filters Applied Automatically:**
- ✅ School: Engineering & Technology ONLY
- ✅ Courses: B.Tech & M.Tech ONLY
- ✅ Branches: All 16 CSE-related branches

**HOD CANNOT see:**
- ❌ Students from other schools (Law, Business, etc.)
- ❌ Students from other courses (BCA, MBA, etc.)
- ❌ Students from other branches (ECE, Mechanical, etc.)

---

## 🔧 Advanced: Customizing Scoping

### **Scenario 1: HOD Should See Multiple Schools**

```javascript
// Example: Cross-school HOD
{
  email: 'hod.multischool@jecrcu.edu.in',
  full_name: 'Multi-School HOD',
  department_name: 'school_hod',
  school_name: 'School of Engineering & Technology',  // Primary school
  courses: ['B.Tech'],
  description: 'Manages multiple schools'
}
```

Then **manually update** in database:
```sql
UPDATE profiles
SET school_ids = ARRAY[
  (SELECT id FROM config_schools WHERE name = 'School of Engineering & Technology'),
  (SELECT id FROM config_schools WHERE name = 'School of Computer Applications')
]
WHERE email = 'hod.multischool@jecrcu.edu.in';
```

### **Scenario 2: HOD Should See Specific Branches Only**

```javascript
// Initial creation (sees all branches)
{
  email: 'hod.specific@jecrcu.edu.in',
  full_name: 'Specific Branch HOD',
  department_name: 'school_hod',
  school_name: 'School of Engineering & Technology',
  courses: ['B.Tech'],
  description: 'Only specific CSE branches'
}
```

Then **restrict to specific branches**:
```sql
UPDATE profiles
SET branch_ids = ARRAY[
  (SELECT id FROM config_branches WHERE name = 'Computer Science and Engineering' AND course_id IN (SELECT id FROM config_courses WHERE name = 'B.Tech')),
  (SELECT id FROM config_branches WHERE name = 'CSE - Artificial Intelligence and Data Science' AND course_id IN (SELECT id FROM config_courses WHERE name = 'B.Tech'))
]
WHERE email = 'hod.specific@jecrcu.edu.in';
```

### **Scenario 3: Department Staff (Not School-Specific)**

For departments like Library, TPO, Accounts that see ALL students:

```javascript
{
  email: 'library.staff@jecrcu.edu.in',
  full_name: 'Library Staff',
  department_name: 'library',              // Different department!
  school_name: 'School of Engineering & Technology',  // Can be any school
  courses: [],                             // Leave empty
  description: 'Library department staff'
}
```

Then **set to see all**:
```sql
UPDATE profiles
SET 
  school_ids = NULL,   -- NULL = sees all schools
  course_ids = NULL,   -- NULL = sees all courses
  branch_ids = NULL    -- NULL = sees all branches
WHERE email = 'library.staff@jecrcu.edu.in';
```

---

## 📝 Complete Example: Adding 5 New HODs

### **1. Edit the Script**

Open [`scripts/create-all-hod-accounts.js`](scripts/create-all-hod-accounts.js:28) and add:

```javascript
const HOD_ACCOUNTS = [
  // ... existing 3 HODs ...

  // NEW HODs - ADD THESE:
  {
    email: 'hod.ece@jecrcu.edu.in',
    full_name: 'HOD - Electronics and Communication Engineering',
    department_name: 'school_hod',
    school_name: 'School of Engineering & Technology',
    courses: ['B.Tech', 'M.Tech'],
    description: 'ECE Department HOD'
  },
  {
    email: 'hod.mechanical@jecrcu.edu.in',
    full_name: 'HOD - Mechanical Engineering',
    department_name: 'school_hod',
    school_name: 'School of Engineering & Technology',
    courses: ['B.Tech', 'M.Tech'],
    description: 'Mechanical Engineering Department HOD'
  },
  {
    email: 'hod.mba@jecrcu.edu.in',
    full_name: 'HOD - MBA',
    department_name: 'school_hod',
    school_name: 'Jaipur School of Business',
    courses: ['MBA'],
    description: 'MBA Department HOD'
  },
  {
    email: 'hod.law@jecrcu.edu.in',
    full_name: 'HOD - School of Law',
    department_name: 'school_hod',
    school_name: 'School of Law',
    courses: ['Integrated Law Programs (Hons.)', 'LL.M - 2 Years'],
    description: 'Law Department HOD'
  },
  {
    email: 'hod.ca@jecrcu.edu.in',
    full_name: 'HOD - Computer Applications',
    department_name: 'school_hod',
    school_name: 'School of Computer Applications',
    courses: ['BCA', 'MCA'],
    description: 'BCA/MCA Department HOD (Primary)'
  }
];
```

### **2. Run Creation Script**

```cmd
node scripts/create-all-hod-accounts.js
```

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════════╗
║   Creating ALL HOD Department Staff Accounts                 ║
╚═══════════════════════════════════════════════════════════════╝

📧 Processing: hod.ece@jecrcu.edu.in
   ✅ Auth user created
   ✅ Profile created with proper scoping
   ✅ Account fully configured

[... repeats for each new HOD ...]

✅ Successfully Created:
   ✓ hod.ece@jecrcu.edu.in
   ✓ hod.mechanical@jecrcu.edu.in
   ✓ hod.mba@jecrcu.edu.in
   ✓ hod.law@jecrcu.edu.in
   ✓ hod.ca@jecrcu.edu.in

⚠️  Already Exist (Skipped):
   ⊘ prachiagarwal211@gmail.com
   ⊘ razorrag.official@gmail.com
   ⊘ 15anuragsingh2003@gmail.com

📊 Statistics:
   Total HODs in list: 8
   Created: 5
   Skipped: 3
   Errors:  0
```

### **3. Verify All HODs**

```cmd
node scripts/verify-hod-accounts-complete.js
```

**Expected Output:**
```
Found 8 HOD profiles

Overall System Health: 100.0%
🎉 ALL SYSTEMS GO!
```

### **4. Test Login**

1. Go to: `https://no-duessystem.vercel.app/staff/login`
2. Login with any new HOD:
   - Email: `hod.ece@jecrcu.edu.in`
   - Password: `Test@1234`
3. Should redirect to staff dashboard
4. Should see ONLY students from their scope (ECE students in B.Tech/M.Tech)

---

## 🎯 Quick Reference: All Available Schools

```javascript
// Use EXACT names from database:
'School of Engineering & Technology'
'School of Computer Applications'
'Jaipur School of Business'
'School of Sciences'
'School of Humanities & Social Sciences'
'School of Law'
'Jaipur School of Mass Communication'
'Jaipur School of Design'
'Jaipur School of Economics'
'School of Allied Health Sciences'
'School of Hospitality'
'Directorate of Executive Education'
'Ph.D. (Doctoral Programme)'
```

## 🎯 Quick Reference: Sample Courses

```javascript
// Engineering
['B.Tech', 'M.Tech']

// Computer Applications
['BCA', 'MCA']

// Business
['BBA', 'B.Com', 'MBA']

// Law
['Integrated Law Programs (Hons.)', 'LL.M - 2 Years']

// Sciences
['B.Sc (Hons.) - 4 Years', 'M.Sc']

// Humanities
['B.A. (Hons.) - 4 Years', 'B.A. Liberal Studies', 'M.A.']

// Design
['Bachelor of Visual Arts (BVA)', 'B.Des - 4 Years', 'M.Des']

// Others
['B.A. Journalism & Mass Communication', 'B.Sc. Hospitality and Hotel Management (HHM)']
```

---

## ✅ Verification Checklist

After adding new HODs, verify:

- [ ] Auth user created in Supabase Dashboard → Authentication → Users
- [ ] Email confirmed (green checkmark)
- [ ] Profile exists in Table Editor → profiles
- [ ] `department_name = 'school_hod'`
- [ ] `school_ids` array contains correct school UUID
- [ ] `course_ids` array contains correct course UUIDs
- [ ] `branch_ids = null` (to see all branches)
- [ ] `is_active = true`
- [ ] Can login at `/staff/login`
- [ ] Dashboard shows filtered student list
- [ ] Can approve/reject students

---

## 🔒 Security Notes

**Default Password:** `Test@1234`

**⚠️ IMPORTANT:**
1. This is a **development password**
2. In production, HODs should:
   - Change password on first login
   - Use strong passwords (8+ chars, mixed case, numbers, symbols)
   - Enable 2FA if available

---

## 🆘 Troubleshooting

### Issue: HOD Added But Can't Login

**Check:**
```cmd
node scripts/verify-hod-accounts-complete.js
```

Look for issues in Part 2 (analyzing HODs).

### Issue: HOD Logs In But Sees No Students

**Possible causes:**
1. No students in their scope (check if students exist)
2. Wrong scoping (school_ids, course_ids mismatch)

**Fix:**
```sql
-- Check what students exist
SELECT registration_no, student_name, school, course, branch
FROM no_dues_forms
WHERE school = 'School of Engineering & Technology';

-- Update HOD scoping if needed
UPDATE profiles
SET 
  school_ids = ARRAY[(SELECT id FROM config_schools WHERE name = 'School of Engineering & Technology')],
  course_ids = ARRAY[
    (SELECT id FROM config_courses WHERE name = 'B.Tech' AND school_id = (SELECT id FROM config_schools WHERE name = 'School of Engineering & Technology'))
  ],
  branch_ids = NULL
WHERE email = 'hod.yourname@jecrcu.edu.in';
```

### Issue: HOD Sees Students from Other Departments

**Cause:** Scoping too broad (NULL values)

**Fix:** Add specific filters as shown in "Scenario 2" above.

---

**Need help?** Run verification script and it will show detailed issues with SQL fixes!

```cmd
node scripts/verify-hod-accounts-complete.js