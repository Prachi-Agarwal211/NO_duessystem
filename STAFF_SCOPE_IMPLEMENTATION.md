# 🎯 Staff Access Scope Implementation Guide

## 📋 Overview

This implementation adds **configurable access scope** to staff accounts, allowing admins to restrict which students each staff member can see based on:
- **Schools** (e.g., Engineering, Management, Law)
- **Courses** (e.g., B.Tech, MBA, BA LLB)
- **Branches** (e.g., CSE, Finance, Corporate Law)

**Key Feature:** Keep existing department-based system intact, just add optional scope filtering.

---

## 🏗️ What Was Changed

### 1. **Database Changes** ✅
**File:** `scripts/add-staff-scope.sql`

**Changes:**
- Added 3 new columns to `profiles` table:
  - `school_ids UUID[]` - Array of school IDs (NULL = all schools)
  - `course_ids UUID[]` - Array of course IDs (NULL = all courses)
  - `branch_ids UUID[]` - Array of branch IDs (NULL = all branches)
- Created GIN indexes for performance
- Added helper function `can_staff_see_form()` for scope checking

**To Apply:**
```sql
-- Run this in Supabase SQL Editor
-- File: scripts/add-staff-scope.sql
```

### 2. **Backend API Changes** ✅

#### **A. Staff Management API** (`src/app/api/admin/staff/route.js`)
**Changes:**
- **GET:** Now returns scope fields (`school_ids`, `course_ids`, `branch_ids`)
- **POST:** Accepts scope fields when creating staff accounts
- **PUT:** Allows updating scope fields
- Empty arrays automatically converted to NULL for "all access"

#### **B. Staff Dashboard API** (`src/app/api/staff/dashboard/route.js`)
**Changes:**
- Fetches staff's scope configuration from profile
- Filters applications by:
  - `school_ids` (if configured)
  - `course_ids` (if configured)
  - `branch_ids` (if configured)
- Maintains backward compatibility with old `school_id` field

### 3. **Frontend Changes** ✅

#### **A. ConfigModal Component** (`src/components/admin/settings/ConfigModal.jsx`)
**New Feature:** `multi-checkbox` field type
- Allows selecting multiple options with checkboxes
- Includes "Select All" and "Clear All" buttons
- Scrollable list for many options
- Shows placeholder when no options available

#### **B. DepartmentStaffManager** (`src/components/admin/settings/DepartmentStaffManager.jsx`)
**New Features:**
- Added 3 new scope selection fields (schools, courses, branches)
- Updated table to show "Access Scope" column with visual indicators:
  - 🏫 N school(s) / 🌍 All Schools
  - 📚 N course(s) / 📖 All Courses
  - 🎓 N branch(es) / 🌐 All Branches
- Updated help text with examples

---

## 🚀 How to Deploy

### **Step 1: Run Database Migration**
```bash
# Open Supabase Dashboard → SQL Editor
# Copy and paste contents of scripts/add-staff-scope.sql
# Click "Run"
```

**Verification:**
```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('school_ids', 'course_ids', 'branch_ids');

-- Should return 3 rows
```

### **Step 2: Deploy Code Changes**
```bash
# All changes are already in place
# No additional deployment steps needed
npm run build  # If using production build
```

### **Step 3: Test the Implementation**
See "Testing Guide" section below.

---

## 📚 Usage Examples

### **Example 1: Library Staff (Sees Everyone)**
```
Name: Ms. Priya Sharma
Email: library@jecrc.ac.in
Password: library123
Department: library

Access Scope:
✓ Schools: [Leave empty] → All Schools
✓ Courses: [Leave empty] → All Courses
✓ Branches: [Leave empty] → All Branches

Result: Library staff sees ALL students across all schools/courses/branches
```

### **Example 2: CSE HOD (Branch-Specific)**
```
Name: Dr. Rajesh Kumar
Email: cse.hod@jecrc.ac.in
Password: cse123
Department: school_hod

Access Scope:
✓ Schools: [Engineering]
✓ Courses: [B.Tech, M.Tech]
✓ Branches: [CSE]

Result: HOD sees only Engineering CSE students (B.Tech + M.Tech)
```

### **Example 3: Engineering Dean (School-Wide)**
```
Name: Prof. Amit Sharma
Email: dean.engg@jecrc.ac.in
Password: dean123
Department: school_hod

Access Scope:
✓ Schools: [Engineering]
✓ Courses: [Leave empty] → All Courses
✓ Branches: [Leave empty] → All Branches

Result: Dean sees ALL Engineering students (all courses, all branches)
```

### **Example 4: MBA Finance HOD (Course + Branch Specific)**
```
Name: Dr. Neha Verma
Email: finance.hod@jecrc.ac.in
Password: finance123
Department: school_hod

Access Scope:
✓ Schools: [Management]
✓ Courses: [MBA, BBA]
✓ Branches: [Finance]

Result: HOD sees only Management Finance students (MBA + BBA)
```

---

## 🧪 Testing Guide

### **Test Case 1: Create Library Staff (Full Access)**

1. **Login as Admin**
   - Go to: `/admin`
   - Navigate to: Settings → Staff Accounts

2. **Add New Staff**
   - Click "Add Staff Member"
   - Fill in:
     - Name: "Test Library"
     - Email: "test.library@jecrc.ac.in"
     - Password: "test123"
     - Department: "library"
     - Leave all scope fields empty (Select nothing)
   - Click "Add"

3. **Verify Creation**
   - Staff should appear in table
   - Access Scope column should show:
     - 🌍 All Schools
     - 📖 All Courses
     - 🌐 All Branches

4. **Test Login**
   - Logout from admin
   - Go to: `/staff/login`
   - Login with: test.library@jecrc.ac.in / test123
   - **Expected:** Should see ALL student applications

### **Test Case 2: Create CSE HOD (Restricted Access)**

1. **Configure Schools/Courses/Branches First**
   - Admin → Settings → Schools: Add "Engineering"
   - Admin → Settings → Courses: Add "B.Tech" under Engineering
   - Admin → Settings → Branches: Add "CSE" under B.Tech

2. **Add CSE HOD**
   - Settings → Staff Accounts → Add Staff Member
   - Fill in:
     - Name: "Test CSE HOD"
     - Email: "test.cse@jecrc.ac.in"
     - Password: "cse123"
     - Department: "school_hod"
     - Schools: Check "Engineering"
     - Courses: Check "B.Tech"
     - Branches: Check "CSE"
   - Click "Add"

3. **Verify Creation**
   - Access Scope should show:
     - 🏫 1 school(s)
     - 📚 1 course(s)
     - 🎓 1 branch(es)

4. **Test Filtering**
   - Login as CSE HOD
   - **Expected:** Should ONLY see Engineering B.Tech CSE students
   - **Not See:** MBA students, ECE students, Management students, etc.

### **Test Case 3: Edit Staff Scope**

1. **Update Existing Staff**
   - Find the CSE HOD created above
   - Click "Edit"
   - Add "M.Tech" to courses
   - Click "Update"

2. **Verify Update**
   - Access Scope should now show:
     - 🏫 1 school(s)
     - 📚 2 course(s) ← Changed
     - 🎓 1 branch(es)

3. **Test New Scope**
   - Login as CSE HOD
   - **Expected:** Should see both B.Tech CSE AND M.Tech CSE students

### **Test Case 4: Clear Scope (Convert to Full Access)**

1. **Edit Staff**
   - Select a restricted staff member
   - Click "Edit"
   - Click "Clear All" on all scope fields
   - Click "Update"

2. **Verify**
   - Access Scope should show all "All" indicators
   - Login should show ALL students

---

## 🔍 Verification Checklist

### **Database Verification**
```sql
-- 1. Check columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE '%_ids';
-- Should return: school_ids, course_ids, branch_ids

-- 2. Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename = 'profiles' 
AND indexname LIKE 'idx_profiles_%_ids';
-- Should return 3 indexes

-- 3. Check function exists
SELECT proname FROM pg_proc WHERE proname = 'can_staff_see_form';
-- Should return: can_staff_see_form

-- 4. View current staff scopes
SELECT 
  full_name,
  email,
  department_name,
  COALESCE(array_length(school_ids, 1), 0) as schools_count,
  COALESCE(array_length(course_ids, 1), 0) as courses_count,
  COALESCE(array_length(branch_ids, 1), 0) as branches_count
FROM profiles 
WHERE role = 'department';
```

### **Frontend Verification**
- [ ] Admin Settings → Staff Accounts loads without errors
- [ ] "Add Staff Member" button works
- [ ] Modal shows 3 new scope fields (schools, courses, branches)
- [ ] Multi-checkbox fields show "Select All" and "Clear All" buttons
- [ ] Can select multiple schools/courses/branches
- [ ] Table shows "Access Scope" column with visual indicators
- [ ] Edit functionality works for scope fields
- [ ] Delete still works as expected

### **Backend Verification**
- [ ] GET `/api/admin/staff` returns scope fields
- [ ] POST `/api/admin/staff` accepts scope fields
- [ ] PUT `/api/admin/staff` updates scope fields
- [ ] Empty arrays are stored as NULL
- [ ] Staff dashboard filters correctly by scope

---

## 🐛 Troubleshooting

### **Problem: Scope fields not showing in modal**
**Solution:**
1. Check browser console for errors
2. Verify schools/courses/branches are configured in Settings
3. Clear browser cache and reload

### **Problem: Staff sees all students despite scope**
**Solution:**
1. Check database: `SELECT school_ids, course_ids, branch_ids FROM profiles WHERE email = 'staff@email.com'`
2. Verify scope arrays are not NULL when they should be restricted
3. Check if student forms have school_id, course_id, branch_id set

### **Problem: "Select All" button not working**
**Solution:**
1. Check browser console for JavaScript errors
2. Verify ConfigModal.jsx has the multi-checkbox case
3. Try refreshing the page

### **Problem: Database migration fails**
**Solution:**
1. Check if columns already exist: `\d profiles`
2. If they exist, skip ALTER TABLE commands
3. Run only the missing parts of the migration

---

## 📊 Performance Considerations

### **Indexes**
The implementation includes GIN indexes on array columns:
```sql
CREATE INDEX idx_profiles_school_ids ON profiles USING GIN(school_ids);
CREATE INDEX idx_profiles_course_ids ON profiles USING GIN(course_ids);
CREATE INDEX idx_profiles_branch_ids ON profiles USING GIN(branch_ids);
```

**Why GIN?** GIN (Generalized Inverted Index) is optimized for array operations and `@>` (contains) queries.

### **Query Performance**
- Empty scope (NULL) = No filtering = Fast
- Scope with 1-3 items = Very fast (indexed)
- Scope with many items = Still fast due to GIN index

### **Recommendations**
- Keep scope arrays small (typically 1-5 items)
- Don't assign hundreds of schools to one staff member
- If needed, create separate staff accounts instead

---

## 🔄 Backward Compatibility

### **Old school_id Field**
The system maintains backward compatibility with the old `school_id` field:
```javascript
// In staff/dashboard/route.js
if (profile.school_ids && profile.school_ids.length > 0) {
  query = query.in('no_dues_forms.school_id', profile.school_ids);
} else if (profile.department_name === 'school_hod' && profile.school_id) {
  // Backward compatibility: old school_id field
  query = query.eq('no_dues_forms.school_id', profile.school_id);
}
```

### **Migration Path**
Existing staff accounts will have NULL scope fields, meaning they see ALL students (same behavior as before).

---

## 📝 Future Enhancements

### **Potential Additions:**
1. **Scope Templates:** Pre-defined scope combinations (e.g., "CSE HOD Template")
2. **Scope Inheritance:** Copy scope from another staff member
3. **Bulk Scope Update:** Update scope for multiple staff at once
4. **Scope Visualization:** Show which students a staff member can see before saving
5. **Audit Log:** Track scope changes over time

### **Not Implemented (By Design):**
- ❌ Complex role hierarchy (HOD > Staff > Assistant)
- ❌ Permission levels (view-only, approve, reject)
- ❌ Time-based access (active only during certain periods)
- ❌ Custom department creation (departments are system-critical)

---

## ✅ Implementation Complete!

All components are ready to use. Follow the testing guide above to verify everything works correctly.

### **Quick Start:**
1. Run database migration: `scripts/add-staff-scope.sql`
2. Login as admin
3. Go to Settings → Staff Accounts
4. Create test staff with different scopes
5. Login as each staff to verify filtering

### **Support:**
If you encounter issues, check the Troubleshooting section or review the code comments for detailed explanations.

---

**Last Updated:** 2025-12-02  
**Version:** 1.0.0  
**Status:** ✅ Production Ready