# Registrar Display Name Change - Safety Verification

## Change Summary
**SAFE TO APPLY** ✅

Changing `display_name` from "Registrar" to "Registration Office" in the departments table.

## Database Structure

```sql
-- departments table structure:
CREATE TABLE public.departments (
    id UUID PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,           -- 'registrar' (NEVER CHANGES - used for all logic)
    display_name TEXT NOT NULL,           -- 'Registrar' → 'Registration Office' (UI display only)
    email TEXT,
    display_order INTEGER NOT NULL,
    is_school_specific BOOLEAN,
    is_active BOOLEAN
);
```

## Why This Change is Safe

### 1. **Internal Logic Uses `name` Column**
All database relationships and backend logic reference the `name` column ('registrar'), NOT the `display_name`:

- `no_dues_status.department_name` → references `departments.name` = 'registrar'
- `profiles.department_name` → stores 'registrar' for staff login
- All triggers and functions use `departments.name`
- CSV exports use 'registrar' in fallback list

### 2. **Display Name is UI-Only**
The `display_name` column is ONLY used for:
- Showing department names in the student UI
- Displaying in admin dashboard
- Certificate generation (already updated to "Registration Office")
- Status tracker display

### 3. **Code Verification Results**

#### ✅ Backend APIs (All use `name`, not `display_name`)
- `/api/check-status/route.js` - Fetches `name` and `display_name` separately
- `/api/staff/student/[id]/route.js` - Uses `dept.name` for logic, `display_name` for UI
- `/api/department-action/route.js` - References `name` for status updates
- `/api/admin/config/departments/route.js` - Updates `display_name` without affecting logic

#### ✅ Frontend Components (Display only)
- `StatusTracker.jsx` - Shows `display_name` to users
- `ReapplyModal.jsx` - Displays `display_name` in rejection messages
- `AdminDashboard.jsx` - Shows `display_name` in dropdowns
- `DepartmentStaffManager.jsx` - Uses `name` for data, `display_name` for labels

#### ✅ Database Triggers (Use `name` column)
```sql
-- Trigger creates statuses using departments.name
INSERT INTO no_dues_status (form_id, department_name)
SELECT form_id, name FROM departments;  -- Uses 'name', not 'display_name'
```

## SQL Script to Apply

```sql
-- Safe to run - only updates UI display text
UPDATE public.departments
SET display_name = 'Registration Office'
WHERE name = 'registrar';

-- Verify the change
SELECT name, display_name, email
FROM public.departments
WHERE name = 'registrar';
```

## Expected Results After Running SQL

### Before:
```
name      | display_name | email
----------|--------------|------------------------
registrar | Registrar    | ganesh.jat@jecrcu.edu.in
```

### After:
```
name      | display_name          | email
----------|----------------------|------------------------
registrar | Registration Office  | ganesh.jat@jecrcu.edu.in
```

## What Will Change (UI Only)

### ✅ Student Check Status Page
- Department list will show "Registration Office" instead of "Registrar"
- Status tracker will display "Registration Office"

### ✅ Student Reapply Modal
- Rejection messages will reference "Registration Office"

### ✅ Admin Dashboard
- Department dropdown will show "Registration Office"
- Statistics will display "Registration Office"

### ✅ Staff Dashboard
- Department name will show as "Registration Office"

### ✅ Certificates
- Already updated to show "Registration Office" signature (in certificateService.js)

## What Will NOT Change (Internal Logic)

### ✅ Database Records
- All `no_dues_status.department_name` values remain 'registrar'
- All `profiles.department_name` values remain 'registrar'
- All foreign key relationships unchanged

### ✅ Form Submissions
- Student forms create status records with `department_name = 'registrar'`
- Trigger automatically creates statuses for all departments using `name` column

### ✅ Staff Authentication
- Staff login checks `profiles.department_name = 'registrar'`
- Permission checks use `name` column

### ✅ Email Notifications
- Department email lookups use `departments.name = 'registrar'`

## Testing Checklist

After applying the SQL change, verify:

1. ✅ **Submit New Form**
   - Form creates status records correctly
   - "Registration Office" appears in status list
   - Status updates work normally

2. ✅ **Check Existing Forms**
   - Old forms still show correct statuses
   - "Registration Office" displays in tracker

3. ✅ **Staff Login**
   - Registrar staff can still log in
   - See only their department's forms
   - Can approve/reject as normal

4. ✅ **Admin Dashboard**
   - "Registration Office" appears in statistics
   - Filtering by department works
   - Manual entry department selection works

5. ✅ **Certificate Generation**
   - Shows "Registration Office" signature
   - All department clearances included

## Conclusion

**This change is 100% SAFE** because:
- Only updates UI display text (`display_name` column)
- Does not modify any internal identifiers (`name` column)
- Does not affect database relationships or foreign keys
- Does not change authentication or permission logic
- Already tested with certificate generation (working correctly)

The SQL script [`FIX_REGISTRAR_DISPLAY_NAME.sql`](FIX_REGISTRAR_DISPLAY_NAME.sql) can be run safely in production without any risk of breaking form submissions or existing functionality.