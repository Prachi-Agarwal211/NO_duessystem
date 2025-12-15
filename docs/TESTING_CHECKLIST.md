# 🧪 JECRC No Dues System - Complete Manual Testing Guide

## 📋 Before Testing

**Prerequisites:**
1. ✅ Run `FINAL_COMPLETE_DATABASE_SETUP.sql` in Supabase
2. ✅ Run `node scripts/sync-auth-to-profiles.js` (5 accounts created)
3. ✅ Deploy code to production: `.\DEPLOY_TO_PRODUCTION.bat`
4. ✅ Production URL: https://no-duessystem.vercel.app

**Test Accounts:**
```
Admin:
- razorrag.official@gmail.com / Test@1234

Staff (Library):
- 15anuragsingh2003@gmail.com / Test@1234

Staff (Accounts):
- prachiagarwal211@gmail.com / Test@1234
- anurag.22bcom1367@jecrcu.edu.in / Test@1234
```

---

## ✅ TEST 1: Student Form Submission

**URL:** https://no-duessystem.vercel.app/student/submit-form

### Steps:
1. Fill out the form:
   ```
   Registration No: TEST2024001
   Student Name: John Doe
   Country Code: +91
   Contact Number: 9876543210
   Admission Year: 2020
   Passing Year: 2024
   Parent Name: Jane Doe
   School: Select "School of Engineering & Technology"
   Course: Select "B.Tech" (should load after school selection)
   Branch: Select any branch (should load after course selection)
   Personal Email: john.doe@gmail.com
   College Email: john.doe@jecrcu.edu.in
   ```

2. **Optional:** Upload a screenshot (PNG/JPEG, max 5MB)

3. Click **"Submit Form"**

### Expected Results:
- ✅ Form submits successfully
- ✅ Success message: "Form Submitted Successfully!"
- ✅ Redirects to status page after 3 seconds
- ✅ Can see form details on status page

### What to Check:
- [ ] All dropdowns load correctly (School → Course → Branch)
- [ ] Validation works (try invalid email, short registration number)
- [ ] File upload works (if you upload a file)
- [ ] Success message appears
- [ ] Redirects to status page

---

## ✅ TEST 2: Check Form Status (Student)

**URL:** https://no-duessystem.vercel.app/student/check-status

### Steps:
1. Enter Registration Number: `TEST2024001`
2. Click **"Check Status"**

### Expected Results:
- ✅ Shows student details:
  - Name: John Doe
  - Registration: TEST2024001
  - School/Course/Branch
  - Admission Year: 2020
  - Passing Year: 2024
  - Contact: +91 9876543210
  
- ✅ Shows 11 department statuses (all should be "Pending" initially):
  1. School (HOD/Department) - Pending
  2. Library - Pending
  3. IT Department - Pending
  4. Hostel - Pending
  5. Mess - Pending
  6. Canteen - Pending
  7. TPO - Pending
  8. Alumni Association - Pending
  9. Accounts Department - Pending
  10. JECRC Incubation Center - Pending
  11. Student Council - Pending

- ✅ Overall Status: "Pending"

### What to Check:
- [ ] All 11 departments show in correct order
- [ ] Each department shows "Pending" status
- [ ] Student details are correct
- [ ] No certificate download button (not approved yet)

---

## ✅ TEST 3: Staff Login & Dashboard

**URL:** https://no-duessystem.vercel.app/staff/login

### Steps:
1. Login as Library Staff:
   ```
   Email: 15anuragsingh2003@gmail.com
   Password: Test@1234
   ```

2. Click **"Login"**

### Expected Results:
- ✅ Redirects to `/staff/dashboard`
- ✅ Shows "Library Department Dashboard"
- ✅ Shows statistics:
  - Pending Requests: 1 (our TEST2024001 form)
  - Approved: 0
  - Rejected: 0
  
- ✅ Shows form in "Pending Requests" table:
  - Registration: TEST2024001
  - Name: John Doe
  - Status: Pending
  - Actions: "View Details" button

### What to Check:
- [ ] Login successful
- [ ] Dashboard shows correct department name (Library)
- [ ] Statistics are correct
- [ ] Can see the test form in pending requests
- [ ] "View Details" button is clickable

---

## ✅ TEST 4: Staff Approve Form

**URL:** (From staff dashboard, click "View Details" on TEST2024001)

### Steps:
1. From Library Dashboard, click **"View Details"** on TEST2024001
2. Review student information
3. Click **"Approve"** button
4. Confirm approval

### Expected Results:
- ✅ Shows student details page
- ✅ All information is correct
- ✅ Shows current status for Library: "Pending"
- ✅ After clicking Approve:
  - Success message appears
  - Library status changes to "Approved"
  - Returns to dashboard
  - Form moves from "Pending" to "Approved" section

### What to Check:
- [ ] Student details page loads correctly
- [ ] Can approve successfully
- [ ] Success notification appears
- [ ] Status updates in real-time
- [ ] Dashboard updates after approval

---

## ✅ TEST 5: Staff Reject Form (Test with another student)

**First, create a new test form:**
1. Go to `/student/submit-form`
2. Submit a new form with Registration: `TEST2024002`

**Then test rejection:**
1. Login as Library Staff
2. View Details of TEST2024002
3. Click **"Reject"** button
4. Enter rejection reason: "Books not returned"
5. Confirm rejection

### Expected Results:
- ✅ Shows rejection reason input field
- ✅ After clicking Reject:
  - Success message appears
  - Library status changes to "Rejected"
  - Rejection reason is saved
  - Form moves to "Rejected" section
  - Overall form status becomes "Rejected"

### What to Check:
- [ ] Rejection reason field appears
- [ ] Can reject successfully
- [ ] Rejection reason is saved
- [ ] Form status updates correctly
- [ ] Can view rejection reason later

---

## ✅ TEST 6: Multiple Departments Approval Flow

**Using TEST2024001 (already approved by Library):**

### Steps:
1. **Logout** from Library account
2. **Login** as Accounts Staff: `prachiagarwal211@gmail.com / Test@1234`
3. View TEST2024001 details
4. **Approve** the form
5. Repeat for other departments (if you have accounts)

### Expected Results After Each Approval:
- ✅ Department status changes to "Approved"
- ✅ Student can see updated status immediately (realtime)
- ✅ Overall status remains "Pending" until ALL departments approve
- ✅ When all 11 departments approve, overall status becomes "Completed"

### What to Check:
- [ ] Each department can only see their own pending forms
- [ ] Approval from one department doesn't affect others
- [ ] Realtime updates work (student sees changes immediately)
- [ ] After all departments approve, overall status is "Completed"

---

## ✅ TEST 7: Certificate Generation (After All Approvals)

**After TEST2024001 is approved by all departments:**

### Steps:
1. Go to `/student/check-status`
2. Enter Registration: `TEST2024001`
3. Click **"Check Status"**

### Expected Results:
- ✅ Overall Status: "Completed" (green)
- ✅ All 11 departments show "Approved"
- ✅ **"Download No Dues Certificate" button appears**
- ✅ Click button downloads a PDF certificate
- ✅ Certificate contains:
  - Student Name: John Doe
  - Registration: TEST2024001
  - School/Course/Branch
  - Admission Year: 2020
  - Passing Year: 2024
  - QR Code for verification
  - Issue Date

### What to Check:
- [ ] Download button only appears when all departments approve
- [ ] Certificate downloads successfully
- [ ] PDF opens correctly
- [ ] All details are correct on certificate
- [ ] QR code is present

---

## ✅ TEST 8: Certificate Verification (QR Code)

**After downloading certificate:**

### Steps:
1. Scan the QR code on the certificate using your phone
2. OR manually visit the verification URL from certificate

### Expected Results:
- ✅ Opens verification page
- ✅ Shows "Certificate Verified ✓"
- ✅ Displays:
  - Student Name
  - Registration Number
  - Issue Date
  - Status: Valid
  - All department approvals

### What to Check:
- [ ] QR code works
- [ ] Verification page loads
- [ ] Shows correct certificate details
- [ ] Shows all department approvals

---

## ✅ TEST 9: Admin Dashboard

**URL:** https://no-duessystem.vercel.app/admin

### Steps:
1. **Logout** from staff account
2. **Login** as Admin: `razorrag.official@gmail.com / Test@1234`

### Expected Results:
- ✅ Redirects to `/admin` dashboard
- ✅ Shows overall statistics:
  - Total Requests: 2 (TEST2024001, TEST2024002)
  - Completed: 1 (if all approved)
  - Pending: 1
  - Rejected: 1
  
- ✅ Shows all forms in table (both TEST2024001 and TEST2024002)
- ✅ Shows department performance chart
- ✅ Shows request trends chart
- ✅ Can filter by status (All, Pending, Approved, Rejected)

### What to Check:
- [ ] Admin can see ALL forms (not just their department)
- [ ] Statistics are correct
- [ ] Charts display properly
- [ ] Can filter forms by status
- [ ] Can view details of any form

---

## ✅ TEST 10: Admin View Form Details

**From Admin Dashboard:**

### Steps:
1. Click on any form (e.g., TEST2024001)
2. Review all details

### Expected Results:
- ✅ Shows complete student information
- ✅ Shows all 11 department statuses
- ✅ Shows who approved/rejected each department (if applicable)
- ✅ Shows timestamps for each action
- ✅ Can see rejection reasons (if any)
- ✅ Can download certificate (if completed)

### What to Check:
- [ ] All details are accurate
- [ ] Department statuses are correct
- [ ] Timestamps are present
- [ ] Can see audit trail of actions

---

## ✅ TEST 11: Admin Settings (Configuration)

**URL:** Click "Settings" in Admin Dashboard

### Steps:
1. From Admin Dashboard, click **"Settings"** icon
2. Navigate to different configuration tabs:
   - Schools
   - Courses
   - Branches
   - Departments
   - Email Settings

### Expected Results:
- ✅ Can view all configuration data
- ✅ Schools: Shows 13 schools
- ✅ Courses: Shows 28 courses
- ✅ Branches: Shows 139 branches
- ✅ Departments: Shows 11 departments
- ✅ Can add/edit/delete (with proper permissions)

### What to Check:
- [ ] Settings page loads
- [ ] All configuration tabs work
- [ ] Data displays correctly
- [ ] Can add new schools/courses/branches
- [ ] Can activate/deactivate items

---

## ✅ TEST 12: Realtime Updates

**This test requires 2 browser windows:**

### Steps:
1. **Window 1:** Login as Library Staff, open dashboard
2. **Window 2:** Open student status page for TEST2024001
3. **Window 1:** Approve a different form
4. **Window 2:** Check if status updates WITHOUT refreshing

### Expected Results:
- ✅ Changes in Window 1 appear in Window 2 immediately
- ✅ No page refresh needed
- ✅ Updates happen within 1-2 seconds
- ✅ Dashboard counters update in realtime
- ✅ Form status updates in realtime

### What to Check:
- [ ] Realtime connection established (check console)
- [ ] Updates appear without refresh
- [ ] Multiple users can work simultaneously
- [ ] No conflicts or race conditions

---

## ✅ TEST 13: Manual Entry System (Admin Only)

**URL:** https://no-duessystem.vercel.app/student/manual-entry

### Steps:
1. Login as Admin
2. Navigate to Manual Entry page
3. Fill form with pre-approved status for a department
4. Submit

### Expected Results:
- ✅ Can create form with pre-approved departments
- ✅ Selected departments show "Approved" immediately
- ✅ Other departments remain "Pending"
- ✅ Useful for bulk data entry or corrections

### What to Check:
- [ ] Manual entry form loads
- [ ] Can select pre-approved departments
- [ ] Form creates successfully
- [ ] Selected departments show approved
- [ ] Other departments show pending

---

## ✅ TEST 14: Form Editing (Before Any Approvals)

**URL:** Student can edit form if no department has acted

### Steps:
1. Create a new form: TEST2024003
2. Go to check status page
3. Click **"Edit Form"** button (if no approvals)
4. Make changes
5. Resubmit

### Expected Results:
- ✅ Edit button appears only if no department has approved/rejected
- ✅ Can modify all fields except registration number
- ✅ After resubmit, all department statuses reset to "Pending"
- ✅ Success message confirms update

### What to Check:
- [ ] Edit button appears for new forms
- [ ] Edit button disappears after first approval
- [ ] Changes save correctly
- [ ] Department statuses reset after edit

---

## ✅ TEST 15: Search & Filter (Staff Dashboard)

**URL:** Staff Dashboard

### Steps:
1. Login as any staff
2. Use search box to find forms
3. Try searching by:
   - Registration number
   - Student name
   - Email

### Expected Results:
- ✅ Search works in real-time
- ✅ Filters forms correctly
- ✅ Shows "No results" if nothing matches
- ✅ Clears search when input is empty

### What to Check:
- [ ] Search is instant (no submit button needed)
- [ ] Searches across multiple fields
- [ ] Results update as you type
- [ ] Clear functionality works

---

## 🎯 CRITICAL ISSUES CHECKLIST

**Before deploying, verify these work:**

### Student Flow:
- [ ] Can submit form with correct data
- [ ] Validation prevents invalid data
- [ ] Can check status anytime
- [ ] Can edit form before approvals
- [ ] Can download certificate after all approvals
- [ ] QR code verification works

### Staff Flow:
- [ ] Can login successfully
- [ ] See only relevant forms (department-specific)
- [ ] Can approve forms
- [ ] Can reject forms with reasons
- [ ] Dashboard updates in realtime
- [ ] Search and filters work

### Admin Flow:
- [ ] Can see all forms and statistics
- [ ] Can manage configuration (schools/courses/branches)
- [ ] Can create manual entries
- [ ] Can view complete audit trail
- [ ] Charts and reports display correctly

### System Flow:
- [ ] Realtime updates work
- [ ] No errors in browser console
- [ ] No errors in Supabase logs
- [ ] All 11 departments function correctly
- [ ] Certificate generation works
- [ ] QR verification works

---

## 📝 Test Results Log

**Date:** ___________
**Tester:** ___________

| Test # | Test Name | Result | Notes |
|--------|-----------|--------|-------|
| 1 | Student Form Submission | ⬜ Pass / ⬜ Fail | |
| 2 | Check Status | ⬜ Pass / ⬜ Fail | |
| 3 | Staff Login | ⬜ Pass / ⬜ Fail | |
| 4 | Staff Approve | ⬜ Pass / ⬜ Fail | |
| 5 | Staff Reject | ⬜ Pass / ⬜ Fail | |
| 6 | Multi-Department | ⬜ Pass / ⬜ Fail | |
| 7 | Certificate Generation | ⬜ Pass / ⬜ Fail | |
| 8 | Certificate Verification | ⬜ Pass / ⬜ Fail | |
| 9 | Admin Dashboard | ⬜ Pass / ⬜ Fail | |
| 10 | Admin View Details | ⬜ Pass / ⬜ Fail | |
| 11 | Admin Settings | ⬜ Pass / ⬜ Fail | |
| 12 | Realtime Updates | ⬜ Pass / ⬜ Fail | |
| 13 | Manual Entry | ⬜ Pass / ⬜ Fail | |
| 14 | Form Editing | ⬜ Pass / ⬜ Fail | |
| 15 | Search & Filter | ⬜ Pass / ⬜ Fail | |

---

## 🚨 Common Issues & Solutions

### Issue: "Email domain must be @jecrcu.edu.in"
**Solution:** Use correct college email format

### Issue: Department shows twice
**Solution:** Check departments table for duplicates

### Issue: Certificate won't download
**Solution:** Ensure ALL 11 departments have approved

### Issue: Realtime not working
**Solution:** Check browser console for WebSocket errors

### Issue: Staff can't see forms
**Solution:** Verify staff account has correct department_name

### Issue: Login fails
**Solution:** Check if account exists in profiles table

---

## ✅ Final Checklist Before Production

- [ ] All 15 manual tests passed
- [ ] No console errors
- [ ] No Supabase errors
- [ ] Certificate generation works
- [ ] QR verification works
- [ ] Realtime updates work
- [ ] All 11 departments function
- [ ] Admin can manage everything
- [ ] Staff can approve/reject
- [ ] Students can submit and check status

**If all checks pass → READY FOR PRODUCTION! 🚀**