# 🚀 Complete Setup Guide - JECRC No Dues System

## Overview

This guide will help you completely reset and set up the JECRC No Dues System from scratch, ensuring everything is properly configured and working.

---

## 📋 Prerequisites

1. **Node.js 18+** installed
2. **Supabase account** and project created
3. **Environment variables** in `.env.local` file
4. **Supabase credentials** (URL and Service Role Key)

---

## 🔧 Step 1: Environment Configuration

### Create `.env.local` file

Create `.env.local` in the project root with the following variables:

```env
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Email Configuration (OPTIONAL - has fallback)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM=JECRC No Dues <noreply@jecrc.edu.in>

# Application Settings
NEXT_PUBLIC_BASE_URL=http://localhost:3000
JWT_SECRET=your-secure-jwt-secret-minimum-32-characters-long
```

**How to get Supabase credentials:**
1. Go to your Supabase project dashboard
2. Settings > API
3. Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
4. Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 🗄️ Step 2: Database Setup

### Option A: Automated Setup (Recommended)

1. **Generate cleanup SQL** (optional, if you need to clean first):
   ```bash
   npm run setup:cleanup-sql
   ```
   This creates `supabase/cleanup.sql` - execute this in Supabase Dashboard SQL Editor if you want to clean everything first.

2. **Run the complete setup**:
   ```bash
   npm run setup
   ```
   This will:
   - Check Supabase connection
   - Create storage buckets
   - Verify database setup

3. **Execute the database schema**:
   - Go to Supabase Dashboard > SQL Editor
   - Copy the entire contents of `supabase/schema.sql`
   - Paste and execute in SQL Editor
   - Verify all tables are created (should see 6 tables)

### Option B: Manual Setup

1. **Clean existing data** (if needed):
   - Go to Supabase Dashboard > SQL Editor
   - Run `supabase/cleanup.sql` (if exists) or manually drop tables

2. **Create database schema**:
   - Go to Supabase Dashboard > SQL Editor
   - Copy entire contents of `supabase/schema.sql`
   - Paste and execute
   - Verify execution succeeded

3. **Verify tables created**:
   - Go to Supabase Dashboard > Database > Tables
   - Should see:
     - ✅ `profiles`
     - ✅ `departments` (should have 12 rows)
     - ✅ `no_dues_forms`
     - ✅ `no_dues_status`
     - ✅ `audit_log`
     - ✅ `notifications`

---

## 🗂️ Step 3: Storage Buckets Setup

### Option A: Automated (via script)

```bash
npm run setup:storage
```

### Option B: Manual Setup

1. Go to Supabase Dashboard > Storage
2. Create buckets with these settings:

   **Bucket 1: `certificates`**
   - Public: ✅ Yes
   - File size limit: 10MB
   - Allowed MIME types: `application/pdf`

   **Bucket 2: `alumni-screenshots`**
   - Public: ✅ Yes
   - File size limit: 5MB
   - Allowed MIME types: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`

   **Bucket 3: `avatars`** (optional)
   - Public: ✅ Yes
   - File size limit: 5MB
   - Allowed MIME types: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`, `image/gif`

---

## ✅ Step 4: Verification

Run the verification script:

```bash
npm run setup:verify
```

This will check:
- ✅ Supabase connection
- ✅ All tables exist
- ✅ All 12 departments present
- ✅ Storage buckets created

---

## 🧪 Step 5: Testing

1. **Start the development server**:
   ```bash
   npm install  # If not done already
   npm run dev
   ```

2. **Test the application**:
   - Open http://localhost:3000
   - Should redirect to `/login`
   - Try creating a test account

3. **Create test users**:
   - Sign up as a student
   - Sign up as department staff (then update `department_name` in database)
   - Sign up as registrar
   - Create admin user manually in database

---

## 🔍 Verification Checklist

After setup, verify:

### Database
- [ ] All 6 tables created
- [ ] `departments` table has 12 rows
- [ ] RLS policies enabled on all tables
- [ ] Triggers created (`trigger_initialize_form_status`)
- [ ] Functions created (4 functions)

### Storage
- [ ] `certificates` bucket exists and is public
- [ ] `alumni-screenshots` bucket exists and is public
- [ ] `avatars` bucket exists (optional)

### Application
- [ ] Server starts without errors
- [ ] Login page loads
- [ ] Signup page loads
- [ ] Can connect to Supabase

---

## 🐛 Troubleshooting

### Issue: "Missing Supabase credentials"
**Solution:** Check `.env.local` file exists and has all required variables

### Issue: "Table already exists" errors
**Solution:** Run cleanup SQL first, then recreate schema

### Issue: "Storage bucket not found"
**Solution:** Create buckets manually in Supabase Dashboard > Storage

### Issue: "Permission denied" errors
**Solution:** Check RLS policies are correctly set up in schema.sql

### Issue: "Function not found" errors
**Solution:** Ensure all functions are created in schema.sql

---

## 📝 Manual Database Operations

### Create Admin User

After creating a user account, update role in database:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

### Create Department Staff

After creating a user account, update in database:

```sql
UPDATE profiles 
SET role = 'department',
    department_name = 'LIBRARY'  -- or other department name
WHERE email = 'staff@example.com';
```

### Create Registrar

```sql
UPDATE profiles 
SET role = 'registrar' 
WHERE email = 'registrar@example.com';
```

---

## 🚀 Next Steps

1. ✅ Complete setup
2. ✅ Create test users
3. ✅ Test all workflows:
   - Student form submission
   - Staff approval/rejection
   - Registrar certificate generation
   - Admin dashboard
4. ✅ Deploy to production (if ready)

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase dashboard logs
3. Verify all environment variables
4. Ensure database schema executed completely
5. Check storage buckets are created and public

---

**Last Updated:** [Current Date]
**Status:** Production Ready ✅

