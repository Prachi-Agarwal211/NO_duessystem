# 🔴 Production Errors - Final Fix

## Current Production Errors

### Error 1: `/api/student` Returns 500
```
Failed to load resource: the server responded with a status of 500 ()
[DROPDOWN_ERROR] SubmitForm
```

**Root Cause:** The Zod changes aren't deployed yet OR there's an import error.

### Error 2: Manual Entry Upload RLS Violation
```
Upload failed: new row violates row-level security policy
File: no-dues-files/manual-entries/21BCON532_1765951632459.pdf
```

**Root Cause:** Frontend is uploading directly to Supabase storage, but RLS policies block it. Should use `/api/upload` route instead.

---

## 🔧 Fix 1: Student API 500 Error

### Issue:
The `/api/student` route is failing because:
1. Zod code isn't deployed (stale cache)
2. OR there's a runtime import error

### Solution:

**Immediate Action - Clear Render Cache:**
1. Go to https://dashboard.render.com
2. Find service: `no-duessystem`
3. Click "Manual Deploy"
4. Select "Clear build cache & deploy"
5. Wait 10 minutes

**If error persists after deployment:**

Check Render logs for the actual error:
```bash
# In Render Dashboard → Logs tab
# Look for the actual error message when /api/student is called
```

Common issues:
- Missing `zod` package (run `npm install`)
- Import path error in zodSchemas.js
- Database connection issue

---

## 🔧 Fix 2: Manual Entry Upload RLS Violation

### Root Cause:
The frontend is trying to upload directly to Supabase storage bucket, but RLS policies block non-admin uploads.

### The Problem:
Current flow:
```
Frontend → Supabase Storage (BLOCKED by RLS)
```

Correct flow:
```
Frontend → /api/upload → Supabase Admin Client → Storage (BYPASSES RLS)
```

### Solution - Update Manual Entry Component

The manual entry form needs to use the `/api/upload` route we created instead of direct Supabase upload.

**Find this file:** `src/components/admin/ManualEntryForm.jsx` or similar

**Current code (WRONG):**
```javascript
// Direct Supabase upload (blocked by RLS)
const { data, error } = await supabase.storage
  .from('no-dues-files')
  .upload(`manual-entries/${fileName}`, file);
```

**Correct code (RIGHT):**
```javascript
// Use API route that bypasses RLS
const formData = new FormData();
formData.append('file', file);
formData.append('bucket', 'manual-entries');
formData.append('fileName', fileName);

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (!result.success) {
  throw new Error(result.error);
}

const fileUrl = result.publicUrl; // Use this URL
```

---

## 📋 Step-by-Step Fix Guide

### Step 1: Fix Student API (Clear Cache)

1. **Run `npm install`** (ensures zod is installed)
2. **Go to Render Dashboard**
3. **Manual Deploy → Clear build cache & deploy**
4. **Wait 10 minutes**
5. **Test:** `curl -X POST https://no-duessystem.onrender.com/api/student -H "Content-Type: application/json" -d '{"test":"data"}'`

**Expected:** JSON error (not 500)

### Step 2: Fix Manual Entry Upload

**Option A: Use Existing Upload API (Recommended)**

Find your manual entry form component and replace the upload logic:

```javascript
// BEFORE (Direct upload - FAILS)
const uploadFile = async (file) => {
  const fileName = `${registrationNo}_${Date.now()}.pdf`;
  const { data, error } = await supabase.storage
    .from('no-dues-files')
    .upload(`manual-entries/${fileName}`, file);
  
  if (error) throw error;
  return data.path;
};

// AFTER (API upload - WORKS)
const uploadFile = async (file) => {
  const fileName = `${registrationNo}_${Date.now()}.pdf`;
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', 'manual-entries');
  formData.append('fileName', fileName);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Upload failed');
  }
  
  return result.publicUrl; // Full URL ready to use
};
```

**Option B: Fix RLS Policies (Alternative)**

If you want to keep direct uploads, update RLS policies:

```sql
-- In Supabase SQL Editor
-- Allow authenticated users to upload to manual-entries bucket
CREATE POLICY "Allow authenticated uploads to manual-entries"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'no-dues-files' 
  AND (storage.foldername(name))[1] = 'manual-entries'
);

-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'no-dues-files');
```

**But Option A is better** because:
- ✅ Centralized upload logic
- ✅ Server-side validation
- ✅ Consistent file naming
- ✅ Better security
- ✅ No RLS policy headaches

---

## 🧪 Testing After Fixes

### Test 1: Student API
```bash
curl -X POST https://no-duessystem.onrender.com/api/student \
  -H "Content-Type: application/json" \
  -d '{
    "registration_no":"TEST123",
    "student_name":"Test Student",
    "contact_no":"9876543210",
    "school":"550e8400-e29b-41d4-a716-446655440000",
    "course":"550e8400-e29b-41d4-a716-446655440001",
    "branch":"550e8400-e29b-41d4-a716-446655440002",
    "personal_email":"test@gmail.com",
    "college_email":"test@jecrc.ac.in"
  }'
```

**Expected:** JSON with validation error (for fake UUIDs)  
**Not:** 500 error

### Test 2: Upload API
```bash
curl -X POST https://no-duessystem.onrender.com/api/upload \
  -F "file=@test.pdf" \
  -F "bucket=manual-entries" \
  -F "fileName=TEST_123.pdf"
```

**Expected:** JSON with `{"success":true,"publicUrl":"https://..."}`  
**Not:** RLS error

### Test 3: Manual Entry (Frontend)
1. Go to admin panel
2. Click "Manual Entry"
3. Select file
4. Submit form
5. **Expected:** Success message
6. **Not:** "RLS policy violation"

---

## 🎯 Quick Fix Summary

**Issue 1: Student API 500**
- **Cause:** Stale build cache
- **Fix:** Clear Render cache & redeploy
- **Time:** 10 minutes

**Issue 2: Upload RLS Error**
- **Cause:** Direct Supabase upload blocked by RLS
- **Fix:** Use `/api/upload` route in frontend
- **Time:** 5 minutes (code change)

**Total Fix Time:** ~15 minutes

---

## 📝 Files to Check/Modify

1. **Check Render deployment:**
   - Ensure `zod@3.22.4` is in `package.json`
   - Ensure build succeeded
   - Check logs for errors

2. **Find and update manual entry form:**
   - Likely: `src/components/admin/ManualEntryForm.jsx`
   - Or: `src/components/ManualEntry.jsx`
   - Or: `src/app/manual-entry/page.jsx`
   - Replace direct Supabase upload with `/api/upload` API call

3. **Verify environment variables in Render:**
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJ... (must be SERVICE ROLE, not anon!)
   ```

---

## 🚨 If Errors Persist

### Student API Still 500:

1. **Check Render logs:**
   ```
   Dashboard → Service → Logs
   Look for actual error when /api/student is called
   ```

2. **Common causes:**
   - Zod not installed: `npm install zod`
   - Import error: Check zodSchemas.js path
   - Database error: Check SUPABASE_SERVICE_ROLE_KEY

### Upload Still Fails:

1. **Verify `/api/upload` exists:**
   ```bash
   curl https://no-duessystem.onrender.com/api/upload
   ```
   Should return 405 (Method Not Allowed) - means route exists

2. **Check Storage bucket:**
   - Supabase → Storage → `no-dues-files` bucket exists
   - Bucket is public or has proper RLS

3. **Check SERVICE_ROLE_KEY:**
   - In Render environment variables
   - Must be SERVICE ROLE key (starts with `eyJ...`)
   - Not the ANON key

---

## ✅ Success Criteria

After fixes:
- [ ] `/api/student` returns JSON (not 500)
- [ ] Manual entry file uploads work
- [ ] No "RLS policy violation" errors
- [ ] Forms submit successfully
- [ ] Files appear in Supabase storage

---

## 📞 Next Steps

1. **Immediately:** Clear Render build cache and redeploy
2. **After deployment:** Test `/api/student` endpoint
3. **If upload still fails:** Find manual entry form and update to use `/api/upload`
4. **Verify:** Test complete flow from frontend

Let me know which error persists after clearing the cache!