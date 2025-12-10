# 🚀 Quick Start - Deploy in 5 Minutes

## For Developers Who Want to Deploy FAST

### Prerequisites (2 minutes)
- ✅ GitHub account
- ✅ Code pushed to GitHub repository

### Step 1: Sign Up for Vercel (1 minute)
1. Go to **https://vercel.com/signup**
2. Click **"Continue with GitHub"**
3. Authorize Vercel

### Step 2: Import Project (1 minute)
1. Click **"Add New Project"**
2. Select **jecrc-no-dues-system** repository
3. Vercel auto-detects Next.js settings ✅

### Step 3: Add Environment Variables (2 minutes)
Click **"Environment Variables"** and paste these (update values from your `.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://jfqlpyrgkvzbmolvaycz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=JECRC No Dues <onboarding@resend.dev>
LIBRARY_EMAIL=15anuragsingh2003@gmail.com
NEXT_PUBLIC_BASE_URL=https://your-app-name.vercel.app
```

### Step 4: Deploy (1 minute)
1. Click **"Deploy"**
2. Wait ~2 minutes
3. ✅ **DONE!** Your app is live

### Step 5: Update Base URL (30 seconds)
1. Copy your Vercel URL
2. Go to **Settings → Environment Variables**
3. Edit `NEXT_PUBLIC_BASE_URL` to your Vercel URL
4. Click **Redeploy**

---

## 🎉 Success!
Your app is now live at: `https://your-project-name.vercel.app`

**Next Steps:**
- Test admin login: `/staff/login`
- Test student form: `/student/submit-form`
- Configure Supabase CORS (add your Vercel URL)

**Need detailed instructions?** See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

**Want to compare hosting options?** See [README_HOSTING.md](README_HOSTING.md)

---

## 🔥 What You Get (FREE)
- ✅ 100 GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Auto-deploy on Git push
- ✅ Preview deployments
- ✅ Analytics
- ✅ Zero configuration

**Total Time:** ~5 minutes from start to production! 🚀