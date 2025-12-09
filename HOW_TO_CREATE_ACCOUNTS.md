# How to Create Accounts from ACCOUNT_CREDENTIALS.csv

**Important**: The CSV file is just a **REFERENCE DOCUMENT**. It does NOT automatically create accounts in your database.

---

## ✅ CURRENT STATUS

**What You Have**:
- ✅ [`ACCOUNT_CREDENTIALS.csv`](ACCOUNT_CREDENTIALS.csv) - List of 20 accounts to create
- ✅ [`scripts/create-accounts-from-csv.sql`](scripts/create-accounts-from-csv.sql) - SQL script for profiles
- ✅ Updated code supporting multiple staff per department

**What You Need to Do**:
- ⏳ Actually CREATE these accounts in Supabase
- ⏳ Verify they work by logging in

---

## 🚀 STEP-BY-STEP: CREATE ACCOUNTS

### **Method 1: Via Supabase Dashboard (Recommended)**

This is the **easiest** method for creating all accounts.

#### **Step 1: Login to Supabase**
```
1. Go to: https://app.supabase.com
2. Login with your account
3. Select your project: jecrc-no-dues-system
```

#### **Step 2: Create User Accounts (Authentication)**

For **EACH** account in [`ACCOUNT_CREDENTIALS.csv`](ACCOUNT_CREDENTIALS.csv):

```
1. Go to: Authentication → Users
2. Click: "Add User" button
3. Fill in:
   - Email: (from CSV, e.g., admin@jecrc.ac.in)
   - Password: (from CSV, e.g., Admin@123)
   - Auto Confirm User: ✅ YES (enable this)
4. Click: "Create User"
5. Note down the User ID (UUID) - you'll need it

Repeat for all 20 accounts
```

#### **Step 3: Create Profile Records (Profiles Table)**

After creating auth users, create their profiles:

```
1. Go to: Table Editor → profiles
2. Click: "Insert" → "Insert Row"
3. Fill in:
   - id: (paste User ID from auth.users)
   - email: (same as auth email)
   - full_name: (from CSV)
   - role: admin OR staff
   - department_name: (from CSV)
   - school: (only for HOD/Dean, from CSV)
   - course: (only for HOD/Dean, from CSV)
   - branch: (only for HOD/Dean, from CSV)
4. Click: "Save"

Repeat for all 20 accounts
```

---

### **Method 2: Via SQL Script (Faster for Multiple Accounts)**

#### **Step 1: Create Auth Users First**

Unfortunately, you **MUST** create auth users via the Dashboard (see Method 1, Step 2).

Supabase doesn't allow creating auth.users via SQL for security reasons.

#### **Step 2: Run SQL Script for Profiles**

After creating all 20 auth users:

```
1. Go to: SQL Editor in Supabase Dashboard
2. Copy content from: scripts/create-accounts-from-csv.sql
3. Paste into SQL Editor
4. Click: "Run"
5. Check output - should show all 20 profiles created
```

---

### **Method 3: Via Your Admin Panel (After Initial Setup)**

Once you have at least ONE admin account working:

```
1. Login as admin at: /admin
2. Go to: Staff Management section
3. Click: "Add New Staff"
4. Fill in details from CSV
5. Submit
6. Repeat for each staff member

This is the BEST method for ongoing management!
```

---

## 🔍 VERIFY ACCOUNTS WERE CREATED

### **Check in Supabase Dashboard**

```sql
-- Run this query in SQL Editor
SELECT 
  email, 
  full_name, 
  role, 
  department_name,
  school,
  course,
  branch
FROM profiles 
ORDER BY role, department_name, email;
```

**Expected Result**: Should show 20 rows (2 admin + 18 staff)

---

### **Test Login**

**Test Admin Account**:
```
1. Go to: http://localhost:3000/admin (or your deployed URL)
2. Email: admin@jecrc.ac.in
3. Password: Admin@123
4. Should see admin dashboard
```

**Test Your Personal Admin**:
```
1. Go to: http://localhost:3000/admin
2. Email: 15anuragsingh2003@gmail.com
3. Password: Admin@123
4. Should see admin dashboard
```

**Test Staff Account**:
```
1. Go to: http://localhost:3000/staff/login
2. Email: library@jecrcu.edu.in
3. Password: Library@123
4. Should see staff dashboard
```

---

## 📋 QUICK REFERENCE: ACCOUNTS TO CREATE

### **Priority 1: Admin Accounts (Create These First)**

```
Email: admin@jecrc.ac.in
Password: Admin@123
Role: admin
Department: Administration

Email: 15anuragsingh2003@gmail.com
Password: Admin@123
Role: admin
Department: Administration
```

### **Priority 2: Staff Accounts (9 Departments - See All Students)**

```
Email: library@jecrcu.edu.in
Password: Library@123
Role: staff
Department: Library

Email: library2@gmail.com
Password: Library@123
Role: staff
Department: Library

Email: hostel@jecrcu.edu.in
Password: Hostel@123
Role: staff
Department: Hostel

Email: hostel2@gmail.com
Password: Hostel@123
Role: staff
Department: Hostel

Email: accounts@jecrcu.edu.in
Password: Accounts@123
Role: staff
Department: Accounts

Email: accounts2@gmail.com
Password: Accounts@123
Role: staff
Department: Accounts

Email: sports@jecrcu.edu.in
Password: Sports@123
Role: staff
Department: Sports

Email: examination@jecrcu.edu.in
Password: Exam@123
Role: staff
Department: Examination

Email: tpo@jecrcu.edu.in
Password: TPO@123
Role: staff
Department: Training and Placement

Email: scholarship@jecrcu.edu.in
Password: Scholar@123
Role: staff
Department: Scholarship

Email: esd@jecrcu.edu.in
Password: ESD@123
Role: staff
Department: ESD

Email: alumni@jecrcu.edu.in
Password: Alumni@123
Role: staff
Department: Alumni
```

### **Priority 3: HOD/Dean Accounts (Filtered by Scope)**

```
Email: cse.hod@jecrcu.edu.in
Password: HOD@123
Role: staff
Department: Department
School: School of Engineering
Course: B.Tech
Branch: Computer Science

Email: ece.hod@jecrcu.edu.in
Password: HOD@123
Role: staff
Department: Department
School: School of Engineering
Course: B.Tech
Branch: Electronics

Email: civil.hod@jecrcu.edu.in
Password: HOD@123
Role: staff
Department: Department
School: School of Engineering
Course: B.Tech
Branch: Civil

Email: mech.hod@jecrcu.edu.in
Password: HOD@123
Role: staff
Department: Department
School: School of Engineering
Course: B.Tech
Branch: Mechanical

Email: dean.engineering@jecrcu.edu.in
Password: Dean@123
Role: staff
Department: Department
School: School of Engineering
(No course/branch - sees all in school)

Email: dean.commerce@jecrcu.edu.in
Password: Dean@123
Role: staff
Department: Department
School: School of Commerce
(No course/branch - sees all in school)
```

---

## ⚠️ IMPORTANT NOTES

### **About Passwords**
- 📝 These are **DEVELOPMENT** passwords for easy testing
- 🔒 **CHANGE THEM** before going to production
- 🔐 Use strong, unique passwords in production
- 💾 Store securely (password manager recommended)

### **About Email Domains**
- ✅ System supports **ANY** email domain
- ✅ You can use @jecrcu.edu.in, @gmail.com, @yahoo.com, etc.
- ✅ Notice how admin uses @gmail.com - this is intentional
- ✅ All work the same way

### **About Multiple Staff Per Department**
- ✅ Library has 2 staff (library@jecrcu.edu.in + library2@gmail.com)
- ✅ Hostel has 2 staff (hostel@jecrcu.edu.in + hostel2@gmail.com)
- ✅ Accounts has 2 staff (accounts@jecrcu.edu.in + accounts2@gmail.com)
- ✅ When one approves, others see it in HISTORY
- ✅ Department-level actions (not per-staff)

---

## 🐛 TROUBLESHOOTING

### **Problem: Cannot Create User in Supabase Dashboard**

**Solution**:
```
1. Check if user already exists
2. Verify email format is valid
3. Ensure you have admin access to project
4. Try using a different email temporarily
```

### **Problem: Profile Insert Fails**

**Error**: "User ID not found"

**Solution**:
```
1. Make sure auth user was created FIRST
2. Copy exact User ID from auth.users table
3. Use that ID in profiles.id field
```

### **Problem: Cannot Login After Creating Account**

**Checklist**:
```
1. ✅ Auth user created?
2. ✅ Profile record created?
3. ✅ Role is correct? (admin or staff)
4. ✅ Department name matches exactly?
5. ✅ Using correct login URL?
   - Admin: /admin
   - Staff: /staff/login
```

---

## ✅ VERIFICATION CHECKLIST

After creating all accounts:

- [ ] All 20 auth users created in Authentication → Users
- [ ] All 20 profiles created in profiles table
- [ ] Admin login works (admin@jecrc.ac.in)
- [ ] Your admin login works (15anuragsingh2003@gmail.com)
- [ ] Staff login works (test with library@jecrcu.edu.in)
- [ ] Multiple staff works (both library accounts can login)
- [ ] Passwords match CSV file
- [ ] All roles are correct (2 admin, 18 staff)

---

## 🎯 NEXT STEPS AFTER ACCOUNT CREATION

1. **Test the System**:
   - Login as each account type
   - Verify dashboards load
   - Test email notifications
   - Try approve/reject actions

2. **Configure Email Notifications**:
   - Add RESEND_API_KEY to environment
   - Test email sending
   - Verify all staff receive notifications

3. **Production Preparation**:
   - Change all passwords to strong ones
   - Set up 2FA for admin accounts
   - Document emergency access procedures

---

**Status**: 📝 Instructions Ready  
**Next Action**: Create accounts in Supabase following steps above  
**Estimated Time**: 30-45 minutes for all 20 accounts

---

**End of Guide**