# 🧪 JECRC No Dues System - Complete Testing Guide

## 📋 Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Connectivity Tests](#database-connectivity-tests)
3. [Storage Bucket Tests](#storage-bucket-tests)
4. [Student Workflow Tests](#student-workflow-tests)
5. [Staff Workflow Tests](#staff-workflow-tests)
6. [Admin Workflow Tests](#admin-workflow-tests)
7. [Manual Entry Tests](#manual-entry-tests)
8. [Notification Tests](#notification-tests)
9. [Edge Cases & Error Handling](#edge-cases--error-handling)
10. [Performance Tests](#performance-tests)

---

## 1. Pre-Deployment Checklist

### ✅ Environment Variables (Vercel)
```bash
# Check these are set in Vercel Dashboard → Settings → Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### ✅ Supabase Setup
- [ ] Database tables created (run FINAL_COMPLETE_DATABASE_SETUP.sql)
- [ ] Storage buckets created (alumni-screenshots, certificates)
- [ ] RLS policies enabled
- [ ] Realtime enabled on forms and status tables
- [ ] Admin account created
- [ ] Staff accounts created for each department

### ✅ Code Deployment
- [ ] Latest code pushed to `render` branch
- [ ] Vercel build successful
- [ ] No deployment errors

---

## 2. Database Connectivity Tests

### Test 2.1: Verify Database Connection
```bash
# Run this script
node scripts/check-database-status.js
```

**Expected Output:**
```
✅ Database connection: SUCCESS
✅ Schools: 13 found
✅ Courses: 28 found
✅ Branches: 139 found
✅ Departments: 11 found
✅ College domain: jecrcu.edu.in
```

### Test 2.2: Verify All Tables Exist
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected Tables (12 total):**
- audit_log
- config_branches
- config_country_codes
- config_courses
- config_emails
- config_schools
- config_validation_rules
- departments
- no_dues_forms
- no_dues_status
- notifications
- profiles

### Test 2.3: Verify Foreign Key Relationships
```sql
-- Check school → course → branch chain
SELECT 
    s.name as school,
    COUNT(DISTINCT c.id) as courses,
    COUNT(DISTINCT b.id) as branches
FROM config_schools s
LEFT JOIN config_courses c ON c.school_id = s.id
LEFT JOIN config_branches b ON b.course_id = c.id
GROUP BY s.name
ORDER BY s.name;
```

**Expected: Each school should have multiple courses and branches**

### Test 2.4: Verify Indexes Exist
```sql
-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

**Expected: 15+ indexes for performance**

---

## 3. Storage Bucket Tests

### Test 3.1: Check Buckets Exist
**In Supabase Dashboard → Storage:**
- [ ] `alumni-screenshots` bucket exists
- [ ] `certificates` bucket exists (if used)

### Test 3.2: Verify Bucket Policies
```sql
-- Check storage policies
SELECT * FROM storage.buckets;
```

**Expected Configuration:**
- **alumni-screenshots**: Public read, authenticated write, max 5MB, images only
- **certificates**: Public read, service role write, PDFs only

### Test 3.3: Test File Upload (Manual)
1. Go to Supabase Dashboard → Storage → alumni-screenshots
2. Try uploading a test image
3. Verify public URL works
4. Delete test file

---

## 4. Student Workflow Tests

### Test 4.1: Form Submission (Happy Path)
**Steps:**
1. Go to `/student/submit-form`
2. Fill all fields:
   - Registration No: TEST2024001
   - Name: Test Student
   - School: Select "School of Engineering & Technology"
   - Course: Select "B.Tech" (should populate after school)
   - Branch: Select "Computer Science Engineering" (should populate after course)
   - Admission Year: 2020
   - Passing Year: 2024
   - Personal Email: test@gmail.com
   - College Email: test@jecrcu.edu.in
   - Contact: +91 9876543210
   - Upload screenshot (optional)
3. Submit form

**Expected Results:**
✅ Form submits successfully
✅ Redirects to status page
✅ Shows "Pending" status
✅ All 11 department statuses show "Pending"
✅ Database entry created in `no_dues_forms`
✅ 11 entries created in `no_dues_status`

**Verification Query:**
```sql
SELECT * FROM no_dues_forms WHERE registration_no = 'TEST2024001';
SELECT * FROM no_dues_status WHERE form_id = (SELECT id FROM no_dues_forms WHERE registration_no = 'TEST2024001');
```

### Test 4.2: Empty Session Years (Bug Fix Test)
**Steps:**
1. Fill form but LEAVE session years empty
2. Submit

**Expected:**
✅ Form submits without error
✅ Session years stored as NULL in database

**Verification:**
```sql
SELECT registration_no, session_from, session_to 
FROM no_dues_forms 
WHERE registration_no = 'TEST2024002';
-- Should show NULL for both session fields
```

### Test 4.3: Duplicate Registration Check
**Steps:**
1. Submit form with registration no: TEST2024001 (already exists)
2. Submit

**Expected:**
❌ Error message: "A form with this registration number already exists"
✅ Redirects to status page after 3 seconds

### Test 4.4: Invalid Email Domain
**Steps:**
1. Fill form
2. College Email: test@gmail.com (wrong domain)
3. Submit

**Expected:**
❌ Error: "College email must end with @jecrcu.edu.in"

### Test 4.5: Cascading Dropdowns
**Test 1: Fresh Load**
- [ ] Open form page
- [ ] Schools dropdown has 13 options
- [ ] Courses dropdown is empty/disabled
- [ ] Branches dropdown is empty/disabled

**Test 2: After School Selection**
- [ ] Select "School of Engineering & Technology"
- [ ] Courses dropdown populates with courses for that school
- [ ] Branches dropdown still empty/disabled

**Test 3: After Course Selection**
- [ ] Select "B.Tech"
- [ ] Branches dropdown populates with branches for that course
- [ ] Can select a branch

**Test 4: Change School**
- [ ] Change school selection
- [ ] Courses reset
- [ ] Branches reset
- [ ] Must select school → course → branch again

**Test 5: Page Refresh**
- [ ] Fill form partially
- [ ] Refresh page (F5)
- [ ] All fields reset (expected behavior)
- [ ] Dropdowns empty until selections made again

### Test 4.6: Check Status Page
**Steps:**
1. Go to `/student/check-status`
2. Enter registration no: TEST2024001
3. Click "Check Status"

**Expected:**
✅ Shows student details
✅ Shows overall status: Pending
✅ Shows all 11 departments with individual statuses
✅ Shows timeline/progress
✅ Real-time updates (if any department approves while viewing)

### Test 4.7: File Upload
**Test with valid file:**
- [ ] Upload JPG image (< 5MB)
- [ ] Upload PNG image (< 5MB)
- [ ] Upload WEBP image (< 5MB)
- [ ] Verify file uploads to Supabase Storage
- [ ] Verify URL saved in database

**Test with invalid files:**
- [ ] Try PDF (should fail)
- [ ] Try 10MB image (should fail with "File size must be less than 5MB")
- [ ] Try TXT file (should fail)

---

## 5. Staff Workflow Tests

### Test 5.1: Staff Login
**For each department (test 2-3):**
1. Go to `/staff/login`
2. Login with:
   - Email: library@jecrcu.edu.in (example)
   - Password: (set during creation)

**Expected:**
✅ Login successful
✅ Redirects to `/staff/dashboard`
✅ Shows only forms pending for their department
✅ Shows correct department name in header

### Test 5.2: Staff Dashboard
**Expected Display:**
- [ ] Total pending applications for their department
- [ ] List of students with forms pending
- [ ] Search functionality
- [ ] Statistics (approved, rejected, pending counts)

### Test 5.3: View Student Details
**Steps:**
1. Click on a student from dashboard
2. View details page

**Expected:**
✅ Shows all student information
✅ Shows current status of all departments
✅ Shows action buttons (Approve/Reject) only if pending for this department
✅ Cannot see forms not in their department scope

### Test 5.4: Approve Form (Single Department)
**Steps:**
1. Select a form pending for Library
2. Click "Approve"
3. Add optional remarks
4. Submit

**Expected:**
✅ Status changes to "Approved" for Library
✅ Email notification sent to Library department
✅ Email notification sent to student
✅ Form overall status remains "Pending" (other departments still pending)
✅ Database updated in `no_dues_status` table

**Verification Query:**
```sql
SELECT department_name, status, action_at, remarks
FROM no_dues_status
WHERE form_id = (SELECT id FROM no_dues_forms WHERE registration_no = 'TEST2024001')
AND department_name = 'library';
```

### Test 5.5: Reject Form
**Steps:**
1. Select a form
2. Click "Reject"
3. Enter rejection reason (required)
4. Submit

**Expected:**
✅ Status changes to "Rejected" for this department
✅ Form overall status changes to "Rejected"
✅ All other department approvals become irrelevant
✅ Student receives rejection email with reason
✅ Student can see rejection reason on status page

**Verification:**
```sql
SELECT status, rejection_reason FROM no_dues_status 
WHERE form_id = (SELECT id FROM no_dues_forms WHERE registration_no = 'TEST2024001')
AND department_name = 'library';
```

### Test 5.6: Complete Approval Workflow
**Steps:**
1. Create new form: TEST2024003
2. Login as each department staff (11 departments)
3. Approve from each department one by one

**Expected After Each Approval:**
✅ Department status updates
✅ Form overall status remains "Pending" until last approval
✅ After 11th (final) approval:
   - Overall status changes to "Completed"
   - Certificate generation triggered
   - Student receives completion email

**Verification:**
```sql
-- Check all departments approved
SELECT department_name, status 
FROM no_dues_status 
WHERE form_id = (SELECT id FROM no_dues_forms WHERE registration_no = 'TEST2024003');

-- Check overall status
SELECT status, certificate_url FROM no_dues_forms WHERE registration_no = 'TEST2024003';
```

### Test 5.7: Staff Search
**Steps:**
1. In staff dashboard
2. Search by registration number: TEST2024001
3. Search by student name: "Test"

**Expected:**
✅ Returns matching results
✅ Only shows forms accessible to this department

---

## 6. Admin Workflow Tests

### Test 6.1: Admin Login
**Steps:**
1. Go to `/staff/login` or `/admin`
2. Login with admin credentials

**Expected:**
✅ Login successful
✅ Redirects to `/admin`
✅ Shows admin dashboard

### Test 6.2: Admin Dashboard
**Expected Display:**
- [ ] Total forms statistics
- [ ] Department-wise breakdown
- [ ] Trends (daily, weekly, monthly)
- [ ] All forms (not filtered by department)
- [ ] Staff management section
- [ ] Configuration settings

### Test 6.3: View All Forms
**Steps:**
1. Click "All Applications" or similar
2. View table

**Expected:**
✅ Shows ALL forms from ALL departments
✅ Can filter by status
✅ Can filter by school
✅ Can search by registration

### Test 6.4: Create Staff Account
**Steps:**
1. Go to Admin → Staff Management
2. Click "Add Staff"
3. Fill details:
   - Name: Test Librarian
   - Email: testlib@jecrcu.edu.in
   - Department: Library
   - Password: TestPass123
4. Submit

**Expected:**
✅ Staff account created in Supabase Auth
✅ Profile created in `profiles` table
✅ Can login with credentials
✅ Has access to Library department only

**Verification:**
```sql
SELECT * FROM profiles WHERE email = 'testlib@jecrcu.edu.in';
```

### Test 6.5: Configure Schools/Courses/Branches
**Add School:**
1. Admin → Settings → Schools
2. Add new school: "Test School"
3. Save

**Expected:**
✅ School added to database
✅ Shows in student form dropdown

**Add Course:**
1. Select school: "Test School"
2. Add course: "Test Course"
3. Save

**Expected:**
✅ Course linked to school
✅ Shows in dropdown after school selection

**Add Branch:**
1. Select course: "Test Course"
2. Add branch: "Test Branch"
3. Save

**Expected:**
✅ Branch linked to course
✅ Shows in dropdown after course selection

### Test 6.6: Reports & Analytics
**Steps:**
1. Go to Admin → Reports
2. Generate report

**Expected:**
✅ Shows statistics
✅ Can export data
✅ Charts display correctly

---

## 7. Manual Entry Tests

### Test 7.1: Create Manual Entry
**Steps:**
1. Staff/Admin login
2. Go to Manual Entry section
3. Fill student details manually
4. Mark reason: "Student unable to access system"
5. Submit

**Expected:**
✅ Form created in database
✅ Marked as manual entry (`is_manual_entry = true`)
✅ Created by staff member recorded
✅ All department statuses created as pending

**Verification:**
```sql
SELECT * FROM no_dues_forms WHERE is_manual_entry = true;
SELECT * FROM manual_entries WHERE form_id = (SELECT id FROM no_dues_forms WHERE registration_no = 'MANUAL001');
```

### Test 7.2: Manual Entry Approval Flow
**Steps:**
1. Manual entry goes through same approval process
2. Each department approves/rejects

**Expected:**
✅ Works identical to regular submissions
✅ Can be approved/rejected by departments
✅ Generates certificate on completion

---

## 8. Notification Tests

### Test 8.1: Form Submission Notification
**Steps:**
1. Student submits form
2. Check email

**Expected Emails Sent:**
✅ Confirmation email to student
✅ Notification to all 11 department emails

**Email Content Should Include:**
- Student name
- Registration number
- Link to approve/reject

### Test 8.2: Department Action Notification
**Steps:**
1. Department approves/rejects form
2. Check emails

**Expected:**
✅ Email to student with status update
✅ If rejected: includes rejection reason

### Test 8.3: Final Approval Notification
**Steps:**
1. Last department approves
2. Check emails

**Expected:**
✅ Congratulations email to student
✅ Certificate download link
✅ QR code for verification

### Test 8.4: Notification History
**Verification Query:**
```sql
SELECT * FROM notifications WHERE form_id = (SELECT id FROM no_dues_forms WHERE registration_no = 'TEST2024001');
```

**Expected:**
- [ ] Records for each notification sent
- [ ] Email addresses correct
- [ ] Sent timestamps recorded

---

## 9. Edge Cases & Error Handling

### Test 9.1: Network Errors
**Steps:**
1. Disconnect internet
2. Try to submit form

**Expected:**
❌ Error message: "Network error. Please check your internet connection"

### Test 9.2: Concurrent Approvals
**Steps:**
1. Open same form in 2 browser tabs
2. Approve from both simultaneously

**Expected:**
✅ Only one approval succeeds
✅ Second tab shows "Already approved" or refreshes

### Test 9.3: XSS Prevention
**Steps:**
1. Try entering: `<script>alert('XSS')</script>` in name field
2. Submit

**Expected:**
✅ Script tags sanitized
✅ Stored safely without execution

### Test 9.4: SQL Injection Prevention
**Steps:**
1. Try: `'; DROP TABLE no_dues_forms; --` in registration field
2. Submit

**Expected:**
✅ Treated as regular text
✅ No database damage

### Test 9.5: Large File Upload
**Steps:**
1. Try uploading 10MB image

**Expected:**
❌ Error: "File size must be less than 5MB"

### Test 9.6: Session Timeout
**Steps:**
1. Staff login
2. Wait 1 hour
3. Try to approve form

**Expected:**
✅ Session expires
✅ Redirects to login
✅ Can login again

---

## 10. Performance Tests

### Test 10.1: Page Load Speed
**Measure:**
- Home page: < 2 seconds
- Dashboard: < 3 seconds
- Form submission: < 5 seconds

### Test 10.2: Cascading Dropdown Speed
**Measure:**
- School selection → Courses load: < 500ms
- Course selection → Branches load: < 500ms

### Test 10.3: Real-time Updates
**Steps:**
1. Open status page
2. In another tab, approve form
3. Status page should auto-update

**Expected:**
✅ Updates within 1-2 seconds (Supabase realtime)

### Test 10.4: Database Query Performance
```sql
-- Check slow queries
EXPLAIN ANALYZE 
SELECT * FROM no_dues_forms 
WHERE status = 'pending' 
ORDER BY created_at DESC 
LIMIT 50;
```

**Expected:**
- Query time < 100ms
- Uses indexes efficiently

---

## 11. Final Production Checklist

### Before Going Live:
- [ ] All tests above passed
- [ ] Database backup taken
- [ ] Environment variables verified
- [ ] Error logging configured (Sentry/etc)
- [ ] Analytics configured (Google Analytics)
- [ ] Domain configured (if custom)
- [ ] SSL certificate valid
- [ ] All staff accounts created
- [ ] Admin accounts secured with strong passwords
- [ ] Email templates reviewed
- [ ] Legal disclaimers added (if needed)

### Post-Deployment Monitoring:
- [ ] Check error logs daily (first week)
- [ ] Monitor form submission rate
- [ ] Check email delivery rate
- [ ] Monitor database size
- [ ] Check API response times
- [ ] Verify storage usage

---

## 12. Automated Testing Script

Run comprehensive tests:
```bash
node scripts/test-all-features.js
```

This will test:
- Database connectivity ✅
- All API endpoints ✅
- Form submission flow ✅
- Staff login & actions ✅
- Admin operations ✅
- Notifications ✅
- Manual entries ✅
- Certificate generation ✅

---

## 13. Troubleshooting Common Issues

### Issue: Dropdowns empty
**Check:**
1. Database has data: `SELECT COUNT(*) FROM config_schools;`
2. API endpoint works: Test `/api/public/config?type=schools`
3. RLS policies allow public read
4. Browser console for errors

### Issue: Form submission fails
**Check:**
1. All required fields filled
2. Email validation correct
3. Database connection working
4. Check API logs in Vercel
5. Check browser console

### Issue: Staff can't login
**Check:**
1. Account exists in Supabase Auth
2. Profile exists: `SELECT * FROM profiles WHERE email = 'xxx';`
3. Department_name set correctly
4. Password correct

### Issue: Notifications not sent
**Check:**
1. Email configuration in database
2. Supabase Edge Functions configured
3. Check notifications table for failures
4. Verify email addresses valid

---

**Testing Timeline:**
- Manual testing: 4-6 hours
- Automated testing: 10 minutes
- User acceptance testing: 1-2 days

**Test in this order:**
1. Database & connectivity
2. Student workflow
3. Staff workflow
4. Admin workflow
5. Edge cases
6. Performance

**Last Updated**: December 10, 2025  
**Version**: 1.0  
**Status**: Ready for Testing