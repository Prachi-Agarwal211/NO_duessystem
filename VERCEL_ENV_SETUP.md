# 🔐 Vercel Environment Variables Setup Guide

## ⚠️ Important: Add Variables Manually in Vercel Dashboard

The `vercel.json` file does **NOT** automatically create environment variables. You must add them manually in the Vercel dashboard.

---

## 📝 Step-by-Step: Adding Environment Variables

### Method 1: Vercel Dashboard (Recommended)

1. **Go to your project in Vercel**
   - After importing: Click your project name
   - Or go to: https://vercel.com/[your-username]/[project-name]

2. **Navigate to Settings**
   - Click **"Settings"** tab at the top
   - Click **"Environment Variables"** in the left sidebar

3. **Add Each Variable Manually**

For each variable below, click **"Add New"** and enter:

#### Variable 1: Supabase URL
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://jfqlpyrgkvzbmolvaycz.supabase.co
Environment: ✅ Production ✅ Preview ✅ Development
```

#### Variable 2: Supabase Anon Key
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls
Environment: ✅ Production ✅ Preview ✅ Development
```

#### Variable 3: Supabase Service Role Key
```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA3MDY4NCwiZXhwIjoyMDc5NjQ2Njg0fQ.YM_BKEjpeThLFd6ZtxLV2fNww7N6mO_uz8FHZjtOBhs
Environment: ✅ Production (ONLY - sensitive!)
```

#### Variable 4: JWT Secret
```
Name: JWT_SECRET
Value: dab703f47fc04382d7559b03f2abebfc054d0ad09943c1eb9eab95266e90fd13
Environment: ✅ Production ✅ Preview ✅ Development
```

#### Variable 5: Resend API Key
```
Name: RESEND_API_KEY
Value: re_14KTpChV_5DdakpQJ9tb8ZPHeyH1eLxKJ
Environment: ✅ Production ✅ Preview ✅ Development
```

#### Variable 6: Resend From Email
```
Name: RESEND_FROM_EMAIL
Value: JECRC No Dues <onboarding@resend.dev>
Environment: ✅ Production ✅ Preview ✅ Development
```

#### Variable 7: Resend From
```
Name: RESEND_FROM
Value: JECRC No Dues <onboarding@resend.dev>
Environment: ✅ Production ✅ Preview ✅ Development
```

#### Variable 8: Library Email
```
Name: LIBRARY_EMAIL
Value: 15anuragsingh2003@gmail.com
Environment: ✅ Production ✅ Preview ✅ Development
```

#### Variable 9: Base URL (UPDATE AFTER DEPLOYMENT)
```
Name: NEXT_PUBLIC_BASE_URL
Value: https://your-project-name.vercel.app
Environment: ✅ Production ✅ Preview ✅ Development

⚠️ IMPORTANT: Update this AFTER your first deployment with your actual Vercel URL!
```

4. **Click "Save"** for each variable

---

## 🚀 Method 2: Bulk Import via .env File

1. **Go to Settings → Environment Variables**
2. Click **"Import .env"** button (if available)
3. Create a temporary file with this content:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jfqlpyrgkvzbmolvaycz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA3MDY4NCwiZXhwIjoyMDc5NjQ2Njg0fQ.YM_BKEjpeThLFd6ZtxLV2fNww7N6mO_uz8FHZjtOBhs
JWT_SECRET=dab703f47fc04382d7559b03f2abebfc054d0ad09943c1eb9eab95266e90fd13
RESEND_API_KEY=re_14KTpChV_5DdakpQJ9tb8ZPHeyH1eLxKJ
RESEND_FROM_EMAIL=JECRC No Dues <onboarding@resend.dev>
RESEND_FROM=JECRC No Dues <onboarding@resend.dev>
LIBRARY_EMAIL=15anuragsingh2003@gmail.com
NEXT_PUBLIC_BASE_URL=https://your-project-name.vercel.app
```

4. Upload this file
5. Select environments (Production, Preview, Development)
6. Click "Import"

---

## 📋 Checklist: Verify All Variables

After adding, you should see **9 environment variables** in your Vercel dashboard:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `JWT_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM_EMAIL`
- [ ] `RESEND_FROM`
- [ ] `LIBRARY_EMAIL`
- [ ] `NEXT_PUBLIC_BASE_URL`

---

## 🔄 After Adding Variables

### Step 1: Redeploy
- Go to **Deployments** tab
- Click the **three dots** (⋯) on latest deployment
- Click **"Redeploy"**
- Wait 2-3 minutes

### Step 2: Update Base URL
1. After deployment, copy your Vercel URL (e.g., `https://jecrc-no-dues-system.vercel.app`)
2. Go back to **Settings → Environment Variables**
3. Find `NEXT_PUBLIC_BASE_URL`
4. Click **"Edit"**
5. Update value to your actual Vercel URL
6. Click **"Save"**
7. **Redeploy again** (Important!)

---

## 🎯 Environment Types Explained

### Production
- Used when you deploy to `main` branch
- Live app that users access
- **Most sensitive** - use production keys

### Preview
- Used for pull requests and feature branches
- Test environment before merging
- Can use same keys as production or separate test keys

### Development
- Used when running `vercel dev` locally
- Not critical, but convenient for local testing
- Can use same keys or local test database

---

## 🔐 Security Best Practices

### ✅ DO:
- Add `SUPABASE_SERVICE_ROLE_KEY` to **Production only**
- Use different keys for dev/production (if possible)
- Rotate keys every 3 months
- Keep `.env.local` in `.gitignore`

### ❌ DON'T:
- Never commit `.env.local` to Git
- Don't share service role key publicly
- Don't use production keys in development
- Don't hardcode secrets in code

---

## 🐛 Troubleshooting

### Error: "Environment Variable references Secret that does not exist"

**This error occurs because:**
- You tried to use `@secret_name` syntax in `vercel.json`
- Secrets must be created manually first

**Solution:**
✅ Remove the `env` section from `vercel.json` (already done!)
✅ Add variables manually in Vercel dashboard (follow this guide)

### Error: "NEXT_PUBLIC_SUPABASE_URL is not defined"

**Cause:** Variable not added or not deployed

**Solution:**
1. Check Settings → Environment Variables
2. Verify variable exists
3. Redeploy the project

### Error: "Failed to connect to Supabase"

**Cause:** Wrong URL or key

**Solution:**
1. Verify variables in Vercel dashboard
2. Check Supabase dashboard for correct keys
3. Ensure no extra spaces in values
4. Redeploy after fixing

---

## 📊 Quick Reference Table

| Variable Name | Sensitive? | Required For | Where to Get |
|---------------|------------|--------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | No | All requests | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Client auth | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ YES | Admin ops | Supabase → Settings → API |
| `JWT_SECRET` | ⚠️ YES | Token signing | Generate: `openssl rand -hex 32` |
| `RESEND_API_KEY` | ⚠️ YES | Send emails | Resend → API Keys |
| `RESEND_FROM_EMAIL` | No | Email sender | Your verified email |
| `RESEND_FROM` | No | Email sender | Your verified email |
| `LIBRARY_EMAIL` | No | Notifications | Department email |
| `NEXT_PUBLIC_BASE_URL` | No | Links/redirects | Your Vercel URL |

---

## 🎓 Why Manual Setup?

**You might wonder:** "Why can't `vercel.json` add these automatically?"

**Answer:**
- Environment variables contain **sensitive data**
- Storing them in `vercel.json` would commit them to Git
- This would expose secrets publicly (security risk!)
- Vercel's best practice: Store secrets in dashboard only
- Git only tracks **configuration**, not **secrets**

---

## ✅ Verification

After adding all variables and redeploying, test:

1. **Visit your app:** `https://your-project-name.vercel.app`
2. **Check console:** Press F12, look for errors
3. **Test login:** Try staff/admin login
4. **Submit form:** Test student form submission
5. **Check emails:** Verify notifications are sent

If everything works ✅ You're done!

---

## 📞 Need Help?

If variables still don't work:

1. **Check Vercel Logs:**
   - Go to Deployments → Click deployment → Logs
   - Look for "undefined" or "not found" errors

2. **Verify in Build Logs:**
   - During deployment, check if variables are recognized
   - Should NOT see warnings about missing env vars

3. **Test Locally:**
   ```bash
   vercel env pull .env.local
   npm run dev
   ```

---

## 🎉 Summary

**Steps to Success:**

1. ✅ Go to Vercel Dashboard
2. ✅ Settings → Environment Variables
3. ✅ Add all 9 variables manually
4. ✅ Select correct environments
5. ✅ Save each variable
6. ✅ Redeploy project
7. ✅ Update `NEXT_PUBLIC_BASE_URL` after deployment
8. ✅ Redeploy again
9. ✅ Test your app

**Time Required:** ~5 minutes
**Difficulty:** Easy ⭐

---

**Last Updated:** 2025-12-10
**Status:** Manual setup required - `vercel.json` env references removed