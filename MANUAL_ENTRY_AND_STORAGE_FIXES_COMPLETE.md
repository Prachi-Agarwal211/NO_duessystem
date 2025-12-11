# Manual Entry & Storage Fixes - Complete Summary

## 🎯 Issues Fixed

### Issue 1: Manual Entry Upload Failure (400 Bad Request)
**Problem:** Students couldn't upload certificates due to RLS policy blocking anonymous users
**Root Cause:** Storage bucket required `authenticated` role, but students are anonymous (no signup)
**Solution:** Added RLS policy allowing anonymous uploads to `manual-entries` folder

### Issue 2: Manual Entry API 500 Error
**Problem:** API returned 500 error after successful file upload
**Root Cause:** Database foreign key constraints on `school_id`, `course_id`, `branch_id` were not satisfied
**Solution:** Added UUID validation and storage (both UUIDs and text names) in the API

### Issue 3: File Size and Type Restrictions
**Problem:** Mixed file size limits (5MB, 10MB) and allowed multiple file types (images + PDF)
**Requirement:** Standardize to 1MB limit and PDF only for manual entries

---

## 📝 Files Modified

### 1. Backend API Changes

#### [`src/app/api/manual-entry/route.js`](src/app/api/manual-entry/route.js)
**Changes:**
- Added school/course/branch UUID validation (lines 51-92)
- Validates foreign key relationships against config tables
- Stores BOTH UUIDs (for FK constraints) and text names (for display)
- Updated insert to include: `school_id`, `course_id`, `branch_id`, `country_code`, `user_id`
- Matches the same validation logic as regular form submission

**Why:** Satisfies database foreign key constraints while maintaining text names for display

---

### 2. Frontend Changes

#### [`src/app/student/manual-entry/page.js`](src/app/student/manual-entry/page.js)
**Changes:**
- Line 124: Changed from multiple file types to **PDF only** (`['application/pdf']`)
- Line 131: Updated size limit from **10MB to 1MB**
- Line 126: Updated error message to "Please upload a PDF file only"
- Line 438: Updated help text to "PDF only, max 1MB"
- Line 462: Changed accept attribute to `application/pdf`
- Lines 468-480: Removed image preview (PDF doesn't need preview)

**Why:** Enforce PDF-only uploads with 1MB limit for manual certificates

#### [`src/components/student/FileUpload.jsx`](src/components/student/FileUpload.jsx)
**Changes:**
- Line 10: Updated default `maxSize` from **5MB to 1MB**
- Line 158: Updated display text to show "up to 1MB"

**Why:** Standardize file size limit across all upload components

#### [`src/components/student/SubmitForm.jsx`](src/components/student/SubmitForm.jsx)
**Changes:**
- Line 307: Updated validation from **5MB to 1MB**
- Line 682: Updated `maxSize` prop from **5MB to 1MB**

**Why:** Alumni screenshot uploads now limited to 1MB

---

### 3. Backend Utility Libraries

#### [`src/lib/fileUpload.js`](src/lib/fileUpload.js)
**Changes:**
- Line 22: Updated default `maxSize` from **5MB to 1MB**
- Line 210: Updated alumni screenshot limit from **5MB to 1MB**
- Line 236: Updated config `maxFileSize` from **5MB to 1MB**
- Line 241: Updated display text to "1MB"

**Why:** Centralized file upload configuration now enforces 1MB limit

#### [`src/lib/validation.js`](src/lib/validation.js)
**Changes:**
- Line 192: Updated default `maxSize` from **5MB to 1MB**

**Why:** Validation library enforces 1MB limit for all file validations

---

### 4. Database/Storage Configuration

#### [`FIX_STORAGE_AND_MANUAL_ENTRY.sql`](FIX_STORAGE_AND_MANUAL_ENTRY.sql)
**Created new SQL file with:**

**Part 1: RLS Policy for Anonymous Uploads (Lines 15-48)**
```sql
-- Allows anonymous students to upload certificates
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

CREATE POLICY "Allow anon and authenticated uploads to manual entries"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
    bucket_id = 'no-dues-files' 
    AND (storage.foldername(name))[1] = 'manual-entries'
);
```

**Part 2: Update Bucket Configurations (Lines 62-84)**
```sql
UPDATE storage.buckets
SET 
    file_size_limit = 1048576,  -- 1MB
    allowed_mime_types = CASE 
        WHEN name = 'no-dues-files' THEN ARRAY['application/pdf']::text[]
        WHEN name = 'certificates' THEN ARRAY['application/pdf']::text[]
        WHEN name = 'avatars' THEN ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
        ELSE allowed_mime_types
    END
WHERE name IN ('no-dues-files', 'certificates', 'avatars');
```

**Part 3: Verification Queries (Lines 128-159)**
- Check RLS is enabled
- List all active storage policies
- Verify bucket configurations

---

## 🔐 Security Improvements

### Before
- ❌ Anonymous users couldn't upload (blocked by RLS)
- ❌ Inconsistent file size limits (5MB, 10MB)
- ❌ Multiple file types allowed (images + PDF)
- ❌ Missing UUID validation in API

### After
- ✅ Anonymous uploads allowed only to `manual-entries` folder
- ✅ Consistent 1MB file size limit across all uploads
- ✅ PDF only for manual certificate uploads
- ✅ Images only (JPEG, PNG, WebP) for avatars
- ✅ Full UUID validation and foreign key satisfaction
- ✅ Both UUIDs and text names stored for integrity

---

## 📊 Summary of Changes

| Component | Before | After |
|-----------|--------|-------|
| **Manual Entry File Type** | Images + PDF | **PDF Only** |
| **Manual Entry Size Limit** | 10MB | **1MB** |
| **Alumni Screenshot Limit** | 5MB | **1MB** |
| **General Upload Limit** | 5MB | **1MB** |
| **Anonymous Uploads** | Blocked | **Allowed (manual-entries)** |
| **API UUID Validation** | Missing | **Fully Implemented** |
| **Database Constraints** | Violated | **Satisfied** |

---

## 🚀 Deployment Steps

### 1. Run SQL Commands
```bash
# In Supabase SQL Editor, run:
FIX_STORAGE_AND_MANUAL_ENTRY.sql
```

### 2. Deploy Code Changes
```bash
# Commit all changes
git add .
git commit -m "Fix manual entry upload and standardize file limits to 1MB"

# Deploy to production (Vercel)
git push origin main
```

### 3. Verify Deployment
- [ ] Test manual entry upload with PDF < 1MB → Should succeed ✅
- [ ] Test manual entry upload with PDF > 1MB → Should fail ❌
- [ ] Test manual entry upload with image → Should fail ❌
- [ ] Verify anonymous users can upload without authentication ✅
- [ ] Check manual entries appear in department dashboard ✅
- [ ] Verify alumni screenshot upload with 1MB limit ✅

---

## 🧪 Testing Checklist

### Manual Entry Flow
- [ ] Navigate to `/student/manual-entry`
- [ ] Select school, course, branch from dropdowns
- [ ] Upload PDF certificate < 1MB
- [ ] Verify file uploads successfully
- [ ] Verify form submission creates database entry
- [ ] Check department staff receives email notification
- [ ] Verify entry appears in department dashboard

### File Size Validation
- [ ] Try uploading file > 1MB → Should show error
- [ ] Try uploading PDF < 1MB → Should succeed
- [ ] Try uploading image to manual entry → Should fail
- [ ] Try uploading image to alumni screenshot → Should succeed (if < 1MB)

### Database Integrity
```sql
-- Verify manual entries have all required fields
SELECT 
    id, 
    registration_no, 
    school_id, 
    course_id, 
    branch_id,
    school,
    course,
    branch,
    is_manual_entry,
    manual_certificate_url
FROM no_dues_forms
WHERE is_manual_entry = true
ORDER BY created_at DESC
LIMIT 5;
```

---

## 📌 Important Notes

1. **Existing Files:** Files already uploaded larger than 1MB will NOT be deleted
2. **Frontend Validation:** All file size checks happen on both frontend and backend
3. **MIME Type Enforcement:** Database bucket settings now enforce PDF-only for manual entries
4. **Anonymous Users:** Can only upload to `manual-entries` folder, not other locations
5. **UUID Validation:** API now validates all school/course/branch selections before insertion

---

## 🔗 Related Files

- API: [`src/app/api/manual-entry/route.js`](src/app/api/manual-entry/route.js)
- Frontend: [`src/app/student/manual-entry/page.js`](src/app/student/manual-entry/page.js)
- SQL: [`FIX_STORAGE_AND_MANUAL_ENTRY.sql`](FIX_STORAGE_AND_MANUAL_ENTRY.sql)
- Components: [`src/components/student/FileUpload.jsx`](src/components/student/FileUpload.jsx)
- Validation: [`src/lib/validation.js`](src/lib/validation.js)

---

## ✅ Status: COMPLETE

All issues have been identified, fixed, and documented. Ready for testing and deployment.

**Date:** December 11, 2025  
**Fixed By:** Kilo Code  
**Files Changed:** 7 files  
**New Files Created:** 2 files (SQL + this summary)