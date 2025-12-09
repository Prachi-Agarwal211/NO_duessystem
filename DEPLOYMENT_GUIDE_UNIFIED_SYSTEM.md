# Deployment Guide - Unified Notification System & Fresh Start

This guide walks you through deploying the unified notification system and setting up a clean production environment.

## 🎯 Overview

You will:
1. Apply the unified notification system changes
2. Clean up all existing test data
3. Set up fresh admin credentials
4. Verify the system is working correctly

## 📋 Prerequisites

- [x] Database backup created
- [x] Supabase admin access
- [x] Environment variables configured
- [x] Node.js installed (for scripts)

## 🚀 Deployment Steps

### Step 1: Apply Unified Notification System Migration

This makes department email optional since we now use staff account emails.

#### Option A: Via Supabase Dashboard (Recommended)

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of [`scripts/unify-notification-system.sql`](scripts/unify-notification-system.sql)
3. Execute the script
4. Verify output shows successful migration

#### Option B: Via Command Line

```bash
psql -h YOUR_DB_HOST -d YOUR_DB_NAME -U YOUR_USER -f scripts/unify-notification-system.sql
```

**Expected Output:**
```
✅ Department email field made nullable
✅ Staff email constraint added
✅ Performance index created
```

---

### Step 2: Clean Up Database (Fresh Start)

⚠️ **WARNING**: This will delete ALL existing data!

#### Via Supabase Dashboard

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of [`scripts/cleanup-database.sql`](scripts/cleanup-database.sql)
3. Review the script carefully
4. Execute the script
5. Review the verification output
6. **Type `COMMIT;`** to apply deletions, or **`ROLLBACK;`** to cancel

#### What Gets Deleted:

- ❌ All student application forms
- ❌ All department status records
- ❌ All reapplication history
- ❌ All user profiles (admin, staff, etc.)
- ❌ All authentication records

#### What Stays:

- ✅ Department configurations
- ✅ School configurations
- ✅ Course configurations
- ✅ Branch configurations
- ✅ System settings

**Verification:**
```sql
-- Should return 0 for all
SELECT 
  (SELECT COUNT(*) FROM no_dues_forms) as forms,
  (SELECT COUNT(*) FROM no_dues_status) as status,
  (SELECT COUNT(*) FROM profiles) as profiles,
  (SELECT COUNT(*) FROM auth.users) as auth_users;
```

---

### Step 3: Clean Up Storage (Optional)

If you have uploaded documents in Supabase Storage:

1. Go to Supabase Dashboard → Storage
2. Open bucket: `student-documents`
3. Select all files
4. Delete

Or use the Supabase API/CLI to bulk delete.

---

### Step 4: Create New Admin Account

#### Interactive Method (Recommended)

```bash
node scripts/create-admin-account.js
```

You'll be prompted for:
- Email address
- Full name
- Password (hidden input)
- Password confirmation

#### Non-Interactive Method

```bash
EMAIL="admin@jecrc.ac.in" PASSWORD="YourSecurePassword123!" node scripts/create-admin-account.js
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════╗
║       Admin Account Created Successfully!              ║
╚════════════════════════════════════════════════════════╝

📋 Account Details:
   Email:     admin@jecrc.ac.in
   Name:      Admin User
   Role:      admin
   User ID:   [UUID]

🔐 Login Credentials:
   Email:     admin@jecrc.ac.in
   Password:  [your password]

🌐 Login URL:
   http://localhost:3000/admin
```

⚠️ **IMPORTANT**: Save these credentials securely!

---

### Step 5: Verify Unified Notification System

Run the test script to verify everything is configured correctly:

```bash
node scripts/test-unified-notifications.js
```

**Expected Output:**
```
🔍 Testing Unified Notification System

📋 TEST 1: Verifying Staff Email Configuration
✅ PASS: All staff members have email addresses

📋 TEST 2: Department Staff Coverage
⚠️  Each department should have at least one staff member
(Initially will show 0 staff - this is normal after cleanup)

📋 TEST 3: Simulating Notification Query
Total email recipients: 0
(Will increase as you add staff)

✅ ALL TESTS PASSED - System ready!
```

---

### Step 6: Add Department Staff Accounts

Now that admin is set up, add staff members:

1. **Login as Admin**
   - Go to: `http://localhost:3000/admin`
   - Use credentials from Step 4

2. **Navigate to Staff Management**
   - Click "Staff Management" in sidebar

3. **Add Staff Members**
   For each department, add at least one staff member:
   
   - Click "Add Staff Member"
   - Fill in:
     - Full Name: `John Doe`
     - Email: `john.doe@jecrc.ac.in` ← **REQUIRED for notifications**
     - Department: Select from dropdown
     - Password: Set initial password
     - School/Course/Branch Scope: (optional filters)
   - Click "Create"

4. **Verify Staff Added**
   ```bash
   node scripts/test-unified-notifications.js
   ```
   
   Should now show staff members for each department.

---

### Step 7: Test End-to-End Flow

#### 7.1 Submit Test Application

1. Go to: `http://localhost:3000/student/submit-form`
2. Fill in student details
3. Submit form
4. **Check**: All staff members should receive email notification

#### 7.2 Verify Staff Dashboard

1. Login as staff member
2. Go to: `http://localhost:3000/staff/dashboard`
3. **Verify**: Can see the submitted application

#### 7.3 Test Approval Flow

1. As staff, approve/reject application
2. **Check**: Form status updates correctly

#### 7.4 Test Reapplication (if rejected)

1. As student, reapply after rejection
2. **Check**: Rejected department staff receive reapplication notification

---

### Step 8: Deploy to Production

Once local testing passes:

#### 8.1 Update Environment Variables

Ensure production environment has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_url
SUPABASE_SERVICE_ROLE_KEY=your_production_key
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@jecrc.ac.in
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

#### 8.2 Deploy Code

```bash
# Commit changes
git add .
git commit -m "feat: Implement unified notification system with fresh setup"

# Push to production
git push origin main

# Or deploy via Vercel/your hosting platform
vercel --prod
```

#### 8.3 Run Migration on Production Database

⚠️ **Create backup first!**

```bash
# Connect to production database
psql -h PROD_HOST -d PROD_DB -U PROD_USER

# Run migration
\i scripts/unify-notification-system.sql

# Optionally clean data (if fresh start needed)
\i scripts/cleanup-database.sql
COMMIT; -- or ROLLBACK;
```

#### 8.4 Create Production Admin

```bash
# Set production environment
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-production-key"

# Create admin
node scripts/create-admin-account.js
```

#### 8.5 Verify Production

```bash
# Test notifications
node scripts/test-unified-notifications.js

# Submit test form through UI
# Check email delivery
```

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Admin can login
- [ ] Admin can access staff management
- [ ] Staff accounts can be created
- [ ] Staff members have emails
- [ ] All departments have at least one staff member
- [ ] Student form submission works
- [ ] Email notifications are sent to ALL staff
- [ ] Staff can view applications in dashboard
- [ ] Staff can approve/reject applications
- [ ] Reapplication notifications work
- [ ] No console errors

---

## 📊 Monitoring

### Check Staff Coverage

```bash
node scripts/test-unified-notifications.js
```

### Check Notification Logs

```sql
-- Check recent forms and notification recipients
SELECT 
  f.id,
  f.registration_no,
  f.student_name,
  f.created_at,
  COUNT(DISTINCT p.id) as staff_notified
FROM no_dues_forms f
CROSS JOIN profiles p
WHERE p.role = 'department' 
  AND p.email IS NOT NULL
  AND f.created_at > NOW() - INTERVAL '24 hours'
GROUP BY f.id, f.registration_no, f.student_name, f.created_at
ORDER BY f.created_at DESC;
```

---

## 🔧 Troubleshooting

### Issue: No Emails Being Sent

**Check:**
1. `RESEND_API_KEY` is set correctly
2. Email service logs for errors
3. Staff accounts have valid email addresses
4. Email domain is verified in Resend

**Fix:**
```bash
node scripts/test-unified-notifications.js
```

### Issue: Department Has No Staff

**Check:**
```sql
SELECT 
  d.name,
  d.display_name,
  COUNT(p.id) as staff_count
FROM departments d
LEFT JOIN profiles p ON p.department_name = d.name AND p.role = 'department'
WHERE d.is_active = true
GROUP BY d.name, d.display_name
HAVING COUNT(p.id) = 0;
```

**Fix:**
Add staff member via Admin Panel → Staff Management

### Issue: Staff Not Receiving Notifications

**Verify Email:**
```sql
SELECT id, full_name, email, department_name 
FROM profiles 
WHERE role = 'department' AND id = 'staff_user_id';
```

**Update Email:**
```sql
UPDATE profiles 
SET email = 'correct@email.com' 
WHERE id = 'staff_user_id';
```

---

## 📚 Related Documentation

- [Unified Notification System Details](UNIFIED_NOTIFICATION_SYSTEM.md)
- [Production Ready Guide](PRODUCTION_READY_GUIDE.md)
- [Security Fixes](SECURITY_FIXES_VERIFIED.md)

---

## ✅ Post-Deployment Tasks

- [ ] Update documentation with production URLs
- [ ] Train admin on staff management
- [ ] Train staff on dashboard usage
- [ ] Set up monitoring/alerts
- [ ] Schedule regular backups
- [ ] Document admin credentials securely

---

## 🆘 Support

If you encounter issues:

1. Check logs in Supabase Dashboard
2. Run test scripts for diagnostics
3. Review error messages in browser console
4. Check email service logs in Resend dashboard

---

**Last Updated**: 2025-12-09  
**System Version**: 2.0.0 (Unified Notifications)  
**Migration Scripts**: ✅ Completed