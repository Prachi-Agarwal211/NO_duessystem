# 👥 STAFF ACCOUNTS SETUP GUIDE

## 📋 Staff Account Configuration

### Account Details

| Role | Email | Password | Department | Description |
|------|-------|----------|------------|-------------|
| **Admin** | razorrag.official@gmail.com | Test@1234 | - | System Administrator (Full Access) |
| **Library** | 15anuragsingh2003@gmail.com | Test@1234 | library | Library Department Staff |
| **Accounts** | prachiagarwal211@gmail.com | Test@1234 | accounts_department | Accounts Department Staff |
| **School HOD** | anurag.22bcom1367@jecrcu.edu.in | Test@1234 | school_hod | School/Computer Science HOD |

---

## 🚀 QUICK SETUP (3 Steps)

### Step 1: Run Database Setup (If Not Done)

```bash
# In Supabase SQL Editor, run:
FINAL_COMPLETE_DATABASE_SETUP.sql
```

### Step 2: Create All Staff Accounts

```bash
# From your project directory, run:
node scripts/create-all-staff-accounts.js
```

**Expected Output:**
```
✅ SUCCESSFULLY CREATED ACCOUNTS:
   📧 razorrag.official@gmail.com
      Role: admin
      Description: System Administrator

   📧 15anuragsingh2003@gmail.com
      Role: department
      Department: library
      Description: Library Department Staff

   📧 prachiagarwal211@gmail.com
      Role: department
      Department: accounts_department
      Description: Accounts Department Staff

   📧 anurag.22bcom1367@jecrcu.edu.in
      Role: department
      Department: school_hod
      Description: School HOD/Computer Science Department
```

### Step 3: Update Department Email Addresses

```bash
# In Supabase SQL Editor, run:
# Copy contents from scripts/update-department-emails.sql
# Or run directly:
```

```sql
UPDATE public.departments SET email = '15anuragsingh2003@gmail.com' WHERE name = 'library';
UPDATE public.departments SET email = 'prachiagarwal211@gmail.com' WHERE name = 'accounts_department';
UPDATE public.departments SET email = 'anurag.22bcom1367@jecrcu.edu.in' WHERE name = 'school_hod';
```

---

## 📧 EMAIL NOTIFICATION SETUP

### How Email Notifications Work

When a student submits a No Dues form:

1. **Form Submission** → Triggers notification to ALL departments
2. **Each Department** receives email at their registered email address
3. **Staff Login** → Review and approve/reject their department's clearance
4. **Status Update** → Student gets notified of approval/rejection

### Email Distribution

| Event | Recipients |
|-------|-----------|
| **New Form Submission** | All 11 department emails |
| **Library Clearance** | 15anuragsingh2003@gmail.com |
| **Accounts Clearance** | prachiagarwal211@gmail.com |
| **School/HOD Clearance** | anurag.22bcom1367@jecrcu.edu.in |
| **Other Departments** | razorrag.official@gmail.com (Admin) |
| **Form Completed** | Student's email + Admin |
| **Form Rejected** | Student's email + Admin |

### Configure Email Notifications

1. **Enable Supabase SMTP** (in Supabase Dashboard):
   - Go to Project Settings → Authentication → Email Templates
   - Configure SMTP settings or use built-in email

2. **Test Email Sending**:
   ```bash
   node scripts/test-send-notification.js
   ```

3. **Verify Email Configuration**:
   ```sql
   SELECT * FROM config_emails;
   ```

---

## 🔐 LOGIN INSTRUCTIONS

### For Admin (razorrag.official@gmail.com)

1. **Navigate to**: http://localhost:3000/staff/login (or your production URL)
2. **Enter Credentials**:
   - Email: `razorrag.official@gmail.com`
   - Password: `Test@1234`
3. **Click Login**
4. **You will be redirected to**: `/staff/dashboard`
5. **What You Can Do**:
   - ✅ View ALL forms from all schools/departments
   - ✅ Approve/Reject any department clearance
   - ✅ View statistics and reports
   - ✅ Manage staff accounts
   - ✅ Access admin settings
   - ✅ Generate certificates

### For Library Staff (15anuragsingh2003@gmail.com)

1. **Navigate to**: http://localhost:3000/staff/login
2. **Enter Credentials**:
   - Email: `15anuragsingh2003@gmail.com`
   - Password: `Test@1234`
3. **Click Login**
4. **You will be redirected to**: `/staff/dashboard`
5. **What You Can Do**:
   - ✅ View forms requiring Library clearance
   - ✅ Approve/Reject Library clearance ONLY
   - ✅ Add remarks for rejections
   - ✅ View your department's statistics
   - ❌ Cannot access other departments' clearances

### For Accounts Staff (prachiagarwal211@gmail.com)

1. **Navigate to**: http://localhost:3000/staff/login
2. **Enter Credentials**:
   - Email: `prachiagarwal211@gmail.com`
   - Password: `Test@1234`
3. **Click Login**
4. **You will be redirected to**: `/staff/dashboard`
5. **What You Can Do**:
   - ✅ View forms requiring Accounts clearance
   - ✅ Approve/Reject Accounts clearance ONLY
   - ✅ Add remarks for rejections
   - ✅ View your department's statistics
   - ❌ Cannot access other departments' clearances

### For School HOD/CS (anurag.22bcom1367@jecrcu.edu.in)

1. **Navigate to**: http://localhost:3000/staff/login
2. **Enter Credentials**:
   - Email: `anurag.22bcom1367@jecrcu.edu.in`
   - Password: `Test@1234`
3. **Click Login**
4. **You will be redirected to**: `/staff/dashboard`
5. **What You Can Do**:
   - ✅ View forms requiring School/HOD clearance
   - ✅ Approve/Reject School/HOD clearance ONLY
   - ✅ Filter by Computer Science students (if school filtering enabled)
   - ✅ Add remarks for rejections
   - ✅ View your department's statistics
   - ❌ Cannot access other departments' clearances

---

## 🎯 TESTING THE WORKFLOW

### Test 1: Student Form Submission

1. **Go to**: http://localhost:3000/student/submit-form
2. **Fill Form**:
   - Registration No: `TEST12345`
   - Student Name: `Test Student`
   - School: `School of Computer Applications`
   - Course: `BCA`
   - Branch: `BCA (General)`
   - Personal Email: `student@example.com`
   - College Email: `test@jecrcu.edu.in`
   - Contact: `9876543210`
3. **Submit Form**
4. **Expected Result**:
   - ✅ Form submitted successfully
   - ✅ 11 department status records created (all "Pending")
   - ✅ Emails sent to all 11 department email addresses
   - ✅ Student redirected to check-status page

### Test 2: Library Staff Approval

1. **Login as Library Staff** (15anuragsingh2003@gmail.com)
2. **View Dashboard** - should see the submitted form
3. **Click on Form** to view details
4. **Find Library Department Section**
5. **Click "Approve"**
6. **Expected Result**:
   - ✅ Library status changes to "Approved"
   - ✅ Form overall status stays "Pending" (other depts pending)
   - ✅ Student can see Library approved on check-status page

### Test 3: Accounts Staff Approval

1. **Login as Accounts Staff** (prachiagarwal211@gmail.com)
2. **View Dashboard** - should see the submitted form
3. **Click on Form** to view details
4. **Find Accounts Department Section**
5. **Click "Approve"**
6. **Expected Result**:
   - ✅ Accounts status changes to "Approved"
   - ✅ Form overall status stays "Pending" (other depts pending)
   - ✅ Student can see Accounts approved on check-status page

### Test 4: Admin Bulk Approval

1. **Login as Admin** (razorrag.official@gmail.com)
2. **View Dashboard** - should see ALL forms
3. **Click on Form** to view details
4. **Approve Remaining Departments**:
   - Click "Approve" for each remaining department
   - Add optional remarks
5. **Expected Result**:
   - ✅ Each department status changes to "Approved"
   - ✅ After ALL 11 departments approved → Form status becomes "Completed"
   - ✅ Certificate generation button appears
   - ✅ Student gets completion notification

### Test 5: Email Notifications

Check that emails were sent to:
- ✅ 15anuragsingh2003@gmail.com (Library notification)
- ✅ prachiagarwal211@gmail.com (Accounts notification)
- ✅ anurag.22bcom1367@jecrcu.edu.in (School HOD notification)
- ✅ razorrag.official@gmail.com (Admin notifications)

---

## 🔧 TROUBLESHOOTING

### Issue: Staff Account Creation Failed

**Error**: "User already exists"

**Solution**:
1. Go to Supabase Dashboard → Authentication → Users
2. Find and delete the existing user
3. Run `node scripts/create-all-staff-accounts.js` again

**Error**: "Profile creation failed"

**Solution**:
1. Verify profiles table has correct structure:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'profiles';
   ```
2. Ensure `department_name` column exists
3. Run `FINAL_COMPLETE_DATABASE_SETUP.sql` if needed

### Issue: Cannot Login as Staff

**Error**: "Invalid credentials"

**Solutions**:
- Verify email is exactly as specified (case-sensitive)
- Password is exactly: `Test@1234` (capital T)
- Check if user exists in Supabase Auth Dashboard
- Verify profile record exists: 
  ```sql
  SELECT * FROM profiles WHERE email = 'email@example.com';
  ```

**Error**: "User not found"

**Solution**: Create the user account:
```bash
node scripts/create-all-staff-accounts.js
```

### Issue: Staff Cannot See Forms

**Problem**: Dashboard is empty for department staff

**Solutions**:
1. Verify `department_name` in profile matches department in `departments` table:
   ```sql
   SELECT p.email, p.department_name, d.name 
   FROM profiles p
   LEFT JOIN departments d ON p.department_name = d.name
   WHERE p.email = '15anuragsingh2003@gmail.com';
   ```

2. Check if forms exist:
   ```sql
   SELECT COUNT(*) FROM no_dues_forms;
   SELECT COUNT(*) FROM no_dues_status WHERE department_name = 'library';
   ```

3. Verify RLS policies allow department staff to view forms

### Issue: No Email Notifications

**Problem**: Emails not being sent

**Solutions**:
1. Check Supabase email configuration:
   - Dashboard → Project Settings → Authentication → SMTP Settings

2. Verify department email addresses:
   ```sql
   SELECT name, email FROM departments;
   ```

3. Update emails if needed:
   ```bash
   # Run in Supabase SQL Editor
   # See: scripts/update-department-emails.sql
   ```

4. Test email sending:
   ```bash
   node scripts/test-send-notification.js
   ```

5. Check Supabase logs for email errors:
   - Dashboard → Logs → Filter by "email" or "notification"

---

## 📊 VERIFICATION QUERIES

### Check All Staff Accounts

```sql
SELECT 
    email,
    full_name,
    role,
    department_name,
    is_active,
    created_at
FROM profiles
ORDER BY role, email;
```

**Expected Output:**
```
| email                              | role       | department_name      |
|------------------------------------|------------|----------------------|
| razorrag.official@gmail.com        | admin      | NULL                 |
| 15anuragsingh2003@gmail.com        | department | library              |
| prachiagarwal211@gmail.com         | department | accounts_department  |
| anurag.22bcom1367@jecrcu.edu.in    | department | school_hod           |
```

### Check Department Email Addresses

```sql
SELECT 
    name,
    display_name,
    email,
    display_order
FROM departments
ORDER BY display_order;
```

**Expected Key Departments:**
```
| name                | display_name           | email                              |
|---------------------|------------------------|------------------------------------|
| library             | Library                | 15anuragsingh2003@gmail.com        |
| accounts_department | Accounts Department    | prachiagarwal211@gmail.com         |
| school_hod          | School (HOD/Dept)      | anurag.22bcom1367@jecrcu.edu.in    |
```

### Check Form and Status Records

```sql
SELECT 
    f.registration_no,
    f.student_name,
    f.status as form_status,
    COUNT(s.id) as total_dept_statuses,
    COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_count
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON f.id = s.form_id
GROUP BY f.id, f.registration_no, f.student_name, f.status
ORDER BY f.created_at DESC;
```

---

## 🔐 SECURITY RECOMMENDATIONS

1. **Change Default Passwords**:
   - After first login, all users should change their password
   - Use strong passwords (min 12 characters, mixed case, numbers, symbols)

2. **Enable Two-Factor Authentication**:
   - Configure in Supabase Dashboard if available
   - Require 2FA for admin accounts

3. **Review Access Logs**:
   ```sql
   SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 50;
   ```

4. **Regular Security Audits**:
   - Review user permissions monthly
   - Disable inactive accounts
   - Monitor for suspicious activity

5. **Email Security**:
   - Use official college email addresses for staff
   - Verify email ownership before account creation
   - Enable email verification for new accounts

---

## 📞 SUPPORT

If you encounter issues not covered in this guide:

1. **Check Logs**:
   - Browser Console (F12 → Console)
   - Supabase Dashboard → Logs
   - Server logs if running locally

2. **Verify Database**:
   - Run verification queries above
   - Check table structure
   - Verify triggers are working

3. **Test API Endpoints**:
   - Test `/api/auth/me`
   - Test `/api/staff/dashboard`
   - Check API logs in Supabase

---

## ✅ SUCCESS CHECKLIST

- [ ] Database setup completed (`FINAL_COMPLETE_DATABASE_SETUP.sql`)
- [ ] All 4 staff accounts created (`create-all-staff-accounts.js`)
- [ ] Department emails updated (`update-department-emails.sql`)
- [ ] Admin can login and see dashboard
- [ ] Library staff can login and see their forms
- [ ] Accounts staff can login and see their forms
- [ ] School HOD can login and see their forms
- [ ] Student form submission creates 11 department statuses
- [ ] Each staff member can approve their department only
- [ ] Admin can approve any department
- [ ] Email notifications configured and working
- [ ] Form status updates correctly when all approve
- [ ] Certificate generation works when completed
- [ ] All passwords changed from default

---

## 🎉 READY FOR PRODUCTION!

Once all items in the checklist are complete, your system is ready for:

- ✅ Staff onboarding
- ✅ Student form submissions
- ✅ Department clearance workflow
- ✅ Certificate generation
- ✅ Email notifications
- ✅ Realtime dashboard updates

Your JECRC No Dues System is now fully operational! 🚀