# JECRC No Dues System - Database Setup

## Single Source of Truth

This directory contains **ONE COMPLETE DATABASE SETUP FILE** that handles everything you need for the JECRC No Dues System.

## File: `COMPLETE_DATABASE_SETUP.sql`

### What It Does

This single SQL file will:

1. ✅ **Clean up** - Removes ALL existing tables, functions, triggers, and data
2. ✅ **Create Configuration Tables** - Schools, Courses, Branches, Email Settings
3. ✅ **Create Core Tables** - Profiles, Departments, Forms, Status, Audit Logs, Notifications
4. ✅ **Add Indexes** - For optimal database performance
5. ✅ **Create Functions** - Auto-create department statuses, update form status, statistics
6. ✅ **Create Triggers** - Auto-update timestamps, cascade status changes
7. ✅ **Setup RLS Policies** - Row Level Security for data protection
8. ✅ **Seed Initial Data** - 3 Schools, 9 Courses, 13 Branches, 9 Departments, Email Config

### Features Included

#### Configuration System (NEW)
- **Schools**: Engineering, Management, Law
- **Courses**: 
  - Engineering: B.Tech, M.Tech
  - Management: BBA, MBA
  - Law: BA LLB, LLB, LLM
- **Branches**:
  - B.Tech: CSE, ECE, ME, CE, IT, EE
  - M.Tech: CSE, ECE, ME
  - MBA: Finance, Marketing, HR, Operations
- **Email Settings**: College domain, admin email, notifications config

#### Email Fields (NEW)
- Personal Email (required, validated)
- College Email (required, validated against domain)

#### Department System
- 9 Departments with configurable emails
- Auto-creates status records for each department when form submitted
- Tracks approval/rejection status per department

---

## How to Use

### Step 1: Access Supabase Dashboard

1. Go to [https://supabase.com](https://supabase.com)
2. Log in to your account
3. Select your project: **jecrc-no-dues-system**

### Step 2: Open SQL Editor

1. Click on **SQL Editor** in the left sidebar
2. Click **New Query** button

### Step 3: Run the Complete Setup

1. Open the file: `COMPLETE_DATABASE_SETUP.sql`
2. Copy the **ENTIRE CONTENTS** of the file
3. Paste it into the SQL Editor
4. Click **Run** button (or press `Ctrl+Enter`)

**⏱️ Execution Time**: ~5-10 seconds

### Step 4: Verify Setup

Run these verification queries in SQL Editor:

```sql
-- Check schools
SELECT * FROM public.config_schools ORDER BY display_order;

-- Check courses
SELECT * FROM public.config_courses ORDER BY display_order;

-- Check branches  
SELECT * FROM public.config_branches ORDER BY display_order;

-- Check departments
SELECT * FROM public.departments ORDER BY display_order;

-- Check email configuration
SELECT * FROM public.config_emails;
```

**Expected Results:**
- 3 Schools (Engineering, Management, Law)
- 9 Courses across all schools
- 13 Branches across all courses
- 9 Departments (all active)
- 4 Email configuration entries

---

## Post-Setup Steps

### 1. Create Storage Buckets

In Supabase Dashboard → Storage:

**Bucket 1: `certificates`**
- Purpose: Store generated no-dues certificates
- Public: Yes
- File size limit: 5 MB
- Allowed MIME types: `application/pdf`

**Bucket 2: `alumni-screenshots`**
- Purpose: Store alumni association proof uploads
- Public: Yes  
- File size limit: 5 MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

### 2. Create Admin User

In Supabase Dashboard → Authentication → Users:

1. Click **Add User** → **Create New User**
2. Email: `admin@jecrc.ac.in`
3. Password: (set a secure password)
4. Email Confirm: ✅ Auto Confirm User
5. Click **Create User**

### 3. Add Admin Profile

Run this SQL query (replace `USER_ID` with actual admin user ID from step 2):

```sql
INSERT INTO public.profiles (id, email, full_name, role, department_name)
VALUES (
    'USER_ID_HERE',
    'admin@jecrc.ac.in',
    'System Administrator',
    'admin',
    NULL
);
```

### 4. Create Department Staff Users

For each department, create users and profiles:

**Example for Library Department:**

```sql
-- After creating user in Auth dashboard, add profile:
INSERT INTO public.profiles (id, email, full_name, role, department_name)
VALUES (
    'USER_ID_HERE',
    'library@jecrc.ac.in',
    'Library Staff',
    'department',
    'library'
);
```

Repeat for all 9 departments:
- `library`
- `it_department`
- `hostel`
- `mess`
- `canteen`
- `tpo`
- `alumni_association`
- `accounts_department`
- `school_hod`

### 5. Update Environment Variables

Create/update `.env.local` in project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Department Emails (from database)
SCHOOL_HOD_EMAIL=hod@jecrc.ac.in
LIBRARY_EMAIL=library@jecrc.ac.in
IT_DEPARTMENT_EMAIL=it@jecrc.ac.in
HOSTEL_EMAIL=hostel@jecrc.ac.in
MESS_EMAIL=mess@jecrc.ac.in
CANTEEN_EMAIL=canteen@jecrc.ac.in
TPO_EMAIL=tpo@jecrc.ac.in
ALUMNI_EMAIL=alumni@jecrc.ac.in
ACCOUNTS_EMAIL=accounts@jecrc.ac.in
```

### 6. Run Development Server

```bash
npm install
npm run dev
```

Visit: `http://localhost:3000`

---

## Database Schema Overview

### Configuration Tables (Admin Configurable)

```
config_schools
├── id (UUID)
├── name (TEXT) - "Engineering", "Management", "Law"
├── display_order (INTEGER)
├── is_active (BOOLEAN)
└── timestamps

config_courses
├── id (UUID)
├── school_id (FK → config_schools)
├── name (TEXT) - "B.Tech", "MBA", etc.
├── display_order (INTEGER)
├── is_active (BOOLEAN)
└── timestamps

config_branches
├── id (UUID)
├── course_id (FK → config_courses)
├── name (TEXT) - "CSE", "Finance", etc.
├── display_order (INTEGER)
├── is_active (BOOLEAN)
└── timestamps

config_emails
├── id (UUID)
├── key (TEXT) - "college_domain", "admin_email"
├── value (TEXT)
└── description (TEXT)
```

### Core Tables

```
profiles (Staff/Admin Users)
├── id (UUID, FK → auth.users)
├── email (TEXT, UNIQUE)
├── full_name (TEXT)
├── role (TEXT) - 'department' | 'admin'
├── department_name (TEXT, nullable for admin)
└── timestamps

departments (9 Departments)
├── id (UUID)
├── name (TEXT) - 'library', 'hostel', etc.
├── display_name (TEXT) - 'Library', 'Hostel'
├── email (TEXT) - configurable
├── display_order (INTEGER)
├── is_active (BOOLEAN)
└── timestamps

no_dues_forms (Student Submissions)
├── id (UUID)
├── registration_no (TEXT, UNIQUE)
├── student_name (TEXT)
├── personal_email (TEXT) ← NEW
├── college_email (TEXT) ← NEW
├── school_id (FK → config_schools) ← NEW
├── course_id (FK → config_courses) ← NEW
├── branch_id (FK → config_branches) ← NEW
├── school (TEXT) - legacy
├── course (TEXT) - legacy
├── branch (TEXT) - legacy
├── contact_no (TEXT)
├── parent_name (TEXT)
├── session_from/to (TEXT)
├── alumni_screenshot_url (TEXT)
├── certificate_url (TEXT)
├── status (TEXT) - 'pending' | 'approved' | 'rejected' | 'completed'
└── timestamps

no_dues_status (Department Approvals)
├── id (UUID)
├── form_id (FK → no_dues_forms)
├── department_name (FK → departments.name)
├── status (TEXT) - 'pending' | 'approved' | 'rejected'
├── rejection_reason (TEXT)
├── action_by_user_id (FK → profiles)
├── action_at (TIMESTAMP)
└── timestamps
```

---

## Important Notes

### ⚠️ WARNING: This Script is DESTRUCTIVE

- Running this script will **DELETE ALL EXISTING DATA**
- Use it for:
  - ✅ Initial setup
  - ✅ Development/testing resets
  - ✅ Clean slate deployment
- **DO NOT** use in production with existing data without backup!

### 🔄 Re-running the Script

You can safely re-run this script multiple times:
- It drops everything first, then recreates
- Useful for testing configuration changes
- Always creates a clean, consistent state

### 📊 Data Migration

If you have existing data and want to preserve it:

1. **Backup first**: Export existing data from Supabase
2. Run the new schema
3. Manually migrate data with proper mappings
4. Test thoroughly before production use

---

## Troubleshooting

### Issue: "relation already exists"
**Solution**: The script should handle this, but if you see this error:
1. Manually drop the table mentioned
2. Re-run the complete script

### Issue: "foreign key violation"
**Solution**: The script drops tables in correct order. If you see this:
1. Run: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
2. Re-run the complete script

### Issue: "permission denied"
**Solution**: Ensure you're running the script with admin/service role privileges

### Issue: RLS policies not working
**Solution**: 
1. Verify user is properly authenticated
2. Check profile exists for user in `profiles` table
3. Verify RLS is enabled: `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;`

---

## Admin Configuration Access

Once setup is complete, admins can configure the system through:

**Admin Dashboard → Settings Tab**

Where they can:
- ✏️ Add/Edit/Delete Schools
- ✏️ Add/Edit/Delete Courses per School
- ✏️ Add/Edit/Delete Branches per Course  
- ✏️ Update Department Emails
- ✏️ Configure Email Settings
- ✏️ Activate/Deactivate any configuration

**No code changes needed!** Everything is managed through the UI.

---

## Support

For issues or questions:
1. Check the verification queries to diagnose problems
2. Review Supabase logs in Dashboard
3. Check browser console for frontend errors
4. Verify environment variables are set correctly

---

**Last Updated**: 2025-11-25  
**Schema Version**: 2.0 (Configurable System)