# 🎯 COMPLETE SETUP: Staff Accounts + Email Notifications

## 📋 Staff Accounts to Create

| Email | Password | Role | Department | Purpose |
|-------|----------|------|------------|---------|
| `razorrag.official@gmail.com` | `Test@1234` | Admin | - | Full system access |
| `15anuragsingh2003@gmail.com` | `Test@1234` | Department Staff | Library | Library clearance |
| `prachiagarwal211@gmail.com` | `Test@1234` | Department Staff | Accounts | Accounts clearance |
| `anurag.22bcom1367@jecrcu.edu.in` | `Test@1234` | Department Staff | School HOD | BCA/MCA clearance |

---

## 🚀 SETUP STEPS (In Order)

### Step 1: Setup Database (If Not Done)

```bash
# Open Supabase Dashboard → SQL Editor
# Run: FINAL_COMPLETE_DATABASE_SETUP.sql
# This creates all tables, departments, schools, courses, branches
```

### Step 2: Update Department Email Addresses

```bash
# Open Supabase Dashboard → SQL Editor
# Run: scripts/update-department-notification-emails.sql
# This sets correct email addresses for notifications
```

### Step 3: Create All Staff Accounts

```bash
# From your project directory, run:
node scripts/create-specific-staff-accounts.js
```

**Expected Output**:
```
✅ Successfully Created:
   ✓ razorrag.official@gmail.com
   ✓ 15anuragsingh2003@gmail.com
   ✓ prachiagarwal211@gmail.com
   ✓ anurag.22bcom1367@jecrcu.edu.in
```

### Step 4: Test Email Notifications

1. **Submit a student form**
2. **Check that emails are sent to**:
   - `15anuragsingh2003@gmail.com` (Library)
   - `prachiagarwal211@gmail.com` (Accounts)
   - `anurag.22bcom1367@jecrcu.edu.in` (HOD)
   - All other department emails from the database

---

## 📧 Email Notification Flow

When a student submits a form:

```
Student Submits Form
         ↓
System Creates 11 Department Status Records
         ↓
Email Notifications Sent To:
  - Library: 15anuragsingh2003@gmail.com
  - Accounts: prachiagarwal211@gmail.com
  - School HOD: anurag.22bcom1367@jecrcu.edu.in
  - Other departments: default emails
         ↓
Staff Receive Email with:
  - Student details
  - Registration number
  - Form link to approve/reject
```

---

## 🔐 Login Instructions

### For Admin (razorrag.official@gmail.com)

1. Go to: `/staff/login`
2. Email: `razorrag.official@gmail.com`
3. Password: `Test@1234`
4. Access: Full system dashboard, all forms, all departments

### For Library Staff (15anuragsingh2003@gmail.com)

1. Go to: `/staff/login`
2. Email: `15anuragsingh2003@gmail.com`
3. Password: `Test@1234`
4. Access: Only Library department forms

### For Accounts Staff (prachiagarwal211@gmail.com)

1. Go to: `/staff/login`
2. Email: `prachiagarwal211@gmail.com`
3. Password: `Test@1234`
4. Access: Only Accounts department forms

### For HOD Computer Science (anurag.22bcom1367@jecrcu.edu.in)

1. Go to: `/staff/login`
2. Email: `anurag.22bcom1367@jecrcu.edu.in`
3. Password: `Test@1234`
4. Access: Only School HOD forms (filters BCA/MCA students)

---

## 🎯 How Staff Use the System

### 1. Receive Email Notification
```
Subject: New No Dues Form Submitted - [Student Name]
From: noreply@jecrc.ac.in

Dear Library Staff,

A new no dues form has been submitted and requires your attention.

Student Details:
- Name: [Student Name]
- Registration No: [REG123]
- School: School of Computer Applications
- Course: BCA

Please login to review and take action:
[Link to Form]

Thank you,
JECRC No Dues System
```

### 2. Login to Dashboard
- Click link in email OR
- Go to website → Staff Login
- Enter email and password

### 3. View Form Details
- See student information
- View documents (if uploaded)
- Check other department statuses

### 4. Take Action
- **Approve**: Mark as cleared
- **Reject**: Add reason for rejection
- Form progresses to next department

### 5. Completion
- When all 11 departments approve
- Student gets "Completed" status
- Certificate becomes available

---

## ⚙️ Email Configuration (Already Done in Database)

The system uses these email settings (from `config_emails` table):

```sql
college_domain = 'jecrc.ac.in'
admin_email = 'admin@jecrc.ac.in'
system_email = 'noreply@jecrc.ac.in'
notifications_enabled = 'true'
```

Department email mapping (from `departments` table):

```sql
school_hod              → anurag.22bcom1367@jecrcu.edu.in
library                 → 15anuragsingh2003@gmail.com
it_department           → it@jecrc.ac.in (default)
hostel                  → hostel@jecrc.ac.in (default)
mess                    → mess@jecrc.ac.in (default)
canteen                 → canteen@jecrc.ac.in (default)
tpo                     → tpo@jecrc.ac.in (default)
alumni_association      → alumni@jecrc.ac.in (default)
accounts_department     → prachiagarwal211@gmail.com
jic                     → jic@jecrc.ac.in (default)
student_council         → studentcouncil@jecrc.ac.in (default)
```

---

## 🧪 Testing the Complete Flow

### Test 1: Student Form Submission

1. **Open**: `/student/submit-form`
2. **Fill form**:
   - Registration No: `TEST123`
   - Name: `Test Student`
   - School: `School of Computer Applications`
   - Course: `BCA`
   - Branch: `BCA (General)`
   - Email: `test@example.com`
   - College Email: `test@jecrcu.edu.in`
3. **Submit**

**Expected**:
- ✅ Form submitted successfully
- ✅ 11 department statuses created
- ✅ Email sent to all 11 departments
- ✅ Specifically: Library, Accounts, HOD get emails

### Test 2: Library Staff Action

1. **Login**: `15anuragsingh2003@gmail.com` / `Test@1234`
2. **Dashboard**: See pending forms
3. **Click form**: View details
4. **Action**: Approve or Reject with remarks
5. **Submit**

**Expected**:
- ✅ Library status updated to "Approved"
- ✅ Form still shows "Pending" (waiting for other departments)
- ✅ Other staff can see Library approved

### Test 3: All Departments Approve

1. **Login as Admin**: `razorrag.official@gmail.com`
2. **View form**: See all 11 department statuses
3. **Approve each department**: One by one or bulk
4. **After 11th approval**:

**Expected**:
- ✅ Form status changes to "Completed"
- ✅ Certificate generation button appears
- ✅ Student can download certificate
- ✅ No more actions possible on this form

---

## 🔧 Troubleshooting

### Issue: Staff account creation fails

**Check**:
```bash
# Verify .env.local has correct values
cat .env.local | grep SUPABASE

# Should show:
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

**Solution**: Update .env.local with correct Supabase credentials

### Issue: Email notifications not working

**Check**:
1. Verify email API is configured in `/api/notify/route.js`
2. Check department emails in database:
   ```sql
   SELECT name, email FROM departments ORDER BY display_order;
   ```
3. Test email service separately

**Solution**: 
- Configure email service (SendGrid, Resend, or SMTP)
- Update environment variables with email API keys

### Issue: Staff cannot login

**Check**:
```sql
-- Verify profile exists
SELECT * FROM profiles WHERE email = '15anuragsingh2003@gmail.com';

-- Should show:
-- id, email, full_name, role='department', department_name='library'
```

**Solution**: If profile doesn't exist, run the account creation script again

### Issue: Staff cannot see their department forms

**Check**:
```sql
-- Verify department_name matches
SELECT p.email, p.department_name, d.name 
FROM profiles p
LEFT JOIN departments d ON p.department_name = d.name
WHERE p.role = 'department';
```

**Solution**: Department name in profile MUST match department table exactly

---

## 📊 Department Staff Dashboard Features

### What Each Staff Role Sees:

**Admin** (`razorrag.official@gmail.com`):
- ✅ All forms from all students
- ✅ All 11 department statuses for each form
- ✅ Can approve/reject any department
- ✅ System statistics and analytics
- ✅ Staff management
- ✅ Configuration settings

**Department Staff** (Library, Accounts, HOD):
- ✅ Only forms pending their department action
- ✅ Their department status for each form
- ✅ Can only approve/reject their own department
- ✅ Filter by school/course (for HOD)
- ✅ View history of their actions

---

## 🎓 Best Practices

### For Admin:
1. ✅ Change password after first login
2. ✅ Regularly monitor all department statuses
3. ✅ Follow up with departments having pending forms
4. ✅ Generate reports monthly
5. ✅ Backup database regularly

### For Department Staff:
1. ✅ Check dashboard daily for new forms
2. ✅ Respond to forms within 24-48 hours
3. ✅ Provide clear rejection reasons if rejecting
4. ✅ Contact students if documents are unclear
5. ✅ Keep records of approvals/rejections

### For Students:
1. ✅ Fill form accurately with all details
2. ✅ Use college email (@jecrcu.edu.in)
3. ✅ Upload required documents clearly
4. ✅ Check status regularly after submission
5. ✅ Contact departments if rejected for clarification

---

## 🚀 Quick Command Reference

```bash
# 1. Setup database
# Run in Supabase SQL Editor: FINAL_COMPLETE_DATABASE_SETUP.sql

# 2. Update department emails
# Run in Supabase SQL Editor: scripts/update-department-notification-emails.sql

# 3. Create staff accounts
node scripts/create-specific-staff-accounts.js

# 4. Verify accounts created
# Check Supabase Dashboard → Authentication → Users

# 5. Test login
# Go to your app → /staff/login → Use credentials

# 6. Test form submission
# Go to your app → /student/submit-form → Fill and submit

# 7. Check email notifications
# Check inbox of: 15anuragsingh2003@gmail.com, prachiagarwal211@gmail.com, anurag.22bcom1367@jecrcu.edu.in
```

---

## ✅ FINAL CHECKLIST

Before going live, verify:

- [ ] Database setup complete (FINAL_COMPLETE_DATABASE_SETUP.sql ran successfully)
- [ ] Department emails updated (3 specific emails set)
- [ ] All 4 staff accounts created successfully
- [ ] Admin can login and see dashboard
- [ ] Library staff can login and see their forms
- [ ] Accounts staff can login and see their forms
- [ ] HOD staff can login and see their forms
- [ ] Test form submission works
- [ ] 11 department statuses created automatically
- [ ] Email notifications configured and working
- [ ] All staff receive emails on form submission
- [ ] Staff can approve/reject forms
- [ ] Form status updates correctly after actions
- [ ] Certificate generation works after all approvals
- [ ] No errors in browser console
- [ ] No errors in Supabase logs

---

## 🎉 You're All Set!

Once all checkboxes above are ✅, your system is production-ready with:

- ✅ 1 Admin account with full access
- ✅ 3 Department staff accounts with specific permissions
- ✅ Email notifications to correct staff members
- ✅ Complete workflow from submission to certificate
- ✅ All 200+ branches and 13 schools configured
- ✅ Real-time dashboard updates
- ✅ Secure role-based access control

**Login URLs**:
- Production: https://no-duessystem.vercel.app/staff/login
- Local: http://localhost:3000/staff/login

**Need help?** Check the troubleshooting section or contact support.