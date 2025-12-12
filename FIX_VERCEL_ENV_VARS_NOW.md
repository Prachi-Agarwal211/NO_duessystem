# Fix Vercel Environment Variables - URGENT

## ✅ Test Results Confirm

Your keys from `.env.local` **WORK PERFECTLY**:
- Supabase project is active ✅
- Anon key is valid ✅
- RLS policies are correct ✅
- Database tables exist ✅

**The issue:** Vercel Production doesn't have these keys!

---

## Step 1: Go to Vercel Dashboard

1. Open: https://vercel.com/dashboard
2. Find your project: `no-duessystem` or `jecrc-no-dues-system`
3. Click on the project

---

## Step 2: Add Environment Variables

1. Click **Settings** (top menu)
2. Click **Environment Variables** (left sidebar)
3. Add these **EXACT** variables for **Production**:

### Required Variables (Copy from .env.local):

```
Variable Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://jfqlpyrgkvzbmolvaycz.supabase.co
Environment: Production ✅
```

```
Variable Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls
Environment: Production ✅
```

```
Variable Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA3MDY4NCwiZXhwIjoyMDc5NjQ2Njg0fQ.YM_BKEjpeThLFd6ZtxLV2fNww7N6mO_uz8FHZjtOBhs
Environment: Production ✅
```

```
Variable Name: JWT_SECRET
Value: dab703f47fc04382d7559b03f2abebfc054d0ad09943c1eb9eab95266e90fd13
Environment: Production ✅
```

### SMTP Variables (For Email Notifications):

```
Variable Name: SMTP_HOST
Value: smtp.gmail.com
Environment: Production ✅
```

```
Variable Name: SMTP_PORT
Value: 587
Environment: Production ✅
```

```
Variable Name: SMTP_SECURE
Value: false
Environment: Production ✅
```

```
Variable Name: SMTP_USER
Value: noreply.nodues@jecrcu.edu.in
Environment: Production ✅
```

```
Variable Name: SMTP_PASS
Value: kwqo vora yeih rkce
Environment: Production ✅
```

```
Variable Name: SMTP_FROM
Value: JECRC No Dues <noreply.nodues@jecrcu.edu.in>
Environment: Production ✅
```

```
Variable Name: EMAIL_QUEUE_BATCH_SIZE
Value: 50
Environment: Production ✅
```

```
Variable Name: EMAIL_MAX_RETRIES
Value: 3
Environment: Production ✅
```

---

## Step 3: Redeploy

After adding ALL variables:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **⋮** (three dots) menu
4. Click **Redeploy**
5. Wait for deployment to complete (~2-3 minutes)

---

## Step 4: Test Production

After redeployment:

1. Open: https://no-duessystem.vercel.app/student/submit-form
2. Try the **Check** button with registration: `20BMLTN001`
3. Should work without 406 error! ✅
4. Try submitting a test form
5. Should work! ✅

---

## Why This Happened

- Your `.env.local` file is ONLY for local development
- Vercel Production has its own environment variables
- They were either:
  - Never set up
  - Set up with wrong values
  - Deleted accidentally

---

## Quick Verification After Deploy

Run this command to test production:

```powershell
# Test Check Button API (should return 200, not 406)
curl -v https://no-duessystem.vercel.app/api/student/can-edit?registration_number=20BMLTN001
```

Expected: HTTP 200 with JSON response
NOT: HTTP 406 Not Acceptable

---

## Important Notes

1. **All `NEXT_PUBLIC_*` variables** are exposed to the browser - that's by design
2. **`SUPABASE_SERVICE_ROLE_KEY`** is secret - only used in API routes
3. **SMTP credentials** are secret - only used server-side
4. After adding variables, **ALWAYS redeploy** - variables don't auto-update

---

## If Issues Persist

Check these in Vercel:

1. Go to **Deployments** → Latest deployment → **Environment Variables**
2. Verify all variables show up
3. Check if any are marked as "Preview" or "Development" only
4. Make sure **Production** checkbox is checked for each

---

## Timeline

- Adding variables: 5 minutes
- Redeployment: 2-3 minutes
- Testing: 2 minutes
- **Total: ~10 minutes to fix** 🚀

---

## After Successful Deploy

You should see:
- ✅ "Check" button works
- ✅ Forms submit successfully
- ✅ Email notifications send (or queue if SMTP has issues)
- ✅ No more 406 errors
- ✅ No more generic "Validation failed" errors

The improved error messages you added will show specific field errors if validation fails.