# 🚀 Staff Access Scope - Deployment Checklist

## ⚡ Quick Deployment Guide

Follow these steps in order to deploy the Staff Access Scope feature:

---

## 📋 Pre-Deployment Checklist

- [ ] All code changes are committed to version control
- [ ] Supabase project is accessible
- [ ] Admin access to Supabase dashboard
- [ ] Backup of current database (optional but recommended)

---

## 🔧 Deployment Steps

### **Step 1: Database Migration** (CRITICAL - Do First!)

1. Open Supabase Dashboard
2. Navigate to: **SQL Editor**
3. Open file: [`scripts/add-staff-scope.sql`](scripts/add-staff-scope.sql)
4. Copy entire contents
5. Paste into SQL Editor
6. Click **"Run"** or press `Ctrl+Enter`

**Expected Output:**
```
ALTER TABLE
ALTER TABLE
ALTER TABLE
COMMENT
COMMENT
COMMENT
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
COMMENT
```

**Verification Query:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('school_ids', 'course_ids', 'branch_ids');
```

**Expected Result:** 3 rows showing the new columns

---

### **Step 2: Deploy Frontend/Backend Code**

**For Development:**
```bash
# No additional steps - changes are already in place
# Just restart dev server if needed
npm run dev
```

**For Production:**
```bash
# Build and deploy
npm run build
npm start

# Or if using Vercel/Netlify
git push origin main  # Triggers automatic deployment
```

---

### **Step 3: Verification Tests**

#### **Test 1: Admin Panel Access**
1. Login as admin
2. Navigate to: **Settings → Staff Accounts**
3. Click **"Add Staff Member"**
4. **Verify:** Modal shows 3 new scope fields:
   - School Access (Optional)
   - Course Access (Optional)
   - Branch Access (Optional)

✅ **Pass if:** All 3 fields are visible with multi-checkbox controls

---

#### **Test 2: Create Test Staff (Full Access)**
1. Fill in form:
   - Name: `Test Library Staff`
   - Email: `test.library@yourdomain.com`
   - Password: `test123456`
   - Department: `library`
   - **Leave all scope fields empty**
2. Click **"Add"**
3. **Verify:** Staff appears in table with:
   - 🌍 All Schools
   - 📖 All Courses
   - 🌐 All Branches

✅ **Pass if:** Staff created and shows "All" for all scopes

---

#### **Test 3: Create Test Staff (Restricted Access)**

**Prerequisites:** Ensure you have schools/courses/branches configured:
- Go to Settings → Schools → Add "Engineering"
- Go to Settings → Courses → Add "B.Tech" (link to Engineering)
- Go to Settings → Branches → Add "CSE" (link to B.Tech)

**Create Restricted Staff:**
1. Click **"Add Staff Member"**
2. Fill in:
   - Name: `Test CSE HOD`
   - Email: `test.cse@yourdomain.com`
   - Password: `cse123456`
   - Department: `school_hod`
   - Schools: **Check "Engineering"**
   - Courses: **Check "B.Tech"**
   - Branches: **Check "CSE"**
3. Click **"Add"**
4. **Verify:** Staff shows:
   - 🏫 1 school(s)
   - 📚 1 course(s)
   - 🎓 1 branch(es)

✅ **Pass if:** Staff created with correct scope counts

---

#### **Test 4: Staff Dashboard Filtering**

**Test Full Access Staff:**
1. Logout from admin
2. Login as: `test.library@yourdomain.com` / `test123456`
3. **Verify:** Dashboard shows ALL pending applications
4. Note the count

**Test Restricted Access Staff:**
1. Logout
2. Login as: `test.cse@yourdomain.com` / `cse123456`
3. **Verify:** Dashboard shows ONLY Engineering B.Tech CSE applications
4. Count should be less than full access staff (unless all students are CSE)

✅ **Pass if:** 
- Library staff sees all students
- CSE HOD sees only CSE students

---

#### **Test 5: Edit Staff Scope**
1. Login as admin
2. Go to Settings → Staff Accounts
3. Find "Test CSE HOD"
4. Click **"Edit"**
5. Add "M.Tech" to courses
6. Click **"Update"**
7. **Verify:** Scope now shows 2 course(s)
8. Login as CSE HOD again
9. **Verify:** Now sees both B.Tech CSE and M.Tech CSE students

✅ **Pass if:** Scope update works and filtering updates accordingly

---

## 🐛 Troubleshooting

### **Problem: Migration fails with "column already exists"**
**Solution:**
```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE '%_ids';

-- If they exist, skip to creating indexes and function
-- Run only the parts that are missing
```

---

### **Problem: Scope fields not showing in admin panel**
**Possible Causes:**
1. Frontend code not deployed
2. Browser cache issue
3. React hooks not importing correctly

**Solution:**
```bash
# Clear browser cache and hard reload
# Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

# Or restart dev server
npm run dev

# Check browser console for errors
```

---

### **Problem: Staff sees all students despite scope configuration**
**Debugging Steps:**
```sql
-- 1. Check staff scope in database
SELECT 
  email,
  department_name,
  school_ids,
  course_ids,
  branch_ids
FROM profiles 
WHERE email = 'test.cse@yourdomain.com';

-- 2. Check if student forms have required IDs
SELECT 
  student_name,
  school_id,
  course_id,
  branch_id
FROM no_dues_forms 
LIMIT 5;

-- 3. If school_id/course_id/branch_id are NULL in forms,
--    students need to be associated with schools/courses/branches
```

---

### **Problem: "Select All" button not working**
**Solution:**
1. Check browser console for JavaScript errors
2. Verify ConfigModal.jsx was updated correctly
3. Hard reload browser (Ctrl+Shift+R)

---

## 📊 Post-Deployment Monitoring

### **Database Queries for Monitoring**

**Check Staff Scope Distribution:**
```sql
SELECT 
  CASE 
    WHEN school_ids IS NULL AND course_ids IS NULL AND branch_ids IS NULL THEN 'Full Access'
    ELSE 'Restricted Access'
  END as access_type,
  COUNT(*) as count
FROM profiles 
WHERE role = 'department'
GROUP BY access_type;
```

**List All Staff with Their Scopes:**
```sql
SELECT 
  full_name,
  email,
  department_name,
  COALESCE(array_length(school_ids, 1), 0) as schools,
  COALESCE(array_length(course_ids, 1), 0) as courses,
  COALESCE(array_length(branch_ids, 1), 0) as branches
FROM profiles 
WHERE role = 'department'
ORDER BY full_name;
```

**Find Staff with No Scope (Full Access):**
```sql
SELECT full_name, email, department_name
FROM profiles 
WHERE role = 'department'
AND school_ids IS NULL 
AND course_ids IS NULL 
AND branch_ids IS NULL;
```

---

## ✅ Deployment Success Criteria

All of these must be ✅ before considering deployment complete:

- [ ] Database migration ran successfully
- [ ] No SQL errors in Supabase logs
- [ ] Admin panel loads without errors
- [ ] Staff Accounts page shows new "Access Scope" column
- [ ] "Add Staff Member" modal shows 3 scope fields
- [ ] Can create staff with full access (empty scopes)
- [ ] Can create staff with restricted access (selected scopes)
- [ ] Can edit staff and update their scope
- [ ] Staff dashboard filters correctly by scope
- [ ] Full access staff see all students
- [ ] Restricted staff see only their scope students
- [ ] No console errors in browser
- [ ] No API errors in network tab

---

## 🎉 Deployment Complete!

Once all checkboxes are ✅, the Staff Access Scope feature is fully deployed and ready for production use.

### **Next Steps:**
1. Train admin staff on how to configure scopes
2. Create staff accounts for all departments
3. Configure appropriate scopes for each staff member
4. Monitor initial usage and gather feedback
5. Document any department-specific scope requirements

### **Documentation:**
- Full implementation details: [`STAFF_SCOPE_IMPLEMENTATION.md`](STAFF_SCOPE_IMPLEMENTATION.md)
- Usage examples and testing: See implementation guide
- API documentation: Check inline code comments

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Version:** 1.0.0  
**Status:** ⏳ Pending / ✅ Complete