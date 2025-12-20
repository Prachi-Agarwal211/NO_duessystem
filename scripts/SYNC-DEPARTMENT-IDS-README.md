# Department ID Synchronization Fix

## Problem Description

The No Dues System had a critical synchronization issue where department staff couldn't see submitted forms in their dashboards. This occurred because:

1. The `profiles` table stores `department_name` as TEXT (e.g., "library", "accounts", "school_hod")
2. The `departments` table uses `id` (UUID) as the primary key with `name` as a unique text field
3. The `profiles.assigned_department_ids` field (UUID array) was not being populated during account creation
4. The staff dashboard queries use `assigned_department_ids` to fetch department information

**Result**: Staff members had `department_name` set but `assigned_department_ids` was NULL or empty, causing dashboard queries to return zero results.

## Solution Overview

This fix ensures proper synchronization between `department_name` and `assigned_department_ids` in three ways:

1. **SQL Migration** - Syncs existing profiles
2. **Script Updates** - Fixes future account creation
3. **API Updates** - Ensures admin interface creates proper assignments

## Files Changed

### 1. SQL Migration Script
- **File**: `scripts/sync-department-ids.sql`
- **Purpose**: One-time migration to sync existing profiles
- **Actions**:
  - Updates `assigned_department_ids` based on `department_name`
  - Creates performance index on `assigned_department_ids`
  - Provides verification queries

### 2. HOD Account Creation Script
- **File**: `scripts/create-all-hod-accounts.js`
- **Changes**:
  - Now fetches department UUID from `departments` table
  - Populates `assigned_department_ids` with department UUID
  - Ensures proper mapping during account creation

### 3. Admin Staff API
- **File**: `src/app/api/admin/staff/route.js`
- **Changes**:
  - POST endpoint now populates `assigned_department_ids` on creation
  - PUT endpoint syncs `assigned_department_ids` when `department_name` changes
  - Ensures admin UI creates properly synced accounts

### 4. Migration Runner Script
- **File**: `scripts/sync-department-ids-runner.js`
- **Purpose**: Node.js script to execute the migration with detailed logging
- **Features**:
  - Analyzes current state
  - Syncs missing assignments
  - Provides detailed progress and error reporting
  - Verifies results

## How to Apply the Fix

### Step 1: Run the Migration Script

```bash
# Run the Node.js migration runner
node scripts/sync-department-ids-runner.js
```

This will:
- ✅ Identify all profiles with missing `assigned_department_ids`
- ✅ Look up department UUIDs from `departments` table
- ✅ Update `assigned_department_ids` for each profile
- ✅ Verify the sync was successful
- ✅ Provide detailed statistics

### Step 2: Verify the Fix

After running the migration, verify using these queries:

```sql
-- Check all department staff have assignments
SELECT 
    email,
    department_name,
    assigned_department_ids
FROM profiles
WHERE role = 'department'
AND (assigned_department_ids IS NULL OR assigned_department_ids = '{}');

-- Should return 0 rows if fix is complete

-- View synced data with department names
SELECT 
    p.email,
    p.department_name,
    p.assigned_department_ids,
    d.display_name
FROM profiles p
LEFT JOIN departments d ON d.id = ANY(p.assigned_department_ids)
WHERE p.role = 'department'
ORDER BY p.email;
```

### Step 3: Test Department Dashboards

1. Login as a department staff member
2. Navigate to their dashboard
3. Verify they can now see pending forms
4. Check that stats show correct counts

## Expected Results

After applying this fix:

✅ **All existing department staff** will have `assigned_department_ids` populated
✅ **New staff accounts** (via script or admin UI) will have proper assignments
✅ **Department dashboards** will show submitted forms
✅ **Stats** will display correct pending/approved/rejected counts
✅ **Performance** improved with new GIN index on `assigned_department_ids`

## Technical Details

### Database Schema

```sql
-- profiles table structure
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('department', 'admin')),
  department_name text,  -- Legacy text field
  assigned_department_ids uuid[],  -- New array field (synced with departments.id)
  school_ids uuid[],
  course_ids uuid[],
  branch_ids uuid[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- departments table structure
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,  -- e.g., "library", "accounts", "school_hod"
  display_name text NOT NULL,  -- e.g., "Library Department"
  email text,
  display_order integer NOT NULL,
  is_school_specific boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Query Flow

1. **Staff Login** → Get user ID from auth
2. **Fetch Profile** → Get `assigned_department_ids` from profiles
3. **Get Departments** → Join with departments table to get department names
4. **Query Forms** → Filter `no_dues_status` by department names
5. **Apply Scoping** → Filter by `school_ids`, `course_ids`, `branch_ids`

### Performance Impact

- **Before**: Dashboard queries failing silently (0 results)
- **After**: Proper results with GIN index for array queries
- **Index**: `CREATE INDEX idx_profiles_assigned_departments ON profiles USING GIN (assigned_department_ids)`

## Troubleshooting

### Issue: Migration script shows "Department not found"

**Cause**: Profile has a `department_name` that doesn't exist in `departments` table

**Solution**: 
1. Check the department name spelling
2. Add the department to the `departments` table if missing
3. Re-run the migration script

### Issue: Dashboard still shows 0 forms after fix

**Possible Causes**:
1. No forms submitted for that department yet
2. Staff member's `school_ids`/`course_ids`/`branch_ids` don't match any forms
3. Forms exist but in different schools/courses

**Debug Steps**:
```sql
-- Check staff scoping
SELECT email, department_name, assigned_department_ids, school_ids, course_ids, branch_ids
FROM profiles WHERE email = 'staff@example.com';

-- Check forms in no_dues_status
SELECT department_name, COUNT(*) as pending_count
FROM no_dues_status
WHERE status = 'pending'
GROUP BY department_name;
```

### Issue: New accounts still missing assignments

**Cause**: Not using updated scripts/API

**Solution**: Ensure you're using the updated files:
- `scripts/create-all-hod-accounts.js` (updated)
- `src/app/api/admin/staff/route.js` (updated)

## Maintenance

### For Future Account Creation

Always ensure `assigned_department_ids` is populated when creating staff accounts:

```javascript
// When creating a staff profile
const { data: dept } = await supabase
  .from('departments')
  .select('id')
  .eq('name', departmentName)
  .single();

await supabase.from('profiles').insert({
  // ... other fields
  department_name: departmentName,
  assigned_department_ids: [dept.id]  // CRITICAL!
});
```

### Periodic Verification

Run this query monthly to ensure no profiles are missing assignments:

```sql
SELECT COUNT(*) as missing_assignments
FROM profiles
WHERE role = 'department'
AND (assigned_department_ids IS NULL OR assigned_department_ids = '{}');
```

Should return `0`.

## Related Files

- Dashboard API: `src/app/api/staff/dashboard/route.js`
- Department Action API: `src/app/api/department-action/route.js`
- Admin Config API: `src/app/api/admin/config/departments/route.js`

## Questions?

If you encounter issues not covered here:
1. Check the migration script output for specific errors
2. Verify database connectivity
3. Ensure all environment variables are set correctly
4. Check Supabase logs for any RLS policy issues