# Complete System Audit & Fix Guide
## JECRC No Dues System - All Issues Identified

---

## 🚨 CRITICAL ISSUE: RLS Policy Blocking Trigger

### Root Cause
The `trigger_create_department_statuses` trigger runs **without authentication context** (`auth.uid()` is NULL), but the RLS INSERT policy requires authenticated staff/admin users. This blocks the trigger from creating department status records.

### Impact
- Forms submit successfully
- **0 department status records created**
- UI shows incorrect "approved" message (because it merges 12 departments with 0 statuses)
- Staff dashboard has no forms to approve
- System appears "broken"

### The Fix
**File: `FIX_TRIGGER_RLS_ISSUE.sql`** - Already created

This SQL script:
1. Drops restrictive INSERT policy
2. Creates new policy allowing both authenticated users AND triggers (`auth.uid() IS NULL`)
3. Backfills missing department records for all existing forms

---

## System Architecture Flow

### 1. **Form Submission Flow**
```
Student submits form
  ↓
POST /api/student
  ↓
Insert into no_dues_forms (status='pending')
  ↓
Trigger: trigger_create_department_statuses fires
  ↓
[BLOCKED BY RLS] ❌ Should insert 12 records into no_dues_status
  ↓
Form exists with 0 department records
```

### 2. **Status Check Flow**
```
Student checks status
  ↓
StatusTracker.jsx fetches data
  ↓
Query: no_dues_forms + no_dues_status
  ↓
Merge: 12 departments (from dept table) + 0 statuses (empty)
  ↓
Creates 12 items with status='pending' (default)
  ↓
UI logic: approvedCount = 0, totalCount = 12
  ↓
Should show "0/12 approved" ✅
```

**Question**: Why does UI show "approved" if approvedCount should be 0?

### 3. **Staff Login Flow**
```
POST credentials
  ↓
Supabase auth.signInWithPassword()
  ↓
Fetch profile from profiles table
  ↓
Verify role = 'department' or 'admin'
  ↓
Redirect to /staff/dashboard or /admin
```

**Potential Issues**:
- Profile doesn't exist → "User profile not found"
- Profile role mismatch → "Access denied"

### 4. **Staff Dashboard Flow**
```
GET /api/staff/dashboard
  ↓
Query forms WHERE department_name = user's department
  ↓
[PROBLEM] Returns forms but they have 0 department_status records
  ↓
Dashboard shows empty or errors
```

---

## All Files That Need Database Access

### API Routes
1. ✅ `/api/student/route.js` - Form submission (working)
2. ✅ `/api/staff/dashboard/route.js` - Dashboard data (fixed for NULL forms)
3. ✅ `/api/staff/action/route.js` - Approve/reject (has status update logic)
4. ✅ `/api/staff/stats/route.js` - Statistics
5. ✅ `/api/staff/search/route.js` - Search forms
6. ✅ `/api/staff/student/[id]/route.js` - Single student details
7. ✅ `/api/admin/dashboard/route.js` - Admin dashboard
8. ✅ `/api/admin/stats/route.js` - Admin statistics (fixed)
9. ✅ `/api/admin/reports/route.js` - Reports
10. ✅ `/api/certificate/generate/route.js` - Certificate generation (fixed)

### Components
1. ✅ `StatusTracker.jsx` - Fetches form + statuses (handles empty statuses)
2. ✅ `AdminDashboard.jsx` - Admin view (fixed filters)
3. `StaffDashboard.jsx` - Staff view (need to check)

---

## Required Actions

### IMMEDIATE (Critical Path)

1. **Run `FIX_TRIGGER_RLS_ISSUE.sql`**
   - Fixes RLS policy
   - Backfills all existing forms with department records
   - **This is the #1 blocker**

2. **Verify Fix Worked**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT 
       f.registration_no,
       COUNT(nds.id) as dept_records
   FROM no_dues_forms f
   LEFT JOIN no_dues_status nds ON f.id = nds.form_id
   GROUP BY f.id, f.registration_no
   ORDER BY f.created_at DESC;
   ```
   - Every form should have 12 department records

3. **Test Form Submission**
   - Submit new form
   - Check that 12 department records are auto-created
   - Verify status page shows "0/12 approved"

4. **Test Staff Login**
   - Login with department credentials
   - Dashboard should load
   - Should see pending forms

### SECONDARY (If Issues Persist)

5. **Check User Profiles**
   ```sql
   SELECT id, email, full_name, role, department_name
   FROM profiles
   ORDER BY created_at DESC;
   ```
   - Verify staff users exist
   - Verify roles are correct ('department' or 'admin')
   - Verify department_name matches departments table

6. **Verify Departments Table**
   ```sql
   SELECT * FROM departments ORDER BY display_order;
   ```
   - Should have exactly 12 departments
   - Names should be lowercase ('library', 'accounts', etc.)

---

## Debugging Checklist

### If Login Fails
- [ ] User exists in Supabase Auth
- [ ] Profile exists in profiles table
- [ ] Profile.role = 'department' or 'admin'
- [ ] Check browser console for errors

### If Dashboard Empty/Broken
- [ ] Department records exist for forms
- [ ] RLS policies allow reading
- [ ] API route returns data (check Network tab)

### If "Approved" Shows Immediately
- [ ] Check browser console: `console.log(statusData)`
- [ ] Verify department records in database
- [ ] Check if old cached data exists

### If Can't Approve/Reject
- [ ] Staff logged in with correct role
- [ ] Department name matches
- [ ] API route `/api/staff/action` working
- [ ] Check Network tab for errors

---

## SQL Scripts Summary

1. **`FIX_TRIGGER_RLS_ISSUE.sql`** ⭐ **RUN THIS FIRST**
   - Fixes RLS blocking trigger
   - Backfills missing records

2. **`CHECK_DEPARTMENT_STATUSES.sql`**
   - Diagnostic to see current state

3. **`MASTER_SCHEMA.sql`**
   - Complete database reset (nuclear option)
   - Only use if nothing else works

---

## Expected System State After Fix

### Database
- All forms have 12 department status records (all 'pending')
- New forms auto-create 12 records via trigger
- RLS policies allow trigger to INSERT

### UI
- Student status page shows "0/12 approved"
- Progress bar at 0%
- All 12 departments listed as "pending"

### Staff
- Can login successfully
- Dashboard shows pending forms
- Can approve/reject
- Status updates reflect in database and UI

---

## If Everything Is Still Broken

**Last Resort: Complete Database Reset**

1. Backup current form data (if needed):
   ```sql
   COPY no_dues_forms TO '/tmp/forms_backup.csv' CSV HEADER;
   ```

2. Run `MASTER_SCHEMA.sql`
   - Drops everything
   - Recreates from scratch
   - Fresh start

3. Recreate users in Supabase Auth Dashboard

4. Test fresh submission

---

## Contact Points

If specific errors occur, check:
- Browser console (F12 → Console tab)
- Network tab (F12 → Network tab) for API errors  
- Supabase logs for database errors
- Terminal logs for server-side errors

Provide specific error messages for targeted fixes.