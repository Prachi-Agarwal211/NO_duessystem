# Staff Dashboard Empty List - Troubleshooting Guide

**Issue:** Staff account created in Supabase doesn't show any forms in the dashboard

---

## Root Causes & Solutions

### Cause 1: Missing or Incorrect `department_name` in Profile ❌ MOST COMMON

**Problem:** Staff profile doesn't have the correct `department_name` field set.

**Check in Supabase:**
```sql
-- Run in Supabase SQL Editor
SELECT id, email, role, department_name, full_name 
FROM profiles 
WHERE role = 'department';
```

**Expected Result:**
```
| id | email | role | department_name | full_name |
|----|-------|------|----------------|-----------|
| ... | library@jecrc.ac.in | department | library | Library Staff |
```

**Fix:**
```sql
-- Update the department_name for a staff account
UPDATE profiles 
SET department_name = 'library'  -- Use exact department name from departments table
WHERE email = 'library@jecrc.ac.in';
```

**Valid Department Names:**
Check your `departments` table for exact names:
```sql
SELECT name, display_name, is_active FROM departments WHERE is_active = true;
```

Common department names:
- `library`
- `accounts`
- `hostel`
- `transport`
- `sports`
- `tpo`
- etc.

---

### Cause 2: No Forms Submitted Yet ✅ NORMAL

**Problem:** Database has zero forms, so there's nothing to display.

**Check:**
```sql
SELECT COUNT(*) as total_forms FROM no_dues_forms;
```

**If count is 0:**
- This is normal for a new system
- Submit a test form at `/student/submit-form`
- Staff dashboard will update automatically once form is submitted

---

### Cause 3: No `no_dues_status` Records Created ❌ DATA INTEGRITY ISSUE

**Problem:** Forms exist but `no_dues_status` records weren't created.

**Check:**
```sql
-- Check if forms have corresponding status records
SELECT 
  f.id as form_id,
  f.registration_no,
  f.student_name,
  COUNT(s.id) as status_count
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON f.id = s.form_id
GROUP BY f.id, f.registration_no, f.student_name
HAVING COUNT(s.id) = 0;
```

**If any forms have status_count = 0:**
Run the backfill script:
```sql
-- This script is in: scripts/backfill-missing-status-records.sql
-- It creates status records for all existing forms
```

---

### Cause 4: Department Name Mismatch ❌ CONFIGURATION ERROR

**Problem:** Profile `department_name` doesn't match any department in `no_dues_status`.

**Diagnostic Query:**
```sql
-- Check what departments exist in status records
SELECT DISTINCT department_name 
FROM no_dues_status 
ORDER BY department_name;

-- Check staff profile department
SELECT id, email, department_name, role 
FROM profiles 
WHERE email = 'YOUR_STAFF_EMAIL@jecrc.ac.in';
```

**Fix:**
Ensure the `department_name` in profile exactly matches one from the list.

---

### Cause 5: Scope Filtering Too Restrictive ⚠️ ADVANCED

**Problem:** Staff has `school_ids`, `course_ids`, or `branch_ids` configured that exclude all forms.

**Check:**
```sql
SELECT 
  id,
  email,
  department_name,
  school_ids,
  course_ids,
  branch_ids
FROM profiles
WHERE email = 'YOUR_STAFF_EMAIL@jecrc.ac.in';
```

**If fields are NOT NULL:**
These fields filter which forms the staff can see. They should be:
- `NULL` (see all forms) OR
- Array of valid UUIDs matching forms in the system

**Fix:**
```sql
-- Remove scope restrictions (staff sees ALL forms for their department)
UPDATE profiles 
SET 
  school_ids = NULL,
  course_ids = NULL,
  branch_ids = NULL
WHERE email = 'YOUR_STAFF_EMAIL@jecrc.ac.in';
```

---

## Complete Diagnostic Checklist

Run these queries in order:

### Step 1: Verify Staff Profile
```sql
SELECT 
  id,
  email,
  role,
  department_name,
  full_name,
  school_ids,
  course_ids,
  branch_ids,
  created_at
FROM profiles
WHERE email = 'YOUR_STAFF_EMAIL@jecrc.ac.in';
```

**Expected:**
- `role` = 'department'
- `department_name` = valid department (e.g., 'library')
- `school_ids`, `course_ids`, `branch_ids` = NULL (unless intentionally restricted)

---

### Step 2: Verify Department Exists
```sql
SELECT name, display_name, is_active, email
FROM departments
WHERE name = 'YOUR_DEPARTMENT_NAME'  -- From Step 1
AND is_active = true;
```

**Expected:** 1 row returned with matching department

---

### Step 3: Check Forms Exist
```sql
SELECT COUNT(*) as total_forms FROM no_dues_forms;
```

**Expected:** > 0 (if 0, submit a test form)

---

### Step 4: Check Status Records Exist
```sql
SELECT COUNT(*) as total_status_records FROM no_dues_status;
```

**Expected:** Should be approximately `total_forms × number_of_departments`

---

### Step 5: Check Staff Can See Forms
```sql
-- Replace 'library' with actual department_name from Step 1
SELECT 
  s.id as status_id,
  s.department_name,
  s.status,
  f.id as form_id,
  f.registration_no,
  f.student_name,
  f.created_at
FROM no_dues_status s
INNER JOIN no_dues_forms f ON s.form_id = f.id
WHERE s.department_name = 'library'  -- YOUR DEPARTMENT
ORDER BY f.created_at DESC
LIMIT 10;
```

**Expected:** List of forms assigned to this department

**If Empty:** No forms match the criteria (department mismatch or no forms exist)

---

## Common Fixes

### Fix 1: Set Department Name
```sql
UPDATE profiles 
SET department_name = 'library'  -- Change to your department
WHERE email = 'library@jecrc.ac.in';
```

### Fix 2: Create Missing Status Records
```sql
-- Run the backfill script: scripts/backfill-missing-status-records.sql
-- This creates no_dues_status records for all forms and active departments
```

### Fix 3: Verify Department is Active
```sql
UPDATE departments 
SET is_active = true 
WHERE name = 'library';  -- Your department
```

### Fix 4: Remove Scope Restrictions
```sql
UPDATE profiles 
SET 
  school_ids = NULL,
  course_ids = NULL,
  branch_ids = NULL
WHERE role = 'department';
```

---

## Test After Fixing

1. **Refresh Staff Dashboard:** Hard refresh (Ctrl+F5)
2. **Check Browser Console:** Look for errors in developer tools
3. **Check API Response:**
   - Open browser DevTools → Network tab
   - Look for `/api/staff/dashboard` request
   - Check if response has `applications` array with data

4. **Submit Test Form:** Go to `/student/submit-form` and submit a new form
5. **Verify Real-time Update:** Dashboard should update automatically

---

## Still Not Working?

### Check Browser Console
Press F12 → Console tab, look for errors like:
- `Failed to fetch dashboard data`
- `Unauthorized`
- `Error fetching user data`

### Check Server Logs
In your terminal running `npm run dev`, look for:
- `📊 Dashboard API - Pending applications: 0`
- `❌ Error fetching pending applications`
- SQL errors

### Verify Authentication
```sql
-- Check if user can authenticate
SELECT id, email, encrypted_password IS NOT NULL as has_password
FROM auth.users
WHERE email = 'library@jecrc.ac.in';
```

---

## Prevention for Future Staff Accounts

When creating new staff accounts, ensure:

1. **Set Role:**
   ```sql
   UPDATE profiles SET role = 'department' WHERE email = 'NEW_EMAIL';
   ```

2. **Set Department:**
   ```sql
   UPDATE profiles SET department_name = 'DEPT_NAME' WHERE email = 'NEW_EMAIL';
   ```

3. **Verify Department Exists:**
   ```sql
   SELECT * FROM departments WHERE name = 'DEPT_NAME' AND is_active = true;
   ```

4. **Test Login:** Try logging in at `/staff/login`

5. **Submit Test Form:** Verify it appears in dashboard

---

## Quick Fix Script

Run this complete diagnostic and fix script:

```sql
-- 1. Show current staff profile
SELECT 
  'CURRENT PROFILE' as check_type,
  email,
  role,
  department_name,
  full_name
FROM profiles
WHERE email = 'YOUR_STAFF_EMAIL@jecrc.ac.in';

-- 2. Show active departments
SELECT 
  'ACTIVE DEPARTMENTS' as check_type,
  name,
  display_name,
  email
FROM departments
WHERE is_active = true;

-- 3. Show forms count
SELECT 
  'FORMS COUNT' as check_type,
  COUNT(*) as total
FROM no_dues_forms;

-- 4. Show status records for staff department
SELECT 
  'STATUS RECORDS FOR DEPT' as check_type,
  s.department_name,
  COUNT(*) as count
FROM no_dues_status s
WHERE s.department_name = 'YOUR_DEPARTMENT'  -- Update this
GROUP BY s.department_name;

-- 5. If issues found, fix:
-- UPDATE profiles 
-- SET department_name = 'library' 
-- WHERE email = 'YOUR_STAFF_EMAIL@jecrc.ac.in';
```

---

## Summary

**Most common issue:** Missing or incorrect `department_name` in the staff profile.

**Quick fix:**
```sql
UPDATE profiles 
SET department_name = 'library'  -- Use exact department name
WHERE email = 'staff@jecrc.ac.in';
```

Then refresh the dashboard!