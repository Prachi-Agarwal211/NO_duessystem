# 🚀 JECRC No Dues System - Production Deployment Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Vercel Dashboard Deployment](#vercel-dashboard-deployment)
3. [Environment Variables Setup](#environment-variables-setup)
4. [Post-Deployment Configuration](#post-deployment-configuration)
5. [Testing Your Deployment](#testing-your-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance & Updates](#maintenance--updates)

---

## ✅ Prerequisites

Before deploying, ensure you have:

- ✅ GitHub account
- ✅ Supabase project configured
- ✅ Resend API key for email notifications
- ✅ All database tables and RLS policies set up
- ✅ Your code pushed to GitHub repository

---

## 🎯 Vercel Dashboard Deployment (Recommended)

### Step 1: Sign Up for Vercel

1. Go to **https://vercel.com/signup**
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your repositories

### Step 2: Import Your Project

1. Click **"Add New Project"** or **"Import Project"**
2. Select your **jecrc-no-dues-system** repository
3. Vercel will auto-detect it's a Next.js project

### Step 3: Configure Build Settings

Vercel will auto-configure these (verify they match):

```
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### Step 4: Add Environment Variables

Click **"Environment Variables"** and add all variables from `.env.production`:

#### Required Variables:

```env
NEXT_PUBLIC_SUPABASE_URL = https://jfqlpyrgkvzbmolvaycz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls
SUPABASE_SERVICE_ROLE_KEY = [your-service-role-key]
JWT_SECRET = dab703f47fc04382d7559b03f2abebfc054d0ad09943c1eb9eab95266e90fd13
RESEND_API_KEY = re_14KTpChV_5DdakpQJ9tb8ZPHeyH1eLxKJ
RESEND_FROM_EMAIL = JECRC No Dues <onboarding@resend.dev>
RESEND_FROM = JECRC No Dues <onboarding@resend.dev>
LIBRARY_EMAIL = 15anuragsingh2003@gmail.com
NEXT_PUBLIC_BASE_URL = https://your-project-name.vercel.app
```

**Important:** Select **"Production"** environment for all variables.

### Step 5: Deploy

1. Click **"Deploy"** button
2. Wait 2-3 minutes for build completion
3. You'll get a URL like: `https://jecrc-no-dues-system.vercel.app`

---

## 🔧 Environment Variables Setup

### Method 1: Via Vercel Dashboard (Easiest)

1. Go to: **Project Settings → Environment Variables**
2. Click **"Add New"**
3. Paste variable name and value
4. Select environment: **Production**, **Preview**, **Development**
5. Click **"Save"**

### Method 2: Via Vercel CLI (Advanced)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Add variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... repeat for all variables
```

### Method 3: Bulk Import via .env File

1. Go to: **Project Settings → Environment Variables**
2. Click **"Import .env"**
3. Upload your `.env.production` file
4. Review and confirm

---

## 🔄 Post-Deployment Configuration

### 1. Update Base URL

After deployment, update the `NEXT_PUBLIC_BASE_URL`:

1. Copy your Vercel URL (e.g., `https://jecrc-no-dues-system.vercel.app`)
2. Go to: **Project Settings → Environment Variables**
3. Edit `NEXT_PUBLIC_BASE_URL` to your actual URL
4. Go to: **Deployments** → Click three dots → **Redeploy**

### 2. Configure Supabase CORS

1. Go to: **Supabase Dashboard → Settings → API**
2. Under **"CORS Allowed Origins"**, add:
   ```
   https://jecrc-no-dues-system.vercel.app
   https://*.vercel.app
   ```
3. Click **"Save"**

### 3. Update Supabase Authentication

1. Go to: **Supabase Dashboard → Authentication → URL Configuration**
2. Add your Vercel URL to:
   - Site URL: `https://jecrc-no-dues-system.vercel.app`
   - Redirect URLs: `https://jecrc-no-dues-system.vercel.app/**`

### 4. Configure Custom Domain (Optional)

1. Go to: **Vercel Project Settings → Domains**
2. Click **"Add"**
3. Enter your domain: `nodues.jecrc.ac.in`
4. Follow DNS configuration instructions:
   ```
   Type: CNAME
   Name: nodues (or @)
   Value: cname.vercel-dns.com
   ```
5. Wait for DNS propagation (5-60 minutes)
6. SSL certificate auto-provisions

---

## 🧪 Testing Your Deployment

### 1. Basic Functionality Tests

Visit your deployment URL and test:

- ✅ **Homepage loads:** `https://your-app.vercel.app`
- ✅ **Student form:** `/student/submit-form`
- ✅ **Check status:** `/student/check-status`
- ✅ **Staff login:** `/staff/login`
- ✅ **Admin panel:** `/admin` (requires login)

### 2. Authentication Tests

Test all user roles:

```
Admin Login:
- Go to /staff/login
- Login with admin credentials
- Verify access to /admin dashboard

Staff Login:
- Login with department credentials
- Verify access to /staff/dashboard
- Test application approval/rejection

Student Access:
- Submit a no dues form
- Check status with form ID
- Verify email notifications
```

### 3. API Endpoint Tests

Test critical APIs:

- ✅ `/api/student` - Submit form
- ✅ `/api/staff/dashboard` - Staff data
- ✅ `/api/admin/stats` - Admin statistics
- ✅ `/api/certificate/generate` - PDF generation
- ✅ `/api/notify` - Email notifications

### 4. Performance Tests

Check loading times:

- First page load: < 3 seconds
- Subsequent navigations: < 1 second
- API responses: < 500ms
- Image loading: Optimized

### 5. Mobile Responsiveness

Test on different devices:

- Mobile (320px - 480px)
- Tablet (481px - 768px)
- Desktop (769px+)

---

## 🐛 Troubleshooting

### Build Failures

**Error: "Build failed"**
```bash
# Check build logs in Vercel dashboard
# Common fixes:

# 1. Missing dependencies
npm install

# 2. Environment variables missing
# Add all required variables in Vercel dashboard

# 3. Next.js version mismatch
npm install next@latest

# 4. Clear cache and redeploy
# In Vercel: Settings → Clear Cache → Redeploy
```

### Runtime Errors

**Error: "Supabase connection failed"**
```
Fix:
1. Verify NEXT_PUBLIC_SUPABASE_URL in environment variables
2. Check Supabase project is active
3. Verify API keys are correct
4. Check CORS settings in Supabase
```

**Error: "Email notifications not working"**
```
Fix:
1. Verify RESEND_API_KEY is set
2. Check Resend dashboard for API limits
3. Verify sender email is verified in Resend
4. Check email addresses in environment variables
```

**Error: "Authentication redirects failing"**
```
Fix:
1. Update NEXT_PUBLIC_BASE_URL to correct Vercel URL
2. Check Supabase redirect URLs configuration
3. Verify middleware.js is deployed correctly
```

### Performance Issues

**Slow page loads:**
```
1. Enable Vercel Analytics:
   - Go to Project Settings → Analytics
   - Review Core Web Vitals
   
2. Optimize images:
   - Use Next.js Image component
   - Already configured in next.config.mjs
   
3. Check Supabase query performance:
   - Review database indexes
   - Optimize RLS policies
```

### Database Connection Issues

```sql
-- Verify RLS policies are not blocking queries
-- In Supabase SQL Editor:

-- Check if policies exist
SELECT * FROM pg_policies WHERE tablename = 'applications';

-- Test policy
SELECT * FROM applications LIMIT 1;

-- If blocked, review and update policies
```

---

## 🔄 Maintenance & Updates

### Automatic Deployments

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main

# Vercel automatically:
# 1. Detects push
# 2. Builds project
# 3. Runs tests
# 4. Deploys to production
```

### Preview Deployments

Every branch gets a preview URL:

```bash
# Create feature branch
git checkout -b feature/new-dashboard

# Push changes
git push origin feature/new-dashboard

# Vercel creates preview URL:
# https://jecrc-no-dues-system-git-feature-new-dashboard.vercel.app
```

### Rollback

If something breaks:

1. Go to: **Vercel Dashboard → Deployments**
2. Find last working deployment
3. Click **three dots** → **Promote to Production**

### Monitoring

Enable monitoring tools:

1. **Vercel Analytics** (Free):
   - Project Settings → Analytics → Enable
   
2. **Supabase Logs**:
   - Dashboard → Logs → Monitor queries
   
3. **Error Tracking**:
   - Vercel automatically captures errors
   - View in: Deployments → Click deployment → Logs

### Performance Optimization

```javascript
// Already configured in next.config.mjs:
- ✅ SWC minification
- ✅ Code splitting
- ✅ Image optimization
- ✅ Compression enabled
- ✅ Security headers
```

### Database Backups

Schedule regular backups:

1. **Supabase Dashboard → Settings → Backups**
2. Enable daily backups
3. Download backups monthly

### Security Updates

```bash
# Update dependencies monthly
npm update

# Check for vulnerabilities
npm audit

# Fix critical issues
npm audit fix

# Push updates
git add package*.json
git commit -m "Update dependencies"
git push
```

---

## 📊 Production Checklist

Before going live, verify:

### Code Quality
- [ ] All tests passing
- [ ] No console errors
- [ ] ESLint errors fixed
- [ ] Code reviewed

### Security
- [ ] Environment variables set correctly
- [ ] No secrets in code
- [ ] HTTPS enabled (automatic)
- [ ] Security headers configured
- [ ] RLS policies tested
- [ ] Authentication working

### Performance
- [ ] Images optimized
- [ ] Lighthouse score > 90
- [ ] API responses < 500ms
- [ ] First load < 3 seconds

### Functionality
- [ ] All routes accessible
- [ ] Forms submitting correctly
- [ ] Email notifications working
- [ ] PDF generation working
- [ ] QR codes generating
- [ ] File uploads working

### Database
- [ ] RLS policies enabled
- [ ] Indexes created
- [ ] Backups configured
- [ ] Connection pooling optimal

### Monitoring
- [ ] Analytics enabled
- [ ] Error tracking active
- [ ] Logs accessible
- [ ] Alerts configured

---

## 🎉 Success!

Your JECRC No Dues System is now live at:
**https://your-project-name.vercel.app**

### Next Steps:

1. ✅ Share URL with stakeholders
2. ✅ Monitor first week performance
3. ✅ Collect user feedback
4. ✅ Plan improvements
5. ✅ Schedule regular maintenance

### Support Resources:

- **Vercel Documentation:** https://vercel.com/docs
- **Next.js Documentation:** https://nextjs.org/docs
- **Supabase Documentation:** https://supabase.com/docs
- **Resend Documentation:** https://resend.com/docs

---

## 📞 Getting Help

If you encounter issues:

1. Check Vercel deployment logs
2. Review Supabase logs
3. Check browser console for errors
4. Review this guide's troubleshooting section
5. Contact support channels

**Remember:** Vercel free tier is generous for educational projects. Monitor usage at: **Vercel Dashboard → Settings → Usage**

---

**Last Updated:** 2025-12-10
**Version:** 1.0.0