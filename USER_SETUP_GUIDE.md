# 👥 User Setup Guide - Create Admin & Department Accounts

## 🎯 Accounts to Create

### 1. **Admin Account**
- **Email:** `razorrag.official@gmail.com`
- **Password:** `password123`
- **Role:** `admin`
- **Department:** None

### 2. **Department Account (Library)**
- **Email:** `15anuragsingh2003@gmail.com`
- **Password:** `password123`
- **Role:** `department`
- **Department:** `library`

---

## 📋 Complete Setup Process

### **Step 1: Run Master Schema (If Not Done)**

1. Open Supabase Dashboard → SQL Editor
2. Copy all contents of `supabase/MASTER_SCHEMA.sql`
3. Paste and execute
4. Verify 6 tables created

---

### **Step 2: Create Users in Supabase Auth**

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click "Authentication" in the left sidebar
   - Click "Users"

2. **Create Admin User**
   - Click "Add user" button
   - Choose "Email" tab
   - Enter:
     - Email: `razorrag.official@gmail.com`
     - Password: `password123`
     - ✅ Check "Auto Confirm User" (important!)
   - Click "Create user"
   - **Note the User ID** (UUID) that appears

3. **Create Library Staff User**
   - Click "Add user" button again
   - Choose "Email" tab
   - Enter:
     - Email: `15anuragsingh2003@gmail.com`
     - Password: `password123`
     - ✅ Check "Auto Confirm User" (important!)
   - Click "Create user"
   - **Note the User ID** (UUID) that appears

---

### **Step 3: Set Up Profiles**

#### **Option A: Using SQL Script (Recommended)**

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/CREATE_USERS.sql`
3. Paste and execute
4. This will automatically create profiles for both users

#### **Option B: Manual Setup via Table Editor**

1. **Go to Database → Table Editor**
2. **Select `profiles` table**

3. **Add Admin Profile:**
   - Click "Insert" → "Insert row"
   - Fill in:
     - `id`: Copy the UUID from auth.users for razorrag.official@gmail.com
     - `email`: `razorrag.official@gmail.com`
     - `full_name`: `Admin User` (or your name)
     - `role`: `admin`
     - `department_name`: Leave empty/NULL
   - Click "Save"

4. **Add Library Staff Profile:**
   - Click "Insert" → "Insert row"
   - Fill in:
     - `id`: Copy the UUID from auth.users for 15anuragsingh2003@gmail.com
     - `email`: `15anuragsingh2003@gmail.com`
     - `full_name`: `Library Staff` (or actual name)
     - `role`: `department`
     - `department_name`: `library` (MUST be lowercase!)
   - Click "Save"

---

### **Step 4: Verify Setup**

Run this query in SQL Editor to verify:

```sql
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.department_name,
    au.email_confirmed_at
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.id
WHERE p.email IN ('razorrag.official@gmail.com', '15anuragsingh2003@gmail.com')
ORDER BY p.role;
```

**Expected Output:**
```
id                                   | email                          | full_name      | role       | department_name | email_confirmed_at
-------------------------------------|--------------------------------|----------------|------------|-----------------|-------------------
<uuid>                               | razorrag.official@gmail.com    | Admin User     | admin      | NULL           | <timestamp>
<uuid>                               | 15anuragsingh2003@gmail.com    | Library Staff  | department | library        | <timestamp>
```

---

### **Step 5: Test Login**

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Test Admin Login:**
   - Go to `http://localhost:3000/staff/login`
   - Enter:
     - Email: `razorrag.official@gmail.com`
     - Password: `password123`
   - Click "Login to Dashboard"
   - **Expected:** Should redirect to `/admin` ✅
   - You should see the admin dashboard with stats

3. **Test Department Login:**
   - Logout (if logged in)
   - Go to `http://localhost:3000/staff/login`
   - Enter:
     - Email: `15anuragsingh2003@gmail.com`
     - Password: `password123`
   - Click "Login to Dashboard"
   - **Expected:** Should redirect to `/staff/dashboard` ✅
   - You should see pending requests for the Library department

---

## 🐛 Troubleshooting

### Issue: "Invalid login credentials"
**Causes:**
- User not created in Supabase Auth
- Email not confirmed (check "Auto Confirm User" when creating)
- Wrong password

**Solution:**
1. Go to Authentication → Users
2. Find the user
3. Check if email is confirmed
4. If not, click the user → "Send Magic Link" or manually confirm

### Issue: "Access denied" after login
**Causes:**
- Profile not created in profiles table
- Role is incorrect

**Solution:**
1. Go to Database → profiles table
2. Check if user exists
3. Verify `role` is exactly `'admin'` or `'department'` (lowercase)
4. For department users, verify `department_name` is `'library'` (lowercase)

### Issue: Admin redirects to /staff/dashboard
**Causes:**
- Role is not set to 'admin' in profiles table
- Using old code (not updated)

**Solution:**
1. Verify in profiles table that role is `'admin'` (not `'Admin'`)
2. Clear browser cache
3. Logout and login again

### Issue: Department user sees no requests
**Causes:**
- No forms submitted yet
- Department name doesn't match forms

**Solution:**
1. Submit a test form as a student
2. Verify department_name in profiles is lowercase: `'library'`
3. Check that no_dues_status has entries for 'library'

---

## 📝 Quick Reference

### User Credentials

| Type | Email | Password | Role | Department |
|------|-------|----------|------|------------|
| **Admin** | razorrag.official@gmail.com | password123 | admin | - |
| **Library Staff** | 15anuragsingh2003@gmail.com | password123 | department | library |

### Expected Behavior

| User Type | Login URL | Redirect After Login | What They See |
|-----------|-----------|---------------------|---------------|
| Admin | /staff/login | **/admin** | All requests, all departments, stats, charts |
| Department | /staff/login | **/staff/dashboard** | Only pending requests for their department |

### Department Names (All Lowercase!)

```
library, accounts, hostel, lab, department, sports,
transport, exam, placement, scholarship, student_affairs, administration
```

---

## ✅ Success Checklist

- [ ] Master schema executed successfully
- [ ] Admin user created in Supabase Auth (razorrag.official@gmail.com)
- [ ] Library user created in Supabase Auth (15anuragsingh2003@gmail.com)
- [ ] Both users have "Auto Confirm User" checked
- [ ] Admin profile created with role='admin'
- [ ] Library profile created with role='department', department_name='library'
- [ ] Verification query returns 2 rows
- [ ] Admin login redirects to /admin
- [ ] Library login redirects to /staff/dashboard
- [ ] No console errors in browser

---

## 🎉 What's Next

After successfully creating and testing both users:

1. **Test the complete workflow:**
   - Submit a form as a student
   - Login as library staff and approve/reject
   - Login as admin and view the request

2. **Create more department users** (optional):
   - Follow same process for other departments
   - Use department names from the list above (lowercase)

3. **Customize:**
   - Update user names in profiles table
   - Add more admin users if needed
   - Set up email notifications (optional)

---

**Last Updated:** November 21, 2025
**Status:** Ready for Testing ✅