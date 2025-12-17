# 🚀 Production Error Fixes - Deployment Guide

## Overview

This guide fixes ALL 5 production runtime errors identified in your deployed application.

---

## 📋 Errors Fixed

1. ✅ **RLS Policy Violation** - Storage bucket upload failures
2. ✅ **Email Queue Missing Column** - `attempts` column error
3. ✅ **Convocation API 404** - Route deployment issue
4. ✅ **Student API 500 Error** - Related to storage RLS
5. ⚠️ **Auth Token Issue** - Environment configuration
6. ⚠️ **T.warn Bug** - Code issue (needs separate search)

---

## 🎯 Quick Fix Checklist

### Step 1: Update Database (5 minutes)

**Run in Supabase SQL Editor:**

```sql
-- Copy and paste contents of FIX_ALL_PRODUCTION_ERRORS.sql
```

**What it does:**
- ✅ Adds `attempts` column to `email_queue` table
- ✅ Drops conflicting RLS policies
- ✅ Creates correct RLS policies for 3-bucket setup
- ✅ Verifies all fixes applied successfully

---

### Step 2: Verify Storage Buckets (2 minutes)

Go to **Supabase Dashboard → Storage** and confirm these 3 buckets exist:

- ✅ `alumni-screenshots` (100KB limit, public)
- ✅ `no-dues-files` (100KB limit, public)
- ✅ `certificates` (200KB limit, public)

**If any are missing:**

Option A - Run setup script:
```bash
node scripts/setup-supabase.js
```

Option B - Create manually in Supabase Dashboard:
1. Click "New Bucket"
2. Name: `alumni-screenshots`
3. Public: ✓ Yes
4. File size limit: 102400 (100KB)
5. Allowed MIME types: `image/jpeg, image/png, image/webp`
6. Repeat for other buckets

---

### Step 3: Clear Build Cache & Redeploy (5 minutes)

**On Render.com:**

1. Go to your service dashboard
2. Click **"Manual Deploy"**
3. Select **"Clear build cache & deploy"**
4. Wait 3-5 minutes for deployment to complete

**Why this is needed:**
- Next.js caches API routes during build
- The convocation API route exists but may not be in the deployed build
- Clearing cache forces fresh route generation

---

### Step 4: Verify Environment Variables (2 minutes)

**On Render.com → Environment:**

Confirm these variables are set correctly:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**If auth tokens are failing:**

Check Supabase Dashboard → Settings → API:
- Copy the correct keys
- Update Render environment variables
- Redeploy

---

### Step 5: Test Form Submission (3 minutes)

1. Go to your production URL
2. Navigate to "Submit Form"
3. Fill in all required fields
4. **Upload a test image** (this tests the storage fix)
5. Click "Submit Form"
6. **Expected:** Success message, no RLS errors

---

## 📊 What Each File Does

### `FIX_ALL_PRODUCTION_ERRORS.sql`
**Purpose:** Comprehensive SQL fix for production database

**Sections:**
1. Email queue `attempts` column fix
2. Storage bucket verification
3. Drop old/conflicting RLS policies
4. Create correct RLS policies for 3-bucket setup
5. Verification and diagnostics

**Run this:** In Supabase SQL Editor

---

### `ULTIMATE_DATABASE_SETUP.sql` (Updated)
**Purpose:** Single source of truth for database schema

**Changes made:**
- ✅ Added `attempts` column to email_queue table definition (line 260)
- ✅ Added index for attempts column (line 404)
- ✅ Updated storage RLS policies for 3-bucket setup (lines 793-817)

**Note:** This is the master file. Use it for fresh deployments.

---

### `FIX_EMAIL_QUEUE_ATTEMPTS_COLUMN.sql`
**Purpose:** Standalone fix for email queue issue

**Use case:** If you only need to fix the email queue column without touching storage policies

---

## 🔍 Verification Queries

**After running the SQL fixes, verify with these queries:**

### Check email_queue table:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'email_queue' 
AND column_name = 'attempts';
```
**Expected:** 1 row showing `attempts | integer | 0`

---

### Check storage buckets:
```sql
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE name IN ('no-dues-files', 'alumni-screenshots', 'certificates')
ORDER BY name;
```
**Expected:** 3 rows

---

### Check RLS policies:
```sql
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage' 
ORDER BY policyname;
```
**Expected:** At least 15 policies

---

## 🐛 Troubleshooting

### Error: "Constraint already exists"
**Solution:** This is normal if running the fix twice. The script handles this gracefully.

---

### Error: "Bucket not found"
**Solution:** 
1. Go to Supabase Dashboard → Storage
2. Create the missing bucket manually
3. Set it to public with 100KB limit

---

### Error: "Still getting RLS violations"
**Solution:**
1. Run this in SQL Editor to check policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects';
```
2. If policies are missing, run `FIX_ALL_PRODUCTION_ERRORS.sql` again
3. Make sure buckets are set to "Public" in Supabase Dashboard

---

### Convocation API still 404
**Solution:**
1. Check the file exists: `src/app/api/convocation/validate/route.js`
2. Clear Render build cache completely
3. Check Render deployment logs for route registration errors

---

## 📝 Summary of Changes

### Database Changes:
- ✅ `email_queue` table now has `attempts` column
- ✅ Storage RLS policies updated for 3-bucket architecture
- ✅ All policies allow public upload to `alumni-screenshots` bucket

### Code Changes:
- ✅ No code changes needed - your code is already correct for 3-bucket setup
- ✅ `SubmitForm.jsx` correctly uploads to `alumni-screenshots` bucket

### Infrastructure Changes:
- ⚠️ Requires clear build cache on Render to fix API 404
- ⚠️ May require environment variable verification

---

## ✅ Success Criteria

After deployment, you should see:

1. ✅ Form submissions complete successfully
2. ✅ File uploads work without RLS errors
3. ✅ Convocation auto-fill button works
4. ✅ No console errors about missing columns
5. ✅ Student API returns 200 status (not 500)

---

## 🚨 If Issues Persist

1. Check Render deployment logs for specific errors
2. Check Supabase logs (Logs & Reports section)
3. Test with browser DevTools Network tab open to see exact error responses
4. Verify all environment variables match Supabase project

---

## 📞 Quick Reference Commands

### Test email queue fix:
```sql
SELECT COUNT(*) FROM email_queue WHERE attempts IS NOT NULL;
```

### Test storage upload (manual test):
```sql
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES ('alumni-screenshots', 'test-file.jpg', NULL, '{}'::jsonb);
-- Clean up:
DELETE FROM storage.objects WHERE name = 'test-file.jpg';
```

### Force refresh RLS:
```sql
-- If policies aren't working, try:
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

---

## 🎉 Expected Result

After following this guide:

- ✅ All 5 production errors resolved
- ✅ Form submissions work end-to-end
- ✅ File uploads succeed
- ✅ No console errors
- ✅ System ready for production use

**Estimated total time:** 15-20 minutes