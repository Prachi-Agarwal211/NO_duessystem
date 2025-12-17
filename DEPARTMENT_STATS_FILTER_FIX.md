# Department Stats API Filter Fix

## Issue
Library and other department staff saw **inconsistent counts** between:
- **Table**: Shows 1 pending request
- **Stats Cards**: Show 0 pending requests

This created confusion where staff could see pending work in the table but stats said there was nothing to do.

## Root Cause

**Inconsistent Filtering Logic Between Two APIs:**

### Dashboard API ([`src/app/api/staff/dashboard/route.js`](src/app/api/staff/dashboard/route.js:158-175))
```javascript
// ONLY applies scope filtering for school_hod
if (profile.department_name === 'school_hod') {
  // Apply school/course/branch filters
}
// For other 9 departments: No filtering - they see ALL students
```

### Stats API ([`src/app/api/staff/stats/route.js`](src/app/api/staff/stats/route.js:154-206))
**BEFORE (BROKEN):**
```javascript
// Applied filtering for ALL departments if they had scope fields set
if (profile.school_ids && profile.school_ids.length > 0) {
  query = query.in('no_dues_forms.school_id', profile.school_ids);
}
// This caused Library staff with scope fields to see 0 stats
```

## The Bug Scenario

1. Library staff profile had `school_ids` or `course_ids` set (even though it shouldn't)
2. **Dashboard API**: Ignored these fields → showed pending request in table
3. **Stats API**: Applied filtering → request didn't match → returned 0
4. Result: Table shows 1 pending, stats show 0 pending ❌

## The Fix

Updated Stats API to match Dashboard API logic:

**AFTER (FIXED):**
```javascript
// ONLY apply scope filtering for school_hod (consistent with dashboard)
if (profile.department_name === 'school_hod') {
  // Apply school/course/branch filters
}
// For other 9 departments: No filtering - they see all students
```

## System Design

**10 Departments with Different Access Patterns:**

1. **school_hod** - HOD/Dean role
   - ✅ **HAS scope filtering** (school/course/branch based)
   - Only sees students from their assigned schools/courses

2. **Other 9 Departments** - Library, Hostel, Transport, Accounts, Academics, Placement, Student Welfare, Placement Cell, Career Development
   - ❌ **NO scope filtering**
   - See ALL students across all schools/courses/branches

## Changes Made

### File: [`src/app/api/staff/stats/route.js`](src/app/api/staff/stats/route.js)

**Lines 154-167 (Personal Actions Query):**
```diff
- // Apply scope filtering for personal actions
- if (profile.school_ids && profile.school_ids.length > 0) {
-   personalQuery = personalQuery.in('no_dues_forms.school_id', profile.school_ids);
- } else if (profile.department_name === 'school_hod' && profile.school_id) {
-   personalQuery = personalQuery.eq('no_dues_forms.school_id', profile.school_id);
- }
+ // IMPORTANT: Apply scope filtering ONLY for school_hod (HOD/Dean)
+ // The other 9 departments see ALL students (consistent with dashboard API)
+ if (profile.department_name === 'school_hod') {
+   // Apply school/course/branch filtering for HOD staff
+   if (profile.school_ids && profile.school_ids.length > 0) {
+     personalQuery = personalQuery.in('no_dues_forms.school_id', profile.school_ids);
+   }
+ }
+ // For other 9 departments: No additional filtering - they see all students
```

**Lines 193-206 (Pending Count Query):**
```diff
- // Apply scope filtering for pending
- if (profile.school_ids && profile.school_ids.length > 0) {
-   pendingQuery = pendingQuery.in('no_dues_forms.school_id', profile.school_ids);
- }
+ // IMPORTANT: Apply scope filtering ONLY for school_hod (HOD/Dean)
+ // The other 9 departments see ALL students (consistent with dashboard API)
+ if (profile.department_name === 'school_hod') {
+   // Apply school/course/branch filtering for HOD staff
+   if (profile.school_ids && profile.school_ids.length > 0) {
+     pendingQuery = pendingQuery.in('no_dues_forms.school_id', profile.school_ids);
+   }
+ }
+ // For other 9 departments: No additional filtering - they see all students
```

## Result After Fix

**Library Staff Dashboard:**
- **Table**: Shows 1 pending request ✅
- **Stats**: Shows 1 pending request ✅
- **Consistent!** 🎉

## Verification

Test each department type:

### HOD Staff (school_hod)
```sql
-- Should only see students from their assigned schools
SELECT COUNT(*) FROM no_dues_status ns
JOIN no_dues_forms f ON ns.form_id = f.id
WHERE ns.department_name = 'school_hod'
  AND ns.status = 'pending'
  AND f.school_id IN (/* their school_ids */);
```

### Library Staff (and other 9 departments)
```sql
-- Should see ALL students regardless of school/course
SELECT COUNT(*) FROM no_dues_status ns
JOIN no_dues_forms f ON ns.form_id = f.id
WHERE ns.department_name = 'library'
  AND ns.status = 'pending'
  AND f.is_manual_entry = false;
-- No school/course/branch filtering!
```

## Why This Design?

**HOD needs scope filtering because:**
- Multiple HODs exist (one per school)
- Each should only manage their own school's students

**Other 9 departments don't need filtering because:**
- Single department handles ALL students
- Library manages books for everyone
- Hostel manages rooms for everyone
- etc.

---
**Status:** ✅ Fixed  
**Date:** 2025-12-17  
**Files Changed:** `src/app/api/staff/stats/route.js`