# Complete System Testing Guide with Automated Scripts

## Overview

This guide provides a comprehensive testing framework for the JECRC No Dues System, including:
- **2 Convocation entries** for auto-fill testing
- **7 Test accounts** covering all user roles
- **10 Complete workflow tests** covering all features
- **Automated cleanup scripts**

---

## 🚀 Quick Start (5 Steps)

### Step 1: Create Auth Accounts in Supabase (5 minutes)

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Create these 7 accounts (use simple password like `Test@123` for all):

| Email | Role | Password |
|-------|------|----------|
| `test.student1@jecrcu.edu.in` | Student (Convocation) | `Test@123` |
| `test.student2@jecrcu.edu.in` | Student (Regular) | `Test@123` |
| `test.student3@jecrcu.edu.in` | Student (Manual Entry) | `Test@123` |
| `test.hod@jecrcu.edu.in` | HOD | `Test@123` |
| `test.library@jecrcu.edu.in` | Library Staff | `Test@123` |
| `test.hostel@jecrcu.edu.in` | Hostel Staff | `Test@123` |
| `test.admin@jecrcu.edu.in` | Admin | `Test@123` |

4. **Copy each user's UUID** from the Users table (you'll need these!)

---

### Step 2: Run SQL Setup Script (2 minutes)

Open [`COMPLETE_SYSTEM_TEST_SUITE.sql`](COMPLETE_SYSTEM_TEST_SUITE.sql:1) in Supabase SQL Editor and run:

#### Part 1: Create Convocation Data
```sql
-- Adds 2 test students to convocation database
INSERT INTO convocation_students (
  registration_no, name, school, course, branch, admission_year
) VALUES
  ('22TEST001', 'Test Student Alpha', 'School of Engineering and Technology', 'B.Tech', 'Computer Science', '2022'),
  ('22TEST002', 'Test Student Beta', 'School of Management', 'MBA', NULL, '2022')
ON CONFLICT (registration_no) DO NOTHING;
```

#### Part 2: Create Profiles (Replace UUIDs!)
```sql
-- Replace '00000000-0000-0000-0000-000000000001' with actual UUIDs from Step 1
INSERT INTO profiles (id, full_name, email, role, department_id) VALUES
  ('YOUR-UUID-1', 'Test Student Alpha', 'test.student1@jecrcu.edu.in', 'student', NULL),
  ('YOUR-UUID-2', 'Test Student Beta', 'test.student2@jecrcu.edu.in', 'student', NULL),
  ('YOUR-UUID-3', 'Test Student Gamma', 'test.student3@jecrcu.edu.in', 'student', NULL),
  ('YOUR-UUID-4', 'Test HOD', 'test.hod@jecrcu.edu.in', 'hod',
    (SELECT id FROM departments WHERE name = 'School HOD' LIMIT 1)),
  ('YOUR-UUID-5', 'Test Librarian', 'test.library@jecrcu.edu.in', 'department',
    (SELECT id FROM departments WHERE name = 'Library' LIMIT 1)),
  ('YOUR-UUID-6', 'Test Hostel Manager', 'test.hostel@jecrcu.edu.in', 'department',
    (SELECT id FROM departments WHERE name = 'Hostel' LIMIT 1)),
  ('YOUR-UUID-7', 'Test Admin', 'test.admin@jecrcu.edu.in', 'admin', NULL)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  department_id = EXCLUDED.department_id;
```

---

### Step 3: Run Test Workflows (20 minutes)

Visit your deployed site (or `localhost:3000`) and test each workflow:

---

## 📋 Test Scenarios

### TEST 1: Regular Form Submission (Convocation Eligible) ✅

**User:** `test.student1@jecrcu.edu.in` / `Test@123`

**Steps:**
1. Login as test.student1@jecrcu.edu.in
2. Go to **"Submit No Dues Form"**
3. Enter Registration Number: `22TEST001`
4. **✨ AUTO-FILL MAGIC:** Name, School, Course should auto-populate!
5. Select remaining details (Branch, Contact info)
6. Upload any file as "no-dues certificate"
7. Submit form

**Expected Result:**
- ✅ Form auto-fills from convocation data
- ✅ Form status: `pending`
- ✅ All 7 department statuses created automatically
- ✅ Green success message

**Verify in Database:**
```sql
SELECT 
  f.registration_no, f.student_name, f.school, f.status,
  COUNT(ds.id) as dept_statuses_created
FROM student_forms f
LEFT JOIN department_statuses ds ON f.id = ds.form_id
WHERE f.registration_no = '22TEST001'
GROUP BY f.id;
-- Should show: 7 department statuses created
```

---

### TEST 2: Regular Form Submission (Not in Convocation) ⚠️

**User:** `test.student2@jecrcu.edu.in` / `Test@123`

**Steps:**
1. Login as test.student2@jecrcu.edu.in
2. Go to **"Submit No Dues Form"**
3. Enter Registration Number: `22TEST003` (not in convocation)
4. **Notice:** No auto-fill (manual entry required)
5. Fill all fields manually
6. Submit form

**Expected Result:**
- ⚠️ Warning message: "Not eligible for convocation"
- ✅ Form still submits successfully
- ✅ Can proceed with no-dues clearance

---

### TEST 3: Manual Entry Submission 📄

**User:** `test.student3@jecrcu.edu.in` / `Test@123`

**Steps:**
1. Login as test.student3@jecrcu.edu.in
2. Go to **"Upload Manual Completed No Dues"**
3. Enter Registration Number: `22TEST004`
4. Fill School, Course, Branch manually
5. Upload a **PDF certificate** (drag & drop or click)
6. Submit

**Expected Result:**
- ✅ File uploads via `/api/upload` route (no RLS error!)
- ✅ Form created with `is_manual_entry = true`
- ✅ Status: `pending_verification` (admin approval needed)
- ✅ No department statuses created yet

**Verify Upload:**
```sql
SELECT 
  registration_no, is_manual_entry, 
  is_manual_entry_verified, status, certificate_url
FROM student_forms
WHERE registration_no = '22TEST004';
-- Should show: is_manual_entry=true, is_manual_entry_verified=false
```

---

### TEST 4: Admin Verifies Manual Entry 👨‍💼

**User:** `test.admin@jecrcu.edu.in` / `Test@123`

**Steps:**
1. Login as test.admin@jecrcu.edu.in
2. Go to **Admin Dashboard** → **"Manual Entries"** tab
3. Find TEST004 manual entry
4. Click **"Verify & Create Form"**
5. Confirm action

**Expected Result:**
- ✅ `is_manual_entry_verified` changes to `true`
- ✅ Status changes from `pending_verification` → `pending`
- ✅ All 7 department statuses created automatically
- ✅ Form enters normal approval workflow

**Verify:**
```sql
SELECT 
  f.registration_no, f.is_manual_entry_verified, f.status,
  COUNT(ds.id) as dept_statuses
FROM student_forms f
LEFT JOIN department_statuses ds ON f.id = ds.form_id
WHERE f.registration_no = '22TEST004'
GROUP BY f.id;
-- Should show: is_manual_entry_verified=true, status='pending', 7 dept_statuses
```

---

### TEST 5: Department Approval Workflow 👍

**Test Approvals in Order:**

#### 5A: HOD Approves
**User:** `test.hod@jecrcu.edu.in` / `Test@123`

**Steps:**
1. Login as test.hod@jecrcu.edu.in
2. Go to **Staff Dashboard**
3. Find TEST001 form in "Pending Approvals"
4. Click **"View Details"**
5. Click **"Approve"**
6. Add remarks: "Documents verified"
7. Confirm

**Expected Result:**
- ✅ School HOD status: `approved`
- ✅ Form status: `under_review`
- ✅ Next department (Library) can now see form

#### 5B: Library Approves
**User:** `test.library@jecrcu.edu.in` / `Test@123`

**Steps:**
1. Login as test.library@jecrcu.edu.in
2. Go to **Staff Dashboard**
3. Approve TEST001 form

**Expected Result:**
- ✅ Library status: `approved`
- ✅ Form moves to next department (IT)

#### 5C: Continue Chain (Hostel, IT, Accounts, Alumni, Registrar)
**Repeat approval process for remaining departments**

**Final Expected Result:**
- ✅ After all 7 departments approve:
- ✅ Form status: `approved`
- ✅ Certificate auto-generates
- ✅ Certificate number assigned (e.g., `JECRC/ND/2024/001234`)

**Verify Completion:**
```sql
SELECT 
  f.registration_no, f.status, f.certificate_number,
  COUNT(ds.id) FILTER (WHERE ds.status = 'approved') as approved_depts,
  COUNT(ds.id) as total_depts
FROM student_forms f
JOIN department_statuses ds ON f.id = ds.form_id
WHERE f.registration_no = '22TEST001'
GROUP BY f.id;
-- Should show: status='approved', approved_depts=7, total_depts=7
```

---

### TEST 6: Rejection Workflow ❌

**User:** `test.library@jecrcu.edu.in` / `Test@123`

**Steps:**
1. Use TEST002 form (create if needed)
2. HOD approves it first
3. Library **REJECTS** it
4. Add remarks: "Library books not returned"

**Expected Result:**
- ✅ Library status: `rejected`
- ✅ Form status: `rejected`
- ✅ All subsequent departments **blocked** (cannot approve/reject)
- ✅ Student notified via email

**Verify Cascade:**
```sql
SELECT 
  d.name as department,
  ds.status,
  ds.remarks,
  d.approval_order
FROM student_forms f
JOIN department_statuses ds ON f.id = ds.form_id
JOIN departments d ON ds.department_id = d.id
WHERE f.registration_no = '22TEST002'
ORDER BY d.approval_order;
-- Should show: HOD=approved, Library=rejected, rest=pending
```

---

### TEST 7: Student Checks Status 🔍

**User:** `test.student1@jecrcu.edu.in` / `Test@123`

**Steps:**
1. Login as test.student1@jecrcu.edu.in
2. Go to **"Check Status"**
3. Enter Registration Number: `22TEST001`
4. Click **"Check Status"**

**Expected Result:**
- ✅ Shows all 7 departments
- ✅ Status for each (approved/pending/rejected)
- ✅ Timestamps and approver names
- ✅ Overall status badge (approved/under_review/rejected)
- ✅ Download certificate button (if approved)

---

### TEST 8: Reapplication After Rejection 🔄

**User:** `test.student2@jecrcu.edu.in` / `Test@123` (rejected form)

**Steps:**
1. Login as test.student2@jecrcu.edu.in
2. Go to **"Check Status"**
3. See rejection from Library: "Books not returned"
4. Click **"Reapply"** button
5. Acknowledgement: "I have resolved the rejection reasons"
6. Submit new form

**Expected Result:**
- ✅ Old form marked as `reapplied`
- ✅ New form created with status `pending`
- ✅ Fresh department statuses created
- ✅ Old form no longer editable
- ✅ Can track both forms in history

**Verify:**
```sql
SELECT 
  id, registration_no, status, created_at,
  CASE 
    WHEN status = 'reapplied' THEN 'Old'
    ELSE 'Current'
  END as form_type
FROM student_forms
WHERE registration_no = '22TEST002'
ORDER BY created_at DESC;
-- Should show: 2 forms (1 reapplied, 1 pending)
```

---

### TEST 9: Support Ticket System 🎫

**User:** Any test account

**Steps:**
1. Login with any test account
2. Click **"Support"** button (bottom-right)
3. Fill ticket:
   - Type: "Technical Issue"
   - Subject: "Test Ticket - Cannot upload file"
   - Description: "Getting error when uploading PDF"
4. Submit

**Expected Result:**
- ✅ Ticket created with status `open`
- ✅ Student can see ticket in **"My Tickets"**
- ✅ Admin can see ticket in **Admin Dashboard → Support**
- ✅ Email notification sent

**Verify:**
```sql
SELECT 
  id, subject, category, status, priority,
  created_at, created_by
FROM support_tickets
WHERE subject LIKE '%Test Ticket%'
ORDER BY created_at DESC;
```

---

### TEST 10: Admin Dashboard Statistics 📊

**User:** `test.admin@jecrcu.edu.in` / `Test@123`

**Steps:**
1. Login as test.admin@jecrcu.edu.in
2. Go to **Admin Dashboard**
3. View all stats cards

**Expected Result:**
- ✅ Total Applications (includes TEST forms)
- ✅ Pending count
- ✅ Under Review count
- ✅ Approved count
- ✅ Rejected count
- ✅ Manual Entries count
- ✅ Support Tickets count
- ✅ Real-time updates when changes occur

**Performance Check:**
- ✅ Dashboard loads in < 2 seconds
- ✅ No 500 errors in console
- ✅ All charts render correctly

---

## 🧹 Cleanup: Delete All Test Data

### Step 4: Run Cleanup SQL (1 minute)

After all tests complete, run this in Supabase SQL Editor:

```sql
BEGIN;

-- Delete department statuses
DELETE FROM department_statuses
WHERE form_id IN (
  SELECT id FROM student_forms 
  WHERE registration_no LIKE '22TEST%'
);

-- Delete test forms
DELETE FROM student_forms
WHERE registration_no LIKE '22TEST%';

-- Delete test convocation data
DELETE FROM convocation_students
WHERE registration_no IN ('22TEST001', '22TEST002');

-- Delete test profiles
DELETE FROM profiles
WHERE email LIKE 'test.%@jecrcu.edu.in';

-- Delete test support tickets
DELETE FROM support_tickets
WHERE created_by IN (
  SELECT id FROM profiles WHERE email LIKE 'test.%@jecrc.ac.in'
);

-- Verify cleanup
SELECT 
  (SELECT COUNT(*) FROM student_forms WHERE registration_no LIKE '22TEST%') as remaining_forms,
  (SELECT COUNT(*) FROM convocation_students WHERE registration_no LIKE '22TEST%') as remaining_convocation,
  (SELECT COUNT(*) FROM profiles WHERE email LIKE 'test.%@jecrcu.edu.in') as remaining_profiles;

COMMIT;
```

**Expected Output:** All counts should be `0`

---

### Step 5: Delete Auth Accounts (2 minutes)

Auth accounts must be deleted manually in Supabase:

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Search for `test.` to find all test accounts
3. For each account:
   - Click **"..."** menu
   - Click **"Delete user"**
   - Confirm deletion
4. Repeat for all 7 test accounts

---

## ✅ Success Checklist

After completing all tests, verify:

- [ ] **Convocation Integration:** Auto-fill works for registered students
- [ ] **Manual Entry:** PDF upload works without RLS errors
- [ ] **Admin Verification:** Manual entries verified and enter workflow
- [ ] **Approval Chain:** All 7 departments can approve in sequence
- [ ] **Rejection Cascade:** Rejection blocks subsequent departments
- [ ] **Status Check:** Students can view real-time status
- [ ] **Reapplication:** Students can reapply after rejection
- [ ] **Support System:** Tickets created and visible to admin
- [ ] **Dashboard Stats:** Admin sees accurate counts
- [ ] **Performance:** All pages load in < 2 seconds
- [ ] **No Console Errors:** Zero 404/500 errors in browser console
- [ ] **Email Notifications:** Emails sent for approvals/rejections
- [ ] **Certificate Generation:** Auto-generates after full approval
- [ ] **Cleanup Complete:** All test data deleted

---

## 🐛 Common Issues & Solutions

### Issue 1: "Registration number not found in convocation"
**Solution:** You used a registration number not in the test data. Use `22TEST001` or `22TEST002`.

### Issue 2: Manual entry upload fails with "RLS violation"
**Solution:** 
1. Verify `/api/upload` route exists
2. Check `SUPABASE_SERVICE_ROLE_KEY` in environment variables (NOT anon key!)
3. Redeploy if the fix from `src/app/student/manual-entry/page.js` wasn't applied

### Issue 3: Department can't see form after previous approval
**Solution:** Check approval order in database:
```sql
SELECT name, approval_order FROM departments ORDER BY approval_order;
```
Ensure each department approves in correct sequence.

### Issue 4: Certificate not generating after all approvals
**Solution:** Check form status:
```sql
SELECT id, registration_no, status, certificate_number 
FROM student_forms 
WHERE registration_no = '22TEST001';
```
If status is `approved` but certificate_number is NULL, trigger generation manually in Admin panel.

### Issue 5: Support tickets not showing
**Solution:** Check RLS policies:
```sql
SELECT * FROM support_tickets WHERE created_by = 'your-user-uuid';
```
If empty but ticket was created, RLS policy may be blocking reads.

---

## 📝 Test Report Template

After testing, fill this out:

```
JECRC No Dues System - Test Report
===================================
Date: [DATE]
Tester: [YOUR NAME]
Environment: [Production / Staging / Local]

Test Results:
-------------
✅ TEST 1: Convocation Auto-fill - PASS
✅ TEST 2: Regular Form Submission - PASS
✅ TEST 3: Manual Entry Upload - PASS
✅ TEST 4: Admin Verification - PASS
✅ TEST 5: Department Approvals - PASS
✅ TEST 6: Rejection Cascade - PASS
✅ TEST 7: Status Check - PASS
✅ TEST 8: Reapplication - PASS
✅ TEST 9: Support Tickets - PASS
✅ TEST 10: Admin Dashboard - PASS

Performance:
------------
- Dashboard Load Time: [X] seconds
- Form Submission Time: [X] seconds
- Status Check Time: [X] seconds
- File Upload Time: [X] seconds

Issues Found:
-------------
[List any bugs or issues]

Recommendations:
----------------
[Any suggestions for improvements]

Overall Status: ✅ READY FOR PRODUCTION / ⚠️ NEEDS FIXES
```

---

## 🎯 Next Steps After Testing

If all tests pass:

1. **Deploy to Production:**
   - Clear Render build cache
   - Deploy latest code
   - Verify environment variables

2. **Monitor for 24 Hours:**
   - Check error logs
   - Monitor performance
   - Watch for user-reported issues

3. **Implement Frontend Upgrades:**
   - Phase 2: Performance optimization
   - Phase 3: UI enhancements (SpotlightCard, GridBackground)
   - Phase 4: Advanced features

4. **User Training:**
   - Create user documentation
   - Train department staff
   - Setup helpdesk

---

**Testing Time Estimate:** 30-40 minutes total
- Setup: 7 minutes
- Testing: 20 minutes
- Cleanup: 3 minutes

**Ready to start testing!** 🚀