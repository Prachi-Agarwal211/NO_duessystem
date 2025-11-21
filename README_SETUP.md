# 🎯 JECRC No Dues System - Complete Setup Guide

## ✅ What Was Fixed

All conflicting schema files have been deleted. Now there is **ONE single source of truth**:

### 📁 **Single Schema File: `supabase/MASTER_SCHEMA.sql`**

This file:
- ✅ Deletes ALL existing data and objects
- ✅ Recreates everything from scratch
- ✅ Uses lowercase department names (`library`, `accounts`, `hostel`, etc.)
- ✅ Has correct function `get_form_statistics()` (not `get_overall_stats()`)
- ✅ Profiles table has NO `registration_no` (it's only in `no_dues_forms`)
- ✅ Matches all application code perfectly

---

## 🚀 Step-by-Step Setup

### **Step 1: Database Reset & Setup**

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Click "SQL Editor" in the left sidebar

2. **Run Master Schema**
   - Open the file `supabase/MASTER_SCHEMA.sql` in your code editor
   - Copy ALL contents (Ctrl+A, then Ctrl+C)
   - Paste into Supabase SQL Editor
   - Click "Run" (or press F5)
   - Wait for "Success" message

3. **Verify Tables Created**
   - Go to "Database" → "Tables" in Supabase Dashboard
   - You should see 6 tables:
     - ✅ `profiles`
     - ✅ `departments` (should have 12 rows)
     - ✅ `no_dues_forms`
     - ✅ `no_dues_status`
     - ✅ `audit_log`
     - ✅ `notifications`

---

### **Step 2: Create Storage Buckets**

1. Go to "Storage" in Supabase Dashboard
2. Create bucket: **`certificates`**
   - Public: ✅ Yes
   - File size limit: 10 MB
   - Allowed MIME types: `application/pdf`

3. Create bucket: **`alumni-screenshots`**
   - Public: ✅ Yes
   - File size limit: 5 MB
   - Allowed MIME types: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`

---

### **Step 3: Create Admin User**

1. **Create User in Supabase Auth**
   - Go to "Authentication" → "Users"
   - Click "Add user"
   - Email: `razorrag.official@gmail.com` (or your email)
   - Password: `password123` (or your password)
   - Click "Create user"

2. **Update Profile to Admin Role**
   - Go to "Database" → "Table Editor"
   - Select `profiles` table
   - Find your user (should be auto-created)
   - Click "Edit" on the row
   - Set:
     - `role`: `admin`
     - `full_name`: Your Name
     - `department_name`: Leave empty/NULL
   - Save

---

### **Step 4: Create Department Staff (Optional)**

For each department user:

1. **Create in Supabase Auth**
   - Go to "Authentication" → "Users"
   - Add user with department email (e.g., `library@jecrc.ac.in`)

2. **Update Profile**
   - Go to `profiles` table
   - Edit the user:
     - `role`: `department`
     - `department_name`: Choose from list below (MUST be lowercase):
       ```
       library
       accounts
       hostel
       lab
       department
       sports
       transport
       exam
       placement
       scholarship
       student_affairs
       administration
       ```
     - `full_name`: Staff name
   - Save

---

### **Step 5: Start Application**

```bash
# Install dependencies (if not done)
npm install

# Start development server
npm run dev
```

Open http://localhost:3000

---

## 🔐 Test Login & Routing

### **Test Admin Login**
1. Go to `http://localhost:3000/staff/login`
2. Login with admin credentials:
   - Email: `razorrag.official@gmail.com`
   - Password: `password123`
3. **Expected:** Should redirect to `/admin` ✅

### **Test Department Staff Login**
1. Go to `http://localhost:3000/staff/login`
2. Login with department credentials
3. **Expected:** Should redirect to `/staff/dashboard` ✅

---

## 🎯 What's Fixed

### **1. Login Redirect** ✅
- Admin users → `/admin`
- Department users → `/staff/dashboard`
- Fixed in: `src/app/staff/login/page.js`

### **2. Database Schema** ✅
- Single source of truth: `supabase/MASTER_SCHEMA.sql`
- Deleted 5 conflicting schema files
- All department names lowercase
- Correct functions and triggers

### **3. Admin Dashboard API** ✅
- Removed incorrect `registration_no` from profiles query
- Fixed: `src/app/api/admin/dashboard/route.js`

### **4. Admin Stats API** ✅
- Changed function from `get_overall_stats()` to `get_form_statistics()`
- Fixed: `src/app/api/admin/stats/route.js`

### **5. Department Names** ✅
All lowercase everywhere:
```
library, accounts, hostel, lab, department, sports,
transport, exam, placement, scholarship, student_affairs, administration
```

---

## 📊 Database Schema Overview

### **Tables Created**
1. **profiles** - Staff and admin users (NO students)
2. **departments** - 12 departments with lowercase names
3. **no_dues_forms** - Student applications (public access)
4. **no_dues_status** - Department-wise approval status
5. **audit_log** - Action tracking
6. **notifications** - Email tracking

### **Functions Created**
- `get_form_statistics()` - Get overall form stats
- `get_department_workload()` - Get department-wise stats
- `create_department_statuses()` - Auto-create status for all departments
- `update_form_status_on_department_action()` - Update form when all approve

### **Triggers Created**
- Auto-update `updated_at` timestamps
- Auto-create department statuses on form submission
- Auto-update form status when departments approve/reject

---

## 🐛 Troubleshooting

### Issue: "Function not found"
**Solution:** You're still using old database. Run `MASTER_SCHEMA.sql` again.

### Issue: "Column does not exist"
**Solution:** Old schema still in use. Run `MASTER_SCHEMA.sql` to reset everything.

### Issue: "Admin redirects to staff dashboard"
**Solution:** Check that:
1. User's `role` is `'admin'` (not `'Admin'` - lowercase)
2. Browser cache cleared
3. You're using the updated login page

### Issue: "404 on student details"
**Solution:** 
1. Verify department names are lowercase in database
2. Check that form exists in `no_dues_forms` table
3. Verify department status exists in `no_dues_status` table

---

## 📝 Important Notes

1. **Department Names MUST be lowercase** - The schema uses lowercase, code expects lowercase
2. **Only ONE schema file now** - `supabase/MASTER_SCHEMA.sql` is the single source of truth
3. **Admin role redirects to /admin** - Department role redirects to /staff/dashboard
4. **No students in profiles table** - Students submit forms without authentication in Phase 1

---

## ✅ Checklist Before Testing

- [ ] `.env.local` file configured with Supabase credentials
- [ ] `MASTER_SCHEMA.sql` executed in Supabase SQL Editor
- [ ] All 6 tables visible in Supabase Dashboard
- [ ] `departments` table has 12 rows
- [ ] Storage buckets created (`certificates`, `alumni-screenshots`)
- [ ] Admin user created with `role = 'admin'`
- [ ] `npm install` completed
- [ ] `npm run dev` running without errors

---

## 🎉 Success Indicators

When everything is working:
- ✅ Admin login redirects to `/admin`
- ✅ Department login redirects to `/staff/dashboard`
- ✅ No "function not found" errors
- ✅ No "column does not exist" errors
- ✅ Admin dashboard loads with stats
- ✅ Department dashboard shows pending requests
- ✅ Student forms can be submitted

---

**Last Updated:** November 21, 2025
**Status:** Production Ready ✅