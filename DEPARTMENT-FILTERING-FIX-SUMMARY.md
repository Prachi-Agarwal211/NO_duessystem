# Department Filtering & Staff Management Complete Fix

## Overview

This document summarizes all fixes applied to resolve the department synchronization and filtering issues in the JECRC No Dues System.

## Problems Identified

### 1. Department ID Synchronization Issue
**Problem**: The `profiles` table had `department_name` (text) but `assigned_department_ids` (UUID array) was not populated, causing staff dashboards to show zero forms.

**Root Cause**: Account creation scripts and APIs were setting `department_name` but not mapping it to the corresponding department UUID in `assigned_department_ids`.

### 2. Course and Branch Filtering Not Working
**Problem**: Staff members with `course_ids` or `branch_ids` restrictions could still see ALL courses and branches, not just their assigned ones.

**Root Cause**: The staff dashboard query only applied `school_ids` filtering for HODs and completely ignored `course_ids` and `branch_ids` for all staff members.

### 3. No Edit Functionality for Staff Accounts
**Problem**: Admin interface could create and delete staff accounts but had no way to edit existing staff members' details or scope.

**Root Cause**: The staff management UI only implemented CREATE (POST) and DELETE operations, missing UPDATE (PUT) functionality.

## Solutions Implemented

### Fix 1: Department ID Synchronization

#### Files Changed:
1. **`scripts/sync-department-ids.sql`** - SQL migration script
2. **`scripts/sync-department-ids-runner.js`** - Automated sync script
3. **`scripts/create-all-hod-accounts.js`** - Updated account creation
4. **`src/app/api/admin/staff/route.js`** - Updated POST and PUT endpoints
5. **`scripts/SYNC-DEPARTMENT-IDS-README.md`** - Complete documentation

#### Changes Made:

**SQL Migration** (`sync-department-ids.sql`):
```sql
UPDATE public.profiles p
SET assigned_department_ids = ARRAY[d.id]
FROM public.departments d
WHERE p.department_name = d.name
  AND (p.assigned_department_ids IS NULL OR p.assigned_department_ids = '{}');
```

**HOD Account Creation** (Line 377-395):
```javascript
// Get department_id for the department_name (CRITICAL FIX)
const { data: deptData } = await supabase
  .from('departments')
  .select('id')
  .eq('name', hod.department_name)
  .single();

const department_id = deptData.id;

// Create profile with assigned_department_ids
await supabase.from('profiles').insert([{
  // ... other fields
  department_name: hod.department_name,
  assigned_department_ids: [department_id],  // ✅ CRITICAL FIX
  // ... other fields
}]);
```

**Admin Staff API** (Lines 130-142, 167, 222-237):
- POST endpoint now fetches department UUID and populates `assigned_department_ids`
- PUT endpoint syncs `assigned_department_ids` when `department_name` changes

### Fix 2: Course and Branch Filtering

#### File Changed:
**`src/app/api/staff/dashboard/route.js`**

#### Changes Made:

**Before** (Lines 136-139):
```javascript
// Only filtered by school_ids for HODs
if (myDeptNames.includes('school_hod') && profile.school_ids && profile.school_ids.length > 0) {
  query = query.in('no_dues_forms.school_id', profile.school_ids);
}
```

**After** (Lines 134-153):
```javascript
// SCOPE ENFORCEMENT: Apply filtering for ALL staff based on their restrictions

// Filter by schools (if staff has school_ids restriction)
if (profile.school_ids && profile.school_ids.length > 0) {
  console.log('📊 Dashboard Debug - Applying school filter:', profile.school_ids);
  query = query.in('no_dues_forms.school_id', profile.school_ids);
}

// Filter by courses (if staff has course_ids restriction)
if (profile.course_ids && profile.course_ids.length > 0) {
  console.log('📊 Dashboard Debug - Applying course filter:', profile.course_ids);
  query = query.in('no_dues_forms.course_id', profile.course_ids);
}

// Filter by branches (if staff has branch_ids restriction)
if (profile.branch_ids && profile.branch_ids.length > 0) {
  console.log('📊 Dashboard Debug - Applying branch filter:', profile.branch_ids);
  query = query.in('no_dues_forms.branch_id', profile.branch_ids);
}
```

**Applied to 4 queries:**
1. Pending applications query (Line 134)
2. Pending count query (Line 154)
3. Approved count query (Line 171)
4. Rejected count query (Line 188)

### Fix 3: Staff Edit Functionality

#### File Changed:
**`src/app/admin/settings/page.js`**

#### Changes Made:

**Added Edit State** (Line 34):
```javascript
const [editingStaff, setEditingStaff] = useState(null);
```

**Added Update Function** (Lines 334-361):
```javascript
const updateStaff = async (staff) => {
  setLoading(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/staff', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: staff.id,
        full_name: staff.full_name,
        department_name: staff.department_name,
        school_ids: staff.school_ids && staff.school_ids.length > 0 ? staff.school_ids : null,
        course_ids: staff.course_ids && staff.course_ids.length > 0 ? staff.course_ids : null,
        branch_ids: staff.branch_ids && staff.branch_ids.length > 0 ? staff.branch_ids : null
      })
    });
    const json = await res.json();
    if (json.success) {
      toast.success('Staff account updated');
      fetchStaff();
      setEditingStaff(null);
    } else {
      toast.error(json.error);
    }
  } catch (e) {
    toast.error('Update failed');
  } finally {
    setLoading(false);
  }
};
```

**Added Edit UI** (Lines 800-900):
- View mode shows staff details with Edit and Delete buttons
- Edit mode shows inline form with:
  - Full name input
  - Department dropdown
  - School/Course/Branch multi-select checkboxes (using existing MultiSelectCheckbox component)
  - Save and Cancel buttons

## How to Apply All Fixes

### Step 1: Run Department ID Sync
```bash
node scripts/sync-department-ids-runner.js
```

This will:
- ✅ Populate `assigned_department_ids` for all existing staff
- ✅ Show detailed progress and statistics
- ✅ Verify sync was successful

### Step 2: Restart Application
```bash
npm run dev
```

The updated code will now be active with all three fixes.

### Step 3: Verify Fixes

#### Test 1: Department Staff Can See Forms
1. Login as any department staff member
2. Navigate to their dashboard
3. **Expected**: They should now see forms pending in their department
4. **Expected**: Stats should show correct counts

#### Test 2: Course/Branch Filtering Works
1. Create a staff account with specific course/branch restrictions
   - Example: Only BCA and MCA courses
2. Login as that staff member
3. **Expected**: Dashboard only shows students from BCA/MCA courses
4. **Expected**: Forms from other courses (B.Tech, MBA, etc.) are not visible

#### Test 3: Edit Staff Accounts
1. Go to Admin → Settings → Staff Accounts tab
2. Click Edit button on any staff member
3. **Expected**: Inline edit form appears
4. Change their scope (add/remove schools, courses, branches)
5. Click Save
6. **Expected**: Changes are saved and staff member sees updated scope

## Database Schema Reference

### profiles table
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('department', 'admin')),
  department_name text,                    -- Legacy text field (e.g., "library", "school_hod")
  assigned_department_ids uuid[],          -- UUID array mapping to departments.id ✅ NOW SYNCED
  school_ids uuid[],                       -- UUID array mapping to config_schools.id
  course_ids uuid[],                       -- UUID array mapping to config_courses.id
  branch_ids uuid[],                       -- UUID array mapping to config_branches.id
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### no_dues_forms table (relevant fields)
```sql
CREATE TABLE no_dues_forms (
  id uuid PRIMARY KEY,
  registration_no text NOT NULL UNIQUE,
  student_name text NOT NULL,
  school_id uuid NOT NULL,                 -- FK to config_schools.id
  school text NOT NULL,                    -- Denormalized school name
  course_id uuid NOT NULL,                 -- FK to config_courses.id
  course text NOT NULL,                    -- Denormalized course name
  branch_id uuid NOT NULL,                 -- FK to config_branches.id
  branch text NOT NULL,                    -- Denormalized branch name
  -- ... other fields
);
```

## Filtering Logic Flow

### Before Fixes:
```
Staff Login → Get profile → Get departments
             ↓
Query forms: WHERE department_name IN (staff_departments)
             ↓
Apply scope: IF school_hod THEN filter by school_ids ONLY
             ↓
Result: ❌ No course/branch filtering, assigned_department_ids empty
```

### After Fixes:
```
Staff Login → Get profile → Get departments (via assigned_department_ids ✅)
             ↓
Query forms: WHERE department_name IN (staff_departments)
             ↓
Apply scope: 
  - IF school_ids THEN filter by school_ids ✅
  - IF course_ids THEN filter by course_ids ✅
  - IF branch_ids THEN filter by branch_ids ✅
             ↓
Result: ✅ All filtering works correctly
```

## Testing Scenarios

### Scenario 1: HOD with Specific School/Course
**Setup**: Create HOD with:
- School: "School of Engineering & Technology"
- Courses: ["B.Tech", "M.Tech"]
- Branches: Empty (sees all branches)

**Expected Behavior**:
- ✅ Sees only B.Tech and M.Tech students
- ✅ Does NOT see BCA, MBA, Law students
- ✅ Sees all branches within B.Tech/M.Tech

### Scenario 2: Library Staff (No Restrictions)
**Setup**: Create library staff with:
- School: Empty
- Course: Empty
- Branch: Empty

**Expected Behavior**:
- ✅ Sees ALL students from ALL schools/courses/branches
- ✅ No filtering applied

### Scenario 3: Department Staff with Branch Restriction
**Setup**: Create accounts department staff with:
- School: "Jaipur School of Business"
- Courses: ["BBA"]
- Branches: ["Finance", "Marketing"]

**Expected Behavior**:
- ✅ Sees only BBA students
- ✅ Within BBA, only sees Finance and Marketing students
- ✅ Does NOT see BBA students from other branches (HR, IT, etc.)

## Troubleshooting

### Issue: Staff still can't see forms after sync
**Solution**:
1. Verify `assigned_department_ids` is populated:
```sql
SELECT email, department_name, assigned_department_ids
FROM profiles WHERE role = 'department';
```
2. If still empty, run sync script again
3. Check if department exists in `departments` table

### Issue: Filtering too restrictive
**Cause**: Staff has `course_ids` or `branch_ids` set when they should see all

**Solution**:
1. Go to Admin → Settings → Staff Accounts
2. Click Edit on the staff member
3. Clear the restrictive scope (uncheck all courses/branches)
4. Save changes

### Issue: Edit button not working
**Cause**: May need to clear browser cache

**Solution**:
1. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. Or clear browser cache and reload

## Performance Improvements

- **GIN Index** on `assigned_department_ids` for faster array queries
- **Parallel queries** in dashboard (4 queries run simultaneously)
- **Optimized filtering** using PostgreSQL array operations (`= ANY()`, `IN()`)

## Security Considerations

- ✅ All queries use Supabase Admin client to bypass RLS
- ✅ Server-side validation ensures staff can only see their scoped data
- ✅ Frontend edit functionality requires admin authentication
- ✅ UUID-based filtering prevents SQL injection

## Future Enhancements

1. **Bulk Edit**: Edit multiple staff members at once
2. **Import/Export**: CSV import for bulk staff creation
3. **Audit Log**: Track who changed staff scopes and when
4. **Advanced Filters**: Dashboard filters for staff to drill down further

## Related Files

- Dashboard API: [`src/app/api/staff/dashboard/route.js`](src/app/api/staff/dashboard/route.js)
- Admin Staff API: [`src/app/api/admin/staff/route.js`](src/app/api/admin/staff/route.js)
- Admin Settings UI: [`src/app/admin/settings/page.js`](src/app/admin/settings/page.js)
- Migration Script: [`scripts/sync-department-ids-runner.js`](scripts/sync-department-ids-runner.js)
- HOD Creation: [`scripts/create-all-hod-accounts.js`](scripts/create-all-hod-accounts.js)

## Summary

All three major issues have been resolved:

1. ✅ **Department ID Sync**: `assigned_department_ids` now properly populated
2. ✅ **Course/Branch Filtering**: All scope restrictions now enforced correctly
3. ✅ **Staff Edit UI**: Full CRUD operations available in admin interface

Staff members can now:
- See forms in their dashboards
- Only see forms matching their assigned scope
- Have their access scope modified by admins

The system is now fully functional with proper department synchronization and granular access control.