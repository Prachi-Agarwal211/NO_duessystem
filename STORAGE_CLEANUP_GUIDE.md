# 🗑️ STORAGE BUCKET CLEANUP - STEP BY STEP GUIDE

## 🎯 Purpose
Remove orphaned files from Supabase storage buckets that are no longer referenced in the database.

---

## 📋 METHODS TO RUN CLEANUP

### METHOD 1: Using cURL (Command Line) - RECOMMENDED

#### Step 1: Get Your Admin Token

1. **Log in to your admin dashboard:**
   ```
   https://your-domain.com/admin
   ```

2. **Open Browser Developer Tools:**
   - Press `F12` (or right-click → Inspect)
   - Go to **Console** tab

3. **Run this command to get your token:**
   ```javascript
   localStorage.getItem('supabase.auth.token')
   ```

4. **Copy the token** (long string starting with `eyJ...`)

#### Step 2: Analyze Storage (Dry Run)

Open terminal/command prompt and run:

```bash
curl -X GET https://your-domain.vercel.app/api/admin/cleanup-storage \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Replace:**
- `your-domain.vercel.app` with your actual domain
- `YOUR_TOKEN_HERE` with the token from Step 1

**Example Response:**
```json
{
  "success": true,
  "analysis": {
    "referencedFilesCount": 50,
    "buckets": {
      "certificates": {
        "totalFiles": 45,
        "referencedFiles": 40,
        "orphanedFiles": 5,
        "orphanedList": ["file1.pdf", "file2.pdf"]
      },
      "manual-certificates": {
        "totalFiles": 10,
        "referencedFiles": 8,
        "orphanedFiles": 2
      },
      "alumni-screenshots": {
        "totalFiles": 5,
        "referencedFiles": 5,
        "orphanedFiles": 0
      }
    }
  }
}
```

#### Step 3: Execute Cleanup (Delete Orphaned Files)

**⚠️ WARNING: This will permanently delete files!**

```bash
curl -X POST https://your-domain.vercel.app/api/admin/cleanup-storage \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Storage cleanup complete. Deleted 7 orphaned files.",
  "results": {
    "certificates": {
      "checked": 45,
      "orphaned": 5,
      "deleted": 5,
      "errors": []
    },
    "manualCertificates": {
      "checked": 10,
      "orphaned": 2,
      "deleted": 2,
      "errors": []
    },
    "alumniScreenshots": {
      "checked": 5,
      "orphaned": 0,
      "deleted": 0,
      "errors": []
    }
  },
  "summary": {
    "totalFilesChecked": 60,
    "totalOrphaned": 7,
    "totalDeleted": 7,
    "hasErrors": false
  }
}
```

---

### METHOD 2: Using Postman/Thunder Client

1. **Create new request:**
   - Method: `GET` (for analysis) or `POST` (for cleanup)
   - URL: `https://your-domain.vercel.app/api/admin/cleanup-storage`

2. **Add Headers:**
   ```
   Authorization: Bearer YOUR_TOKEN_HERE
   Content-Type: application/json
   ```

3. **Send Request**

4. **Review Response**

---

### METHOD 3: Using Admin Dashboard UI (After deploying component)

See the UI component below that can be added to admin dashboard.

---

### METHOD 4: Manual Cleanup in Supabase

If API doesn't work, clean up manually:

1. **Open Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_ID
   ```

2. **Go to Storage:**
   - Click **Storage** in left sidebar
   - Select each bucket

3. **Review Each Bucket:**
   - `certificates`
   - `manual-certificates`
   - `alumni-screenshots`

4. **Compare with Database:**
   - Run this SQL query to get all referenced files:
   ```sql
   SELECT 
     certificate_url,
     manual_certificate_url,
     alumni_screenshot_url
   FROM no_dues_forms
   WHERE certificate_url IS NOT NULL 
      OR manual_certificate_url IS NOT NULL
      OR alumni_screenshot_url IS NOT NULL;
   ```

5. **Delete Unreferenced Files:**
   - Select files not in database results
   - Click Delete

---

## 🔍 VERIFICATION

After cleanup, verify:

```bash
# Run analysis again
curl -X GET https://your-domain.vercel.app/api/admin/cleanup-storage \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Expected Result:**
```json
{
  "analysis": {
    "buckets": {
      "certificates": { "orphanedFiles": 0 },
      "manualCertificates": { "orphanedFiles": 0 },
      "alumniScreenshots": { "orphanedFiles": 0 }
    }
  }
}
```

All buckets should show `orphanedFiles: 0` ✅

---

## ⚠️ IMPORTANT NOTES

1. **Token Expiry:**
   - Auth tokens expire after some time
   - If you get 401 error, get a new token

2. **Permissions:**
   - Only admin users can run cleanup
   - Non-admin will get 403 Forbidden error

3. **Backup:**
   - Consider downloading important files before cleanup
   - Deletion is permanent and cannot be undone

4. **Dry Run First:**
   - Always run `GET` (analysis) before `POST` (cleanup)
   - Review what will be deleted

5. **Network Timeout:**
   - Large buckets may take time
   - Be patient, don't run multiple times

---

## 🐛 TROUBLESHOOTING

### Error: 401 Unauthorized
**Cause:** Token expired or invalid  
**Solution:** Get a new token from localStorage

### Error: 403 Forbidden
**Cause:** User is not admin  
**Solution:** Log in with admin account

### Error: Network timeout
**Cause:** Too many files, request timeout  
**Solution:** Use manual cleanup in Supabase dashboard

### Error: Bucket not found
**Cause:** Storage bucket doesn't exist  
**Solution:** Create bucket in Supabase Storage settings

### No orphaned files found
**Result:** ✅ This is good! Storage is clean

---

## 📊 EXPECTED STORAGE SAVINGS

Typical cleanup results:
- Small system (< 100 forms): 5-10 files, ~5-10 MB
- Medium system (100-1000 forms): 20-50 files, ~20-50 MB
- Large system (> 1000 forms): 50-200 files, ~50-200 MB

---

## ✅ SUCCESS CHECKLIST

After cleanup:
- [ ] Ran analysis (GET request)
- [ ] Reviewed orphaned files list
- [ ] Ran cleanup (POST request)
- [ ] Verified all buckets show 0 orphaned files
- [ ] No errors in response
- [ ] Tested file access on website (certificates still downloadable)
- [ ] Storage usage reduced in Supabase dashboard

---

## 🎯 QUICK REFERENCE

**Analyze (Safe):**
```bash
curl -X GET https://YOUR-DOMAIN/api/admin/cleanup-storage \
  -H "Authorization: Bearer TOKEN"
```

**Cleanup (Deletes Files):**
```bash
curl -X POST https://YOUR-DOMAIN/api/admin/cleanup-storage \
  -H "Authorization: Bearer TOKEN"
```

**Get Token:**
```javascript
// In browser console (F12)
localStorage.getItem('supabase.auth.token')