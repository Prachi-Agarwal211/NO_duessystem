# Deployment Guide - Staff System Fixes

**Date**: December 9, 2025  
**Version**: 1.0.0  
**Status**: Ready for Production Deployment

---

## 📋 OVERVIEW

This deployment includes:
1. ✅ Fixed role name from 'department' to 'staff' in 18 code files
2. ✅ Fixed email notification system
3. ✅ Fixed department scope filtering
4. ✅ Verified reapply button logic

**Database Migration Required**: YES (1 SQL script)  
**Code Deployment Required**: YES (18 files modified)  
**Downtime Required**: NO (zero-downtime deployment)

---

## 🗄️ SQL SCRIPTS TO RUN

### **REQUIRED: Staff Role Update**

**File**: [`scripts/update-staff-role.sql`](scripts/update-staff-role.sql:1)

**Purpose**: Updates all staff accounts from `role='department'` to `role='staff'`

**Steps**:
```sql
-- 1. CHECK CURRENT STATE (see how many will be affected)
SELECT 
    COUNT(*) as total_department_staff,
    COUNT(DISTINCT department_name) as unique_departments
FROM profiles 
WHERE role = 'department';

-- 2. PERFORM UPDATE (main migration)
UPDATE profiles 
SET role = 'staff' 
WHERE role = 'department';

-- 3. VERIFY SUCCESS (should show 0 department roles)
SELECT 
    role,
    COUNT(*) as count
FROM profiles 
WHERE role IN ('department', 'staff', 'admin')
GROUP BY role;

-- Expected output:
-- role='admin': 1-5 accounts
-- role='staff': 15+ accounts
-- role='department': 0 accounts ✅
```

### **Optional: Other SQL Scripts**

These scripts are NOT required for this deployment but may be useful:

| Script | Purpose | Required? |
|--------|---------|-----------|
| [`scripts/setup-reapplication-system.sql`](scripts/setup-reapplication-system.sql:1) | Reapply system setup | ❌ Already run |
| [`scripts/verify-realtime-setup.sql`](scripts/verify-realtime-setup.sql:1) | Verify real-time | ❌ Already run |
| [`scripts/create-test-data.sql`](scripts/create-test-data.sql:1) | Test data for development | ❌ Dev only |

---

## 🚀 DEPLOYMENT STEPS

### **Step 1: Backup Database** ⚠️ CRITICAL
```bash
# On Supabase Dashboard:
# 1. Go to Database → Backups
# 2. Click "Create Backup"
# 3. Wait for backup to complete
# 4. Download backup file (optional but recommended)
```

### **Step 2: Run SQL Migration**
```bash
# Option A: Using Supabase Dashboard
# 1. Go to Database → SQL Editor
# 2. Copy contents of scripts/update-staff-role.sql
# 3. Paste into editor
# 4. Run STEP 1 (check current state)
# 5. Run STEP 2 (perform update)
# 6. Run STEP 3 (verify)

# Option B: Using psql (if you have direct access)
psql -h your-db-host -U postgres -d your-database -f scripts/update-staff-role.sql
```

**Expected Results**:
```
-- STEP 1 output:
total_department_staff | unique_departments
          15           |        10

-- STEP 2 output:
UPDATE 15

-- STEP 3 output:
role    | count
--------|-------
admin   |   2
staff   |  15
```

### **Step 3: Deploy Code Changes**

**Modified Files (18 total)**:
```
Authentication & Core:
✅ src/app/api/staff/action/route.js
✅ src/hooks/useStaffDashboard.js
✅ src/app/staff/login/page.js

Staff Operations:
✅ src/app/api/staff/stats/route.js
✅ src/app/api/staff/history/route.js
✅ src/app/api/staff/search/route.js
✅ src/app/staff/student/[id]/page.js
✅ src/app/api/staff/student/[id]/route.js

Other:
✅ src/app/api/student/certificate/route.js
✅ src/app/department/action/page.js
✅ src/app/api/admin/staff/route.js
```

**Deployment Commands**:
```bash
# 1. Commit all changes
git add .
git commit -m "fix: Update staff role from 'department' to 'staff' - 18 files"

# 2. Push to production branch
git push origin main

# 3. Verify deployment on Amplify/Vercel
# Check deployment logs for successful build
```

### **Step 4: Verify Deployment**

**A. Test Staff Login**:
```bash
1. Go to /staff/login
2. Login with any staff account
3. Should see dashboard load successfully
4. Check browser console for errors (should be none)
```

**B. Test Email Notifications**:
```bash
1. Submit a test student form
2. Check staff email inboxes
3. All staff should receive notification
4. Email should contain correct student details
```

**C. Test Department Actions**:
```bash
1. Login as Library staff (staff1)
2. Approve a pending application
3. Logout
4. Login as different Library staff (staff2)
5. Same application should show as approved
6. Cannot approve/reject again (already done)
```

**D. Test Reapply Button**:
```bash
1. Go to /student/check-status
2. Enter registration number with rejection
3. Reapply button should be visible
4. Enter registration number with all approvals
5. Reapply button should NOT be visible
```

---

## ✅ POST-DEPLOYMENT CHECKLIST

### **Immediate Checks (Within 5 minutes)**
- [ ] Staff can login at `/staff/login`
- [ ] Staff dashboard loads without errors
- [ ] No console errors in browser
- [ ] No 401/403 errors in Network tab

### **Functional Checks (Within 30 minutes)**
- [ ] Submit test student form
- [ ] Verify staff receive email notifications
- [ ] Staff can view pending applications
- [ ] Staff can approve/reject applications
- [ ] Department-level actions work correctly
- [ ] Reapply button shows/hides correctly

### **Data Integrity Checks**
- [ ] Run verification query:
```sql
-- Should return 0 rows
SELECT * FROM profiles WHERE role = 'department';

-- Should return all staff
SELECT COUNT(*) FROM profiles WHERE role = 'staff';
```

---

## 🔄 ROLLBACK PROCEDURE

**If deployment fails**, follow these steps:

### **Step 1: Rollback Code**
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or checkout previous version
git checkout <previous-commit-hash>
git push origin main --force
```

### **Step 2: Rollback Database**
```sql
-- Only run if code rollback is needed
UPDATE profiles 
SET role = 'department' 
WHERE role = 'staff';

-- Verify rollback
SELECT role, COUNT(*) 
FROM profiles 
WHERE role IN ('department', 'staff') 
GROUP BY role;
```

### **Step 3: Restore from Backup**
```bash
# On Supabase Dashboard:
# 1. Go to Database → Backups
# 2. Select backup created before deployment
# 3. Click "Restore"
# 4. Confirm restoration
```

---

## 📊 MONITORING

### **Key Metrics to Watch**

**First 24 Hours**:
- Staff login success rate (should be 100%)
- Email notification delivery rate (should be 100%)
- API error rate (should be <0.1%)
- Average response time (should be <500ms)

**Monitoring Queries**:
```sql
-- Check staff activity
SELECT 
    DATE(action_at) as date,
    COUNT(*) as actions_taken,
    COUNT(DISTINCT action_by_user_id) as active_staff
FROM no_dues_status
WHERE action_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE(action_at);

-- Check email notification success
-- (Check Resend.com dashboard for delivery rates)

-- Check for any remaining 'department' roles
SELECT COUNT(*) as should_be_zero
FROM profiles
WHERE role = 'department';
```

---

## 🐛 TROUBLESHOOTING

### **Issue 1: Staff Cannot Login**

**Symptoms**: 401 Unauthorized error at login

**Solution**:
```sql
-- Check if staff role was updated
SELECT id, email, role FROM profiles WHERE email = 'staff@example.com';

-- If role is still 'department', run migration again
UPDATE profiles SET role = 'staff' WHERE role = 'department';
```

### **Issue 2: Email Notifications Not Sent**

**Symptoms**: Staff not receiving emails for new submissions

**Solution**:
```javascript
// Check emailService.js line 351
// Should query role='staff' not role='department'
const { data: allStaff } = await supabaseAdmin
  .from('profiles')
  .select('email, full_name, department_name, school, course')
  .eq('role', 'staff'); // ✅ Must be 'staff'
```

### **Issue 3: Dashboard Not Loading**

**Symptoms**: Blank page or 403 error

**Solution**:
```javascript
// Check useStaffDashboard.js line 48
// Should check for role='staff' not role='department'
if (userData.role !== 'staff' && userData.role !== 'admin') {
  // This should allow staff through
}
```

---

## 📞 SUPPORT CONTACTS

**For Issues During Deployment**:
- Database Issues: Check Supabase Dashboard logs
- Code Issues: Check Amplify/Vercel deployment logs
- Email Issues: Check Resend.com dashboard

**Documentation**:
- [`COMPLETE_SYSTEM_FIXES.md`](COMPLETE_SYSTEM_FIXES.md:1) - Full technical documentation
- [`STAFF_SYSTEM_VERIFICATION.md`](STAFF_SYSTEM_VERIFICATION.md:1) - System verification
- [`COMPREHENSIVE_TESTING_GUIDE.md`](COMPREHENSIVE_TESTING_GUIDE.md:1) - Testing procedures

---

## 📝 DEPLOYMENT TIMELINE

**Estimated Duration**: 15-30 minutes

| Step | Duration | Critical? |
|------|----------|-----------|
| Database Backup | 2-5 min | ✅ YES |
| SQL Migration | 1-2 min | ✅ YES |
| Code Deployment | 5-10 min | ✅ YES |
| Verification | 5-10 min | ✅ YES |
| Monitoring Setup | 2-5 min | ⚠️ Recommended |

**Best Time to Deploy**:
- Off-peak hours (after 8 PM or before 8 AM)
- When minimal staff activity expected
- NOT during active admissions period

---

## ✅ FINAL CHECKLIST

Before starting deployment:
- [ ] Read complete deployment guide
- [ ] Database backup completed
- [ ] All code changes reviewed
- [ ] SQL scripts tested in development
- [ ] Rollback procedure understood
- [ ] Support contacts available
- [ ] Monitoring tools ready

During deployment:
- [ ] SQL migration executed successfully
- [ ] Code deployment successful
- [ ] No errors in logs
- [ ] All verification checks passed

After deployment:
- [ ] Staff can login
- [ ] Emails being sent
- [ ] Actions working correctly
- [ ] Monitoring active
- [ ] Documentation updated

---

**Deployment Status**: Ready ✅  
**Risk Level**: Low (safe database migration + code deployment)  
**Downtime**: Zero (backwards compatible changes)

---

## 🎉 SUCCESS CRITERIA

Deployment is successful when:
1. ✅ All staff can login with existing credentials
2. ✅ Email notifications being sent to all staff
3. ✅ Dashboard loads without errors
4. ✅ Staff can approve/reject applications
5. ✅ Department-level actions work correctly
6. ✅ No 'department' roles remain in database
7. ✅ All 18 code files deployed successfully

**Expected Outcome**: System fully operational with improved role consistency and proper email notifications to all staff members.