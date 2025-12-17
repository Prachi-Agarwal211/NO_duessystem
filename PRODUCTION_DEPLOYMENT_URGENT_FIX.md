# URGENT: Production Deployment Fix Guide

## 🚨 Current Issue

**Error:** POST `/api/student` returning 500 on production (`no-duessystem.onrender.com`)  
**Cause:** Production code is outdated - missing critical fixes we just applied

---

## ✅ Fixes Applied Locally (Need to Deploy)

1. ✅ Rate limiter fix in `/api/student` route
2. ✅ Zod validation migration (5 routes)
3. ✅ Manual entry upload fix (using `/api/upload`)
4. ✅ Deleted old validation system
5. ✅ Fixed rate limiter constant naming

---

## 🚀 Step-by-Step Production Fix

### Step 1: Verify Local Changes Work (2 minutes)

```bash
# 1. Install dependencies (if not done)
npm install

# 2. Start local server
npm run dev

# 3. Test at http://localhost:3000
# Try submitting a form - should work without 500 error
```

**Expected:** Form submission works locally ✅

---

### Step 2: Commit and Push Changes (3 minutes)

```bash
# 1. Check what files changed
git status

# 2. Add all changes
git add .

# 3. Commit with descriptive message
git commit -m "Fix: Critical production errors - Zod migration, rate limiter, upload API

- Fixed rate limiter return format (success vs allowed)
- Migrated 5 API routes to Zod validation
- Created /api/upload route for secure file uploads
- Fixed manual entry RLS violations
- Deleted old validation.js system
- Updated all email domains to @jecrcu.edu.in"

# 4. Push to main branch
git push origin main
```

---

### Step 3: Clear Render Build Cache & Deploy (5 minutes)

This is **CRITICAL** - Render often serves stale cached builds!

1. **Go to Render Dashboard:**
   - https://dashboard.render.com
   - Select service: `no-duessystem`

2. **Clear Build Cache:**
   - Click "Manual Deploy" dropdown
   - Select **"Clear build cache & deploy"** (NOT just "Deploy latest commit")
   - Click "Deploy"

3. **Wait for deployment:**
   - Watch logs for errors
   - Wait 5-10 minutes for build to complete
   - Look for "Your service is live" message

**Why clear cache?**
- Old `node_modules` can cache old files
- Stale builds cause API routes to not update
- This forces a complete rebuild

---

### Step 4: Verify Environment Variables on Render (3 minutes)

1. **Go to Environment section:**
   - Render Dashboard → `no-duessystem` → Environment

2. **Check these variables exist:**
   ```bash
   ✅ NEXT_PUBLIC_SUPABASE_URL
   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
   ⚠️ SUPABASE_SERVICE_ROLE_KEY  # CRITICAL - must be service_role, not anon!
   ✅ JWT_SECRET
   ✅ SMTP_HOST
   ✅ SMTP_PORT
   ✅ SMTP_SECURE
   ⚠️ SMTP_USER  # Your actual email
   ⚠️ SMTP_PASS  # Gmail App Password
   ✅ SMTP_FROM
   ✅ NEXT_PUBLIC_BASE_URL=https://no-duessystem.onrender.com
   ✅ NODE_ENV=production
   ```

3. **Most Common Issues:**
   - ❌ `SUPABASE_SERVICE_ROLE_KEY` is missing or is the anon key
   - ❌ `SMTP_USER` / `SMTP_PASS` not set (emails won't work)
   - ❌ `NEXT_PUBLIC_BASE_URL` is wrong (should be https://...)

---

### Step 5: Test Production After Deployment (5 minutes)

#### Test 1: Check API is responding
```bash
# Should return HTML, not 404
curl -I https://no-duessystem.onrender.com/

# Should return config data
curl https://no-duessystem.onrender.com/api/public/config
```

#### Test 2: Test student API
```bash
# Should return 400 (validation error), NOT 500
curl -X POST https://no-duessystem.onrender.com/api/student \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
```

**Expected responses:**
- ✅ 400 = Validation working (Zod rejecting invalid data)
- ❌ 500 = Still broken (cache not cleared or code not deployed)

#### Test 3: Open browser
```
https://no-duessystem.onrender.com
```

Try to submit a form. Check browser console for errors.

---

## 🔍 Troubleshooting Production Errors

### Error 1: Still getting 500 after deployment
**Cause:** Cache not cleared properly

**Fix:**
1. Render Dashboard → Settings → "Delete Service"? NO!
2. Instead: Manual Deploy → **Clear build cache & deploy** (try again)
3. Wait 10 minutes for full rebuild
4. Check deployment logs for errors

---

### Error 2: "JWT malformed" or "Invalid credentials"
**Cause:** Environment variables wrong

**Fix:**
```bash
# Check these in Render Environment section:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (LONG key, different from anon)
JWT_SECRET=dab703f47fc04382... (your actual secret)
```

---

### Error 3: "RLS policy violation" (file uploads)
**Cause:** Using anon key instead of service_role key

**Fix:**
1. Go to Supabase Dashboard:
   - https://supabase.com/dashboard/project/ycvorjengbxcikqcwjnv/settings/api
2. Copy **"service_role"** key (NOT "anon public")
3. Update in Render:
   - Environment → SUPABASE_SERVICE_ROLE_KEY
   - Paste the service_role key
4. Click "Save Changes"
5. Render will auto-redeploy

---

### Error 4: "Unexpected end of JSON input"
**Cause:** API returning non-JSON response (usually HTML error page)

**Fix:**
1. Check Render logs for actual error:
   - Render Dashboard → Logs
   - Look for stack traces or error messages
2. Common causes:
   - Missing dependency (run `npm install` locally first)
   - Syntax error in code
   - Environment variable missing

---

## 📊 Deployment Checklist

Before deploying to production:

```bash
# Local Testing
□ npm install (no errors)
□ npm run dev (server starts)
□ Test form submission locally (works)
□ Check browser console (no errors)

# Git
□ git status (check what's changed)
□ git add .
□ git commit -m "descriptive message"
□ git push origin main

# Render
□ Manual Deploy → Clear build cache & deploy
□ Wait for "Your service is live" (5-10 min)
□ Check deployment logs (no errors)

# Environment Variables
□ SUPABASE_SERVICE_ROLE_KEY set (service role, not anon)
□ SMTP credentials set (if using emails)
□ NEXT_PUBLIC_BASE_URL correct
□ NODE_ENV=production

# Production Testing
□ curl https://no-duessystem.onrender.com/ (returns HTML)
□ curl /api/public/config (returns JSON)
□ curl -X POST /api/student (returns 400, not 500)
□ Open browser, test form submission
□ Check browser console (no errors)
```

---

## 🎯 Quick Fix Commands

```bash
# 1. Commit all changes
git add . && git commit -m "Fix: Production API errors" && git push

# 2. While that pushes, open Render
# Go to: https://dashboard.render.com
# Click: Manual Deploy → Clear build cache & deploy

# 3. Wait 5-10 minutes, then test
curl -X POST https://no-duessystem.onrender.com/api/student \
  -H "Content-Type: application/json" \
  -d '{"test":"invalid"}'

# Expected: 400 (validation error) = FIXED ✅
# Got: 500 (server error) = Still broken ❌
```

---

## 📞 Still Not Working?

### Check Render Logs
```
Render Dashboard → Logs → Look for:
- "Error: Cannot find module..."  → Missing dependency
- "SyntaxError: ..."  → Code syntax error
- "TypeError: ..."  → Wrong data type
- Stack traces  → Shows exactly where error is
```

### Common Log Errors:

**Error:** `Cannot find module 'zod'`
**Fix:** `zod` not installed. Run `npm install zod` locally, commit, push.

**Error:** `Cannot read property 'success' of undefined`
**Fix:** Rate limiter not returning expected format. Already fixed in our code.

**Error:** `Invalid JWT`
**Fix:** `JWT_SECRET` not set in Render environment variables.

---

## 🚀 Expected Timeline

- **Commit & Push:** 1 minute
- **Render Build:** 5-10 minutes
- **Testing:** 5 minutes
- **Total:** ~15 minutes

---

## ✅ Success Indicators

After deployment succeeds:

```bash
# 1. API returns proper validation errors (not 500)
curl -X POST https://no-duessystem.onrender.com/api/student \
  -H "Content-Type: application/json" \
  -d '{}' \
# Returns: 400 with Zod validation error ✅

# 2. Form submission works in browser
# Open: https://no-duessystem.onrender.com
# Fill form, submit
# No 500 error, proper validation ✅

# 3. No console errors
# Browser console shows:
# - No red errors
# - API calls return 200 or 400 (not 500) ✅
```

---

## 📝 Summary

**The Problem:**
- Local code is fixed ✅
- Production code is outdated ❌
- Render is serving stale cached build ❌

**The Solution:**
1. Commit and push changes
2. Clear Render build cache
3. Wait for rebuild
4. Verify environment variables
5. Test production

**After this:**
- ✅ API routes work
- ✅ Validation works
- ✅ No more 500 errors
- ✅ Ready for testing

**Do this now to fix production!** 🚀