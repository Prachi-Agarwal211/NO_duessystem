# 🔴 CRITICAL: Production API Errors - Complete Fix Guide

## Current Production Errors

Based on your console logs, you have 3 critical errors:

### 1. **404 Error**: `/api/convocation/validate`
```
POST https://no-duessystem.onrender.com/api/convocation/validate 404 (Not Found)
```

### 2. **500 Error**: `/api/student`
```
POST https://no-duessystem.onrender.com/api/student 500 (Internal Server Error)
```

### 3. **JSON Parse Error**
```
Failed to execute 'json' on 'Response': Unexpected end of JSON input
```

---

## Root Cause Analysis

### Problem 1: Routes Not Deployed Properly

**Why 404 happens even though route exists:**
- The file `src/app/api/convocation/validate/route.js` exists in your codebase
- But Render might not have built it correctly
- Common causes:
  - Stale build cache
  - File added after last deployment
  - Build process not picking up new API routes

### Problem 2: `/api/student` Returning 500

The route exists and code looks correct, but it's failing. Possible causes:

1. **Missing Environment Variables** on Render:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Import Errors**: The route imports from:
   - `@/lib/emailService`
   - `@/lib/rateLimiter`
   - `@/lib/validation`
   - `@/lib/urlHelper`
   
   If any of these files are missing or have errors, the route returns 500.

3. **Database Issues**: Missing tables or RLS policies

### Problem 3: Non-JSON Response

When a Next.js API route crashes during import/build, it returns an **HTML error page** instead of JSON. Your frontend tries to parse this HTML as JSON and fails with "Unexpected end of JSON input".

---

## 🔧 IMMEDIATE FIX STEPS

### Step 1: Clear Render Build Cache

**This is the most important step - fixes 90% of API 404/500 errors**

1. Go to: https://dashboard.render.com
2. Find your service: `no-duessystem`
3. Click **"Manual Deploy"** button
4. Select: **"Clear build cache & deploy"**
5. Wait for deployment to complete (5-10 minutes)

This ensures:
- All new API routes are discovered
- All imports are freshly resolved
- No stale cached files causing 404s

---

### Step 2: Verify Environment Variables on Render

Go to your Render service → **Environment** tab and ensure these exist:

```bash
# Required for ALL API routes
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key

# Required for email functionality
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password

# Optional but recommended
NODE_ENV=production
```

**Critical**: The `SUPABASE_SERVICE_ROLE_KEY` must be the **service role key**, NOT the anon key!

---

### Step 3: Check Required Library Files Exist

Ensure these files exist and have no syntax errors:

```bash
src/lib/emailService.js       ← Email notifications
src/lib/rateLimiter.js        ← Rate limiting
src/lib/validation.js         ← Form validation
src/lib/urlHelper.js          ← URL generation
src/lib/supabaseAdmin.js      ← Admin Supabase client
```

If any are missing, the `/api/student` route will crash on import.

---

### Step 4: Test Locally First

Before deploying, test that both APIs work locally:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test convocation validate API
curl -X POST http://localhost:3000/api/convocation/validate \
  -H "Content-Type: application/json" \
  -d '{"registration_no":"21BCON747"}'

# Should return:
# {"valid":true,"student":{...}} or {"valid":false,"error":"..."}

# Test student submission API
curl -X POST http://localhost:3000/api/student \
  -H "Content-Type: application/json" \
  -d '{
    "registration_no":"TEST123",
    "student_name":"Test Student",
    "contact_no":"9876543210",
    "school":"uuid-here",
    "course":"uuid-here",
    "branch":"uuid-here",
    "personal_email":"test@example.com",
    "college_email":"test@jecrc.ac.in"
  }'
```

If either fails locally, fix the errors before deploying.

---

## 🗄️ Database Issues to Check

### Missing Tables

Ensure these tables exist in Supabase:

```sql
-- Check if convocation table exists
SELECT EXISTS (
   SELECT FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename = 'convocation_eligible_students'
);

-- Check if forms table exists
SELECT EXISTS (
   SELECT FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename = 'no_dues_forms'
);
```

If either returns `false`, run the complete database setup SQL.

---

## 📤 Deployment Checklist

Before marking this as "fixed", verify:

- [ ] Ran "Clear build cache & deploy" on Render
- [ ] All environment variables set correctly
- [ ] Both APIs return JSON responses (not HTML error pages)
- [ ] `/api/convocation/validate` returns 200 OK for valid registration numbers
- [ ] `/api/convocation/validate` returns 404 with JSON for invalid registration numbers
- [ ] `/api/student` returns 201 Created for valid form submissions
- [ ] `/api/student` returns 400 with JSON for validation errors
- [ ] Frontend forms no longer throw "Unexpected end of JSON input"

---

## 🔍 How to Debug After Deployment

### Check Render Logs

1. Go to Render dashboard → Your service
2. Click **"Logs"** tab
3. Look for errors during:
   - **Build phase**: `npm run build`
   - **Runtime phase**: API route errors

### Common Log Errors and Fixes

| Error in Logs | Cause | Fix |
|---------------|-------|-----|
| `Cannot find module '@/lib/...'` | Missing library file | Create the file or fix import path |
| `SUPABASE_SERVICE_ROLE_KEY is not defined` | Missing env var | Add to Render environment |
| `relation "convocation_eligible_students" does not exist` | Table not created | Run database setup SQL |
| `Route /api/convocation/validate not found` | Build cache issue | Clear cache and redeploy |

---

## 🚨 Emergency Quick Fix

If you need the site working **RIGHT NOW** and can't wait for proper fixes:

### Option A: Disable Convocation Validation (Temporary)

In `src/app/student/manual-entry/page.js`, comment out the validation call:

```javascript
// Lines 67-114: Comment out the entire validateConvocation function
const validateConvocation = async (registration_no) => {
  // Temporarily disabled - always allow submission
  console.log('Convocation validation temporarily disabled');
  setConvocationValid(null);
  return;
  
  // ... rest of function commented out
};
```

### Option B: Add Error Boundaries

Wrap API calls in try-catch with user-friendly fallbacks:

```javascript
try {
  const response = await fetch('/api/convocation/validate', {...});
  if (!response.ok) {
    console.warn('Convocation validation unavailable, proceeding anyway');
    return; // Allow form submission to continue
  }
  const result = await response.json();
  // ... handle result
} catch (error) {
  console.error('Validation failed, proceeding without it:', error);
  // Don't block form submission
}
```

---

## ✅ Success Criteria

Your production system is fixed when:

1. ✅ Form submission page loads without console errors
2. ✅ Registration number validation returns proper JSON responses
3. ✅ Form submission returns JSON (either success or validation error)
4. ✅ No "Unexpected end of JSON input" errors
5. ✅ No "T.warn is not a function" errors
6. ✅ All API routes return JSON, never HTML error pages

---

## 📞 If Still Broken After All Steps

If the site is still broken after:
- Clearing build cache ✅
- Verifying environment variables ✅
- Checking logs ✅

Then share:
1. **Render build logs** (last 100 lines)
2. **Render runtime logs** when you try to submit a form
3. Screenshot of your Render Environment Variables tab
4. Result of testing APIs locally with curl commands above

This will help identify the exact root cause.