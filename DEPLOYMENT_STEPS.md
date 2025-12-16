# 🚀 Complete Deployment Steps - JECRC No Dues System

## ⚠️ IMPORTANT: Follow Steps in This EXACT Order

---

## Step 1: Create Storage Buckets First (CRITICAL!)

**Why First?** The SQL file creates RLS policies for these buckets. If buckets don't exist, the SQL will fail.

### Go to Supabase Dashboard → Storage

### Create 3 Buckets:

#### Bucket 1: `no-dues-files`
```
Name: no-dues-files
Public: Yes (for verification)
File size limit: 100KB (0.1MB)
Allowed MIME types: application/pdf, image/jpeg, image/png
```

**Purpose:** Main document storage (student uploaded files)
**Note:** 100KB limit keeps storage costs low and forces students to optimize files

---

#### Bucket 2: `alumni-screenshots`
```
Name: alumni-screenshots
Public: Yes
File size limit: 100KB (0.1MB)
Allowed MIME types: image/jpeg, image/png, image/webp
```

**Purpose:** Alumni portal screenshots (student verification)
**Note:** Screenshots can be compressed to under 100KB easily

---

#### Bucket 3: `certificates`
```
Name: certificates
Public: Yes (for verification)
File size limit: 200KB (0.2MB)
Allowed MIME types: application/pdf
```

**Purpose:** Generated PDF certificates (backend only)
**Note:** System-generated PDFs include logo + QR code + blockchain data (~120-180KB)

---

### ✅ Verify Buckets Created

In Supabase Dashboard → Storage, you should see:
```
✓ no-dues-files
✓ alumni-screenshots  
✓ certificates
```

---

## Step 2: Run ULTIMATE_DATABASE_SETUP.sql

### Go to Supabase Dashboard → SQL Editor

1. Click "New Query"
2. Copy the ENTIRE content of `ULTIMATE_DATABASE_SETUP.sql`
3. Paste into the SQL Editor
4. Click "Run" button (bottom right)
5. Wait ~30 seconds

### ✅ Expected Output:
```
╔═══════════════════════════════════════════════════════════════╗
║  JECRC NO DUES SYSTEM - ULTIMATE DATABASE SETUP COMPLETE     ║
╚═══════════════════════════════════════════════════════════════╝

✅ Database Statistics:
   - Schools: 13
   - Courses: ~50
   - Branches: 139
   - Departments: 10
   - Tables Created: 17
   - Indexes Created: 40+

✅ Features Included:
   - Manual Entry Separate Check System ✓
   - Rejection Cascade Context Tracking ✓
   - Reapplication Message History ✓
   - High Concurrency Optimizations ✓
   - Materialized View for Dashboard ✓
   - Support Ticket Auto-numbering ✓
   - Real-time Subscriptions ✓
   - Convocation Integration ✓
   - 100% Frontend/Backend Compatible ✓

🚀 System Ready for 1000+ Concurrent Users!
```

---

## Step 3: Verify Database Setup

### Run These Verification Queries:

```sql
-- Check tables created (should return 17)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Check functions exist (should return 3)
SELECT COUNT(*) FROM pg_proc 
WHERE proname IN ('get_form_statistics', 'get_department_workload', 'get_manual_entry_statistics');

-- Check departments (should return 10)
SELECT COUNT(*) FROM departments;

-- Check schools (should return 13)
SELECT COUNT(*) FROM config_schools;

-- Check branches (should return 139+)
SELECT COUNT(*) FROM config_branches;

-- Check storage policies exist (should return 12+)
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage';
```

### ✅ All queries should return the expected counts

---

## Step 4: Enable Connection Pooling (Performance)

### Go to Supabase Dashboard → Settings → Database

```
Mode: Transaction
Pool Size: 15
Connection Timeout: 15 seconds
```

Click "Save"

---

## Step 5: Setup Cron Job for Dashboard Stats (Optional but Recommended)

### Go to Supabase Dashboard → SQL Editor

Run this query:
```sql
SELECT cron.schedule(
  'refresh_dashboard_stats',
  '*/5 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY admin_dashboard_stats'
);
```

This refreshes dashboard statistics every 5 minutes for blazing-fast performance.

---

## Step 6: Create Admin Account

### Go to Supabase Dashboard → Authentication → Users

1. Click "Add User"
2. Email: `admin@jecrcu.edu.in` (or your admin email)
3. Password: (set a strong password)
4. Click "Create User"
5. **Copy the User ID (UUID)**

### Then Run This SQL:

```sql
-- Replace 'YOUR_USER_ID' with the UUID you copied
INSERT INTO profiles (id, email, full_name, role, is_active)
VALUES (
  'YOUR_USER_ID',
  'admin@jecrcu.edu.in',
  'System Administrator',
  'admin',
  true
);
```

---

## Step 7: Create Department Staff Accounts

### Option A: Use the Script (Recommended)

```bash
cd scripts
node create-department-staff.js
```

### Option B: Manual Creation

For each department staff:

1. Go to Supabase → Authentication → Users → Add User
2. Email: `department_name@jecrcu.edu.in`
3. Copy the User ID
4. Run this SQL:

```sql
INSERT INTO profiles (id, email, full_name, role, department_name, is_active)
VALUES (
  'USER_ID_HERE',
  'department_name@jecrcu.edu.in',
  'Department Display Name',
  'department',
  'department_name',  -- Must match departments table
  true
);
```

### Required 10 Department Accounts:
```
1. school_hod@jecrcu.edu.in (School HODs - will be 13 different HODs)
2. library@jecrcu.edu.in
3. it_department@jecrcu.edu.in
4. hostel@jecrcu.edu.in
5. mess@jecrcu.edu.in
6. canteen@jecrcu.edu.in
7. tpo@jecrcu.edu.in
8. alumni_association@jecrcu.edu.in
9. accounts_department@jecrcu.edu.in
10. registrar@jecrcu.edu.in
```

---

## Step 8: Import 9th Convocation Data (If Needed)

### Go to Supabase Dashboard → Table Editor → convocation_eligible_students

1. Click "Import Data"
2. Select CSV file: `data/Passout_batch.xlsx` (convert to CSV first)
3. Map columns:
   - registration_no → registration_no
   - student_name → student_name
   - school → school
   - admission_year → admission_year
4. Click "Import"

---

## Step 9: Deploy Frontend

### Update Environment Variables in Vercel/Hosting:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Deploy:
```bash
# Push to Git
git add .
git commit -m "Database setup complete"
git push

# Vercel will auto-deploy
```

---

## Step 10: Test Everything

### Test Admin Login
1. Go to `/staff/login`
2. Login with admin credentials
3. Check dashboard loads (<500ms)
4. Verify statistics show correctly

### Test Department Login
1. Go to `/staff/login`
2. Login with department credentials
3. Check department dashboard works
4. Try approving/rejecting a test form

### Test Student Flow
1. Go to `/student/submit-form`
2. Fill out a test form
3. Check it appears in admin dashboard
4. Check department receives it
5. Test approval workflow

### Test Real-time Updates
1. Open admin dashboard in one browser
2. Open department dashboard in another
3. Approve a form in department
4. Watch admin dashboard update automatically (1-2 seconds)

---

## 🎉 You're Done!

Your system is now:
- ✅ Fully deployed
- ✅ Optimized for performance
- ✅ Secured with RLS
- ✅ Real-time enabled
- ✅ Ready for production

---

## 🆘 Troubleshooting

### "Function does not exist" Error
**Solution:** Re-run ULTIMATE_DATABASE_SETUP.sql

### "Storage bucket not found" Error
**Solution:** Create the 3 storage buckets first (Step 1)

### "RLS policy violation" Error
**Solution:** Check you're using Service Role Key in backend

### "Slow dashboard (>1000ms)" Error
**Solution:** 
1. Enable connection pooling (Step 4)
2. Run `ANALYZE` on tables
3. Setup cron job (Step 5)

### "Admin login doesn't work" Error
**Solution:** Verify profile row exists with role='admin'

---

## 📞 Need Help?

Check these resources:
- `docs/TROUBLESHOOTING.md` - Common issues
- `docs/TESTING.md` - Test cases
- `scripts/` folder - Utility scripts

---

**Everything is ready! Just follow these steps in order and you'll have a production-ready system.** 🚀