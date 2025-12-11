# Frontend Cache Issue - Invalid School UUID

## Problem Identified

**Error from logs:**
```
Invalid school ID: 02f4ff5c-6916-48b4-8e10-80564544a6d7
Cannot coerce the result to a single JSON object (0 rows found)
```

**Root Cause:** Browser has cached old school/course/branch data with UUIDs that no longer exist in the database.

**Current Database:** Has 13 schools with DIFFERENT UUIDs (none matching `02f4ff5c-6916-48b4-8e10-80564544a6d7`)

---

## Solution: Clear All Caches

### Step 1: Clear Browser Cache (User Action Required)

#### For Chrome:
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "All time" for time range
3. Check:
   - ✅ Cookies and other site data
   - ✅ Cached images and files
4. Click "Clear data"
5. Close and reopen browser

#### For Firefox:
1. Press `Ctrl + Shift + Delete`
2. Select "Everything" for time range
3. Check:
   - ✅ Cookies
   - ✅ Cache
4. Click "Clear Now"

#### For Edge:
1. Press `Ctrl + Shift + Delete`
2. Select "All time"
3. Check:
   - ✅ Cookies and site data
   - ✅ Cached images and files
4. Click "Clear now"

---

### Step 2: Hard Refresh the Form Page

After clearing cache:

1. Go to: https://no-duessystem.vercel.app/student/submit-form
2. Press `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)
3. This forces a fresh load bypassing all cache

---

### Step 3: Verify Fresh Data Loaded

Open browser console (F12) and check:

```javascript
// In Console tab, run:
fetch('https://no-duessystem.vercel.app/api/public/config?type=schools')
  .then(r => r.json())
  .then(d => console.log('Schools:', d.data))
```

**Expected output:** Should show 13 schools with current UUIDs starting with:
- `8d822f1d...` (Directorate of Executive Education)
- `c9614005...` (Jaipur School of Business)
- etc.

**If you see** `02f4ff5c...` - cache NOT cleared, repeat Step 1

---

### Step 4: Test Form Submission

1. Select a school from dropdown
2. Select a course
3. Select a branch
4. Fill remaining fields
5. Submit form

**Expected:** HTTP 201 success (form created)
**If still fails:** UUID `02f4ff5c...` means cache persists

---

## Alternative Solution: Incognito/Private Mode

If cache issues persist:

1. Open **Incognito/Private window** (Ctrl + Shift + N)
2. Go to: https://no-duessystem.vercel.app/student/submit-form
3. Try submitting form

This uses NO cache, so will definitely use fresh data.

---

## Developer Solution: Add Cache Busting

To prevent this issue in future, add cache-busting headers to the config API:

**File:** `src/app/api/public/config/route.js` (Line 1)

```javascript
export const dynamic = 'force-dynamic';  // Already present ✅
export const runtime = 'nodejs';         // Already present ✅
```

These headers are ALREADY set, which means:
- API should NOT be cached
- Fresh data on every request

**Conclusion:** The caching is happening in the **browser's localStorage or React state**, not the API response.

---

## Frontend Fix: Clear localStorage on Page Load

If the frontend caches school data in localStorage, we need to add version checking.

### Check if localStorage is used:

Open browser console on form page:
```javascript
// Check what's stored
console.log(localStorage);
console.log(sessionStorage);
```

If you see cached school data, clear it:
```javascript
localStorage.clear();
sessionStorage.clear();
```

Then refresh page.

---

## Production Deployment Note

After deploying new database changes (new schools/courses/branches), users may experience this issue until they:
1. Clear browser cache, OR
2. Hard refresh, OR  
3. Close and reopen browser

**Best practice:** Add a "data version" check in frontend to auto-clear cache when database schema changes.

---

## Summary

**Issue:** Browser cached old school UUID `02f4ff5c-6916-48b4-8e10-80564544a6d7`

**Database has:** 13 different schools with NEW UUIDs

**Solution:** User must clear browser cache and hard refresh

**Quick fix:** Use incognito/private mode to test with zero cache

**Verification:** Run diagnostic script confirmed all data exists:
- ✅ 13 schools
- ✅ 28 courses  
- ✅ 139 branches
- ✅ 10 departments

**Next action:** Clear cache and retry form submission