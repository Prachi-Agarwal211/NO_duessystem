# 🚀 COMPLETE SETUP GUIDE - JECRC No Dues System

## Overview
This guide will set up your system with proper school-based filtering where:
- **Prachi** (prachiagarwal211@gmail.com) → Sees ONLY BCA/MCA forms from Computer Applications
- **Anurag** (anurag.22bcom1367@jecrcu.edu.in) → Sees ONLY B.Tech/M.Tech CSE forms from Engineering
- **Library Staff** → Sees ALL forms (no filtering)
- **Admin** → Sees ALL forms

---

## 📋 Prerequisites

✅ Supabase project created and active  
✅ `.env.local` file exists with:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
✅ Node.js installed (for running scripts)

---

## 🎯 STEP-BY-STEP SETUP

### **STEP 1: Setup Database** ⏱️ 2 minutes

1. Open your **Supabase Dashboard** → Go to **SQL Editor**
2. Copy the contents of `FINAL_COMPLETE_DATABASE_SETUP.sql`
3. Paste into SQL Editor and click **Run**
4. Wait for success message showing:
   - ✅ 13 Schools created
   - ✅ 40+ Courses created
   - ✅ 200+ Branches created
   - ✅ 11 Departments created

**What this does:**
- Creates all tables (profiles, departments, forms, status, etc.)
- Populates schools/courses/branches
- Sets up triggers for auto-creating department statuses
- Enables Row Level Security (RLS)

---

### **STEP 2: Add Staff Scope System** ⏱️ 1 minute

1. Still in **Supabase SQL Editor**
2. Copy the contents of `scripts/add-staff-scope.sql`
3. Paste and click **Run**
4. Verify success (no errors)

**What this does:**
- Adds `school_ids` column to profiles table (for filtering by school)
- Adds `course_ids` column to profiles table (for filtering by course)
- Adds `branch_ids` column to profiles table (for filtering by branch)
- Creates `can_staff_see_form()` function for access control
- Creates indexes for fast lookups

---

### **STEP 3: Create Staff Accounts** ⏱️ 1 minute

1. Open **Terminal** in VS Code (Ctrl + `)
2. Make sure you're in project root directory:
   ```bash
   cd "d:/nextjs projects/no_dues_app_new/jecrc-no-dues-system"
   ```

3. Run the staff creation script:
   ```bash
   node scripts/create-specific-staff-accounts.js
   ```

4. You should see output like:
   ```
   ✅ Successfully Created:
      ✓ razorrag.official@gmail.com
      ✓ 15anuragsingh2003@gmail.com
      ✓ prachiagarwal211@gmail.com
      ✓ anurag.22bcom1367@jecrcu.edu.in
   ```

**What this does:**
- Creates 4 staff accounts with authentication
- Sets `school_id` for HOD staff:
  - Prachi → School of Computer Applications
  - Anurag → School of Engineering & Technology
- Creates profile records with department assignments

**If you see "Already Exists":**
That's OK! It means accounts were created before. Skip to Step 4.

---

### **STEP 4: Verify Setup** ⏱️ 2 minutes

1. Open **Supabase Dashboard** → **Table Editor**
2. Go to `profiles` table
3. Verify you see 4 rows:

| email | role | department_name | school_id |
|-------|------|-----------------|-----------|
| razorrag.official@gmail.com | admin | NULL | NULL |
| 15anuragsingh2003@gmail.com | department | library | NULL |
| prachiagarwal211@gmail.com | department | school_hod | {uuid for Computer Applications} |
| anurag.22bcom1367@jecrcu.edu.in | department | school_hod | {uuid for Engineering} |

4. Verify `school_id` is:
   - **NULL** for admin and library (they see all schools)
   - **UUID** for HOD staff (they see only their school)

---

### **STEP 5: Test the System** ⏱️ 5 minutes

#### **Test 1: Submit CSE Student Form**

1. Go to your app: http://localhost:3000 (or your Vercel URL)
2. Click **Submit Form**
3. Fill in form with:
   - **School:** School of Engineering & Technology
   - **Course:** B.Tech
   - **Branch:** Computer Science and Engineering
   - Fill other required fields
4. Submit form

**Expected Result:**
- ✅ Form creates 11 department statuses automatically
- ✅ Anurag logs in → sees this form in dashboard
- ❌ Prachi logs in → does NOT see this form
- ✅ Library staff logs in → sees this form

#### **Test 2: Submit BCA Student Form**

1. Submit another form with:
   - **School:** School of Computer Applications
   - **Course:** BCA
   - **Branch:** BCA (General)
   - Fill other required fields
2. Submit form

**Expected Result:**
- ✅ Form creates 11 department statuses automatically
- ✅ Prachi logs in → sees this form in dashboard
- ❌ Anurag logs in → does NOT see this form
- ✅ Library staff logs in → sees this form

#### **Test 3: Staff Login**

**Login Credentials:**

| Role | Email | Password | What They See |
|------|-------|----------|---------------|
| Admin | razorrag.official@gmail.com | Test@1234 | ALL forms from ALL schools |
| Library | 15anuragsingh2003@gmail.com | Test@1234 | ALL forms from ALL schools |
| BCA/MCA HOD | prachiagarwal211@gmail.com | Test@1234 | ONLY Computer Applications forms |
| CSE HOD | anurag.22bcom1367@jecrcu.edu.in | Test@1234 | ONLY Engineering forms |

**Login URL:** http://localhost:3000/staff/login (or your-vercel-url/staff/login)

---

## ✅ SUCCESS CRITERIA

After completing all steps, verify:

1. ✅ **Database has:**
   - 13 schools in `config_schools`
   - 40+ courses in `config_courses`
   - 200+ branches in `config_branches`
   - 11 departments in `departments`
   - 4 staff profiles in `profiles`

2. ✅ **Staff accounts work:**
   - Can login at `/staff/login`
   - Dashboard shows forms based on their department
   - HOD staff only see their school's forms

3. ✅ **Form submission works:**
   - Student can submit form
   - 11 department statuses auto-created
   - Form appears in correct staff dashboards

4. ✅ **Filtering works:**
   - Prachi sees ONLY Computer Applications forms
   - Anurag sees ONLY Engineering forms
   - Library/Admin see ALL forms

---

## 🐛 TROUBLESHOOTING

### **Problem: "Missing environment variables"**
**Solution:**
1. Check `.env.local` exists in project root
2. Verify it contains:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_key
   ```
3. Restart terminal and try again

### **Problem: "Profile not found" when logging in**
**Solution:**
1. Check `profiles` table in Supabase
2. Verify staff account exists with correct `department_name`
3. Re-run: `node scripts/create-specific-staff-accounts.js`

### **Problem: HOD sees forms from all schools**
**Solution:**
1. Check `profiles` table
2. Verify `school_id` is set (not NULL) for HOD staff
3. If NULL, run Step 3 again to update profiles

### **Problem: "No staff email found" in notifications**
**Solution:**
1. This is normal if staff accounts don't exist yet
2. Complete Step 3 to create staff accounts
3. Notifications will work after accounts are created

### **Problem: Script errors with "Cannot find module"**
**Solution:**
1. Run: `npm install`
2. Wait for dependencies to install
3. Try running script again

---

## 📞 NEXT STEPS

After successful setup:

1. **Change Passwords:** All accounts use `Test@1234` - change after first login
2. **Add More Staff:** Use the script as template to add more department staff
3. **Deploy to Vercel:** Your changes will auto-deploy if GitHub is connected
4. **Test Production:** Verify everything works on your live URL

---

## 📊 SYSTEM ARCHITECTURE

```
Student Submits Form
        ↓
Creates no_dues_forms record
        ↓
Trigger auto-creates 11 no_dues_status records (one per department)
        ↓
Staff Dashboard Queries:
    - Admin → SELECT * FROM no_dues_status (all forms)
    - Library → SELECT * FROM no_dues_status WHERE department = 'library' (all forms)
    - Prachi (HOD) → SELECT * FROM no_dues_status 
                     WHERE department = 'school_hod' 
                     AND form.school_id = 'Computer Applications'
    - Anurag (HOD) → SELECT * FROM no_dues_status 
                     WHERE department = 'school_hod' 
                     AND form.school_id = 'Engineering'
```

---

## 🎉 YOU'RE DONE!

Your JECRC No Dues System is now fully configured with school-based filtering. Test it thoroughly before going live!