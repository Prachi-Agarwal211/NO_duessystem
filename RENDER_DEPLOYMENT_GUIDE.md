# 🚀 Complete Render.com Deployment Guide

## Overview

This guide covers deploying your Next.js JECRC No Dues System to Render.com with proper configuration for production use.

---

## ✅ Prerequisites Checklist

Before deploying to Render, ensure you have:

- [ ] GitHub repository with latest code pushed
- [ ] Supabase project set up and configured
- [ ] Gmail App Password for email notifications
- [ ] All environment variables documented
- [ ] Database migrations executed
- [ ] Render.com account created (free tier available)

---

## 📋 Step-by-Step Deployment

### 1. Prepare Your Repository (5 minutes)

#### A. Commit and Push All Changes
```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

#### B. Verify Files Exist
Ensure these files are in your repository:
- ✅ `render.yaml` (Blueprint file)
- ✅ `package.json` (Dependencies)
- ✅ `next.config.mjs` (Next.js config)
- ✅ `.env.example` (Template for env vars)

---

### 2. Connect Render to GitHub (3 minutes)

1. **Login to Render**: https://dashboard.render.com/
2. **Click "New +"** → Select **"Blueprint"**
3. **Connect GitHub Repository**:
   - Click "Connect account" if first time
   - Authorize Render to access your repositories
   - Select your `jecrc-no-dues-system` repository

4. **Render will auto-detect** `render.yaml` and show service configuration

---

### 3. Configure Environment Variables (10 minutes)

After Blueprint is detected, you'll need to set environment variables:

#### Required Environment Variables:

```bash
# ============================================================
# SUPABASE CONFIGURATION (Required)
# ============================================================
NEXT_PUBLIC_SUPABASE_URL=https://jfqlpyrgkvzbmolvaycz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzA2ODQsImV4cCI6MjA3OTY0NjY4NH0.upX6BWFJ5e3pZ32eehbgMQx7RyF6_K-m1D6aog5N-ls
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA3MDY4NCwiZXhwIjoyMDc5NjQ2Njg0fQ.YM_BKEjpeThLFd6ZtxLV2fNww7N6mO_uz8FHZjtOBhs

# ============================================================
# JWT SECRET (Required for secure links)
# ============================================================
JWT_SECRET=dab703f47fc04382d7559b03f2abebfc054d0ad09943c1eb9eab95266e90fd13

# ============================================================
# EMAIL CONFIGURATION - NODEMAILER SMTP (Required for notifications)
# ============================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your-email@gmail.com>
SMTP_PASS=<your-gmail-app-password>
SMTP_FROM=JECRC No Dues <noreply@jecrc.ac.in>

# How to get Gmail App Password:
# 1. Go to: https://myaccount.google.com/apppasswords
# 2. Enable 2-Factor Authentication if not already enabled
# 3. Create a new App Password (select "Mail" and "Other")
# 4. Copy the 16-character password (no spaces)
# 5. Use this password for SMTP_PASS (NOT your regular Gmail password)

# ============================================================
# DEPARTMENT EMAILS (Optional - Configure in Database)
# ============================================================
LIBRARY_EMAIL=15anuragsingh2003@gmail.com
# Other department emails are managed in the profiles table

# ============================================================
# NEXT.JS CONFIGURATION (Auto-set)
# ============================================================
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# ============================================================
# APPLICATION URL (Update for Production)
# ============================================================
NEXT_PUBLIC_BASE_URL=https://jecrc-no-dues-system.onrender.com
# Update this to your actual Render URL or custom domain
```

#### How to Set in Render:

1. In Render Dashboard → Your Service → **Environment**
2. Click **"Add Environment Variable"**
3. Add each variable one by one
4. Click **"Save Changes"**

---

### 4. Build Configuration (Auto-configured via render.yaml)

Render will use these commands (from `render.yaml`):

```yaml
buildCommand: npm install --legacy-peer-deps && npm run build
startCommand: npm start
```

**Why `--legacy-peer-deps`?**
- Your project has peer dependency conflicts between packages
- This flag tells npm to ignore peer dependency warnings during installation
- It's the npm 7+ equivalent of npm 6 behavior (more lenient)
- Safe to use and won't affect production runtime
- Required for successful builds with conflicting React versions in dependencies

#### What Happens During Build:

1. **Install Dependencies** (`npm install --legacy-peer-deps`):
   - Installs all packages from `package.json`
   - Includes Next.js, React, Supabase, etc.
   - Ignores peer dependency conflicts (common in large projects)
   - Duration: ~2-3 minutes

2. **Build Next.js** (`npm run build`):
   - Compiles TypeScript/JSX
   - Optimizes images
   - Generates static pages
   - Creates production bundles
   - Duration: ~3-5 minutes

3. **Start Server** (`npm start`):
   - Starts Next.js production server
   - Runs on port 3000 (auto-detected by Render)
   - Serves optimized static + server-rendered pages

---

### 5. Deploy! (Click Deploy)

1. After setting all environment variables
2. Click **"Apply"** or **"Create Web Service"**
3. Render will:
   - Pull code from GitHub
   - Run build commands
   - Deploy to production
   - Generate a URL: `https://jecrc-no-dues-system.onrender.com`

**Build Time**: ~5-8 minutes (first deploy)

---

## 🔍 Monitoring Your Deployment

### Live Build Logs

Watch the deployment in real-time:

```
Render Dashboard → Your Service → Logs
```

**What to look for**:
```bash
✓ Building Next.js...
✓ Compiling TypeScript...
✓ Optimizing images...
✓ Generating static pages...
✓ Build completed successfully!
✓ Starting server on port 3000...
✓ Ready on https://jecrc-no-dues-system.onrender.com
```

### Common Build Issues & Fixes:

#### Issue 1: "Module not found"
```bash
Error: Cannot find module 'some-package'
```
**Fix**: Ensure package is in `dependencies` (not `devDependencies`)
```bash
npm install some-package --save
git commit -am "Add missing dependency"
git push
```

#### Issue 2: "Out of memory"
```bash
FATAL ERROR: Reached heap limit
```
**Fix**: Upgrade Render plan (Free tier has 512MB RAM)
- OR optimize build: Remove unused dependencies

#### Issue 3: "Build failed"
```bash
Error: Command failed with exit code 1
```
**Fix**: Check build logs for specific error
- Usually missing environment variables
- Or TypeScript/ESLint errors

---

## 🌐 Post-Deployment Setup

### 1. Verify Deployment (5 minutes)

**A. Test Landing Page**:
```
https://your-app.onrender.com
```
- Should load instantly
- Check animations work
- Verify dark mode toggle

**B. Test Authentication**:
```
https://your-app.onrender.com/student/login
```
- Try logging in with test credentials
- Verify Supabase connection works

**C. Test API Routes**:
```
https://your-app.onrender.com/api/health
```
- Should return: `{"status": "ok"}`

### 2. Configure Custom Domain (Optional)

#### A. Add Domain in Render:
1. Dashboard → Your Service → **Settings**
2. Click **"Add Custom Domain"**
3. Enter: `nodues.jecrc.edu` (or your domain)

#### B. Update DNS Records:
Add these records in your domain registrar:
```
Type: CNAME
Name: nodues (or www)
Value: your-app.onrender.com
TTL: 3600
```

#### C. Wait for SSL Certificate:
Render auto-generates SSL certificate (~10 minutes)

---

## ⚙️ Render-Specific Optimizations

### 1. Update `next.config.mjs` for Render

Your current config already has `output: 'standalone'` which is perfect for Render!

```javascript
// next.config.mjs
const nextConfig = {
  output: 'standalone',  // ✅ Optimized for Render
  swcMinify: true,       // ✅ Fast builds
  compress: true,        // ✅ Smaller bundle
  // ... rest of config
};
```

### 2. Health Check Configuration

Render pings `/` by default. Your app already handles this!

```javascript
// src/app/page.js already exists ✅
// This is your landing page which serves as health check
```

### 3. Auto-Deploy on Git Push

Enable in Render Dashboard:
1. Settings → **Build & Deploy**
2. Enable **"Auto-Deploy"**
3. Now every `git push` triggers deployment!

---

## 📊 Render Free Tier Limits

### What You Get (Free):
- ✅ 512 MB RAM
- ✅ 0.1 CPU
- ✅ 400 build hours/month
- ✅ Unlimited bandwidth
- ✅ Auto SSL certificates
- ✅ Custom domains
- ⚠️ Sleeps after 15 minutes of inactivity

### Important: **Render Free Tier Sleeps!**

**What happens**:
- After 15 minutes of no traffic → App sleeps
- Next request → 30-60 second cold start
- Then runs normally

**Solutions**:
1. **Upgrade to Starter ($7/month)**: Never sleeps
2. **Use Cron Job**: Ping app every 14 minutes
   ```bash
   # Using cron-job.org
   https://your-app.onrender.com
   Every 14 minutes
   ```
3. **UptimeRobot**: Free monitoring + keep-alive
   - https://uptimerobot.com
   - Add your Render URL
   - Set check interval: 5 minutes

---

## 🔧 Advanced Configuration

### 1. Scaling (Paid Plans)

Upgrade for production traffic:

| Plan | RAM | CPU | Price | Best For |
|------|-----|-----|-------|----------|
| Free | 512MB | 0.1 | $0 | Testing |
| Starter | 512MB | 0.5 | $7/mo | Small apps |
| Standard | 2GB | 1.0 | $25/mo | **Recommended** |
| Pro | 4GB | 2.0 | $85/mo | High traffic |

**Recommendation**: Start with **Standard** for production
- Handles 500+ concurrent users
- No sleep time
- Faster builds

### 2. Database Connection Pooling

For high traffic, configure Supabase pooling:

```javascript
// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'x-connection-pooling': 'true' // Enable pooling
      }
    }
  }
)
```

### 3. Caching Strategy

Add Redis for session/data caching (Render Add-on):
```bash
# In Render Dashboard
Add-ons → Redis → Create
# Auto-sets REDIS_URL environment variable
```

---

## 🐛 Troubleshooting Guide

### Build Fails with "npm ERR!"

**Check**:
1. All dependencies in `package.json`
2. Node version compatibility
3. Build logs for specific error

**Fix**:
```bash
# Test build locally first
npm install
npm run build

# If passes locally, check Render Node version
# In render.yaml, specify Node version:
env: node
nodeVersion: 18.17.0  # Match your local version
```

### "Cannot connect to Supabase"

**Check**:
1. Environment variables set correctly
2. Supabase URL includes `https://`
3. Keys copied without extra spaces

**Fix**: Re-enter env vars in Render Dashboard

### "Email not sending"

**Check**:
1. Gmail App Password (not regular password)
2. EMAIL_SECURE=false (for port 587)
3. EMAIL_PORT=587 (not 465)

**Test**:
```bash
# In Render Shell (Dashboard → Shell)
curl -X POST https://your-app.onrender.com/api/test/email
```

### "Page not found" after deployment

**Check**:
1. All pages in `src/app/` directory
2. File naming conventions (lowercase)
3. Build logs for page generation

**Fix**: Check Render logs for build warnings

---

## 📈 Performance Monitoring

### 1. Render Built-in Metrics

Dashboard → Your Service → **Metrics**

Monitor:
- CPU usage
- Memory usage
- Response times
- Build times
- Bandwidth

### 2. Setup External Monitoring

**Recommended Tools**:

1. **UptimeRobot** (Free):
   - https://uptimerobot.com
   - Monitor uptime
   - Email alerts on downtime

2. **Better Stack** (Free tier):
   - https://betterstack.com
   - Uptime monitoring
   - Performance metrics
   - Error tracking

3. **Sentry** (Optional):
   - https://sentry.io
   - Error tracking
   - Performance monitoring

---

## 🔄 Continuous Deployment Workflow

### Recommended Git Workflow:

```bash
# 1. Make changes locally
git checkout -b feature/new-feature

# 2. Test locally
npm run dev
# Test thoroughly

# 3. Build test
npm run build
npm start
# Verify production build works

# 4. Commit and push
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# 5. Merge to main (via PR on GitHub)
# Render auto-deploys main branch

# 6. Monitor deployment in Render Dashboard
```

---

## 🎯 Deployment Checklist

Before going live:

### Pre-Deployment:
- [ ] All environment variables set in Render
- [ ] Supabase database populated (3,181 students)
- [ ] Email configuration tested
- [ ] HOD accounts created
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate issued

### Post-Deployment:
- [ ] Landing page loads correctly
- [ ] Student login works
- [ ] Staff login works
- [ ] Admin dashboard accessible
- [ ] Forms can be submitted
- [ ] Email notifications send
- [ ] Real-time updates work
- [ ] Mobile responsive verified
- [ ] Dark mode works
- [ ] All API routes respond

### Monitoring Setup:
- [ ] UptimeRobot configured
- [ ] Render metrics monitored
- [ ] Error alerts configured
- [ ] Backup strategy in place

---

## 💡 Pro Tips

### 1. Speed Up Builds

Add to `package.json`:
```json
{
  "scripts": {
    "build": "next build --no-lint"
  }
}
```
**Saves**: ~30 seconds per build

### 2. Reduce Cold Start Time

Use Render's **"Persistent Disk"** feature:
```yaml
# In render.yaml
disk:
  name: build-cache
  mountPath: /opt/render/.cache
  sizeGB: 1
```

### 3. Preview Deployments

Enable in Render:
- Settings → **Pull Request Previews**
- Test changes before merging to main
- Each PR gets unique URL

---

## 📞 Support Resources

### Render Support:
- **Docs**: https://render.com/docs
- **Community**: https://community.render.com
- **Status**: https://status.render.com

### Next.js + Render:
- **Guide**: https://render.com/docs/deploy-nextjs-app
- **Examples**: https://github.com/render-examples/nextjs

### If You Get Stuck:
1. Check Render build logs
2. Test build locally: `npm run build`
3. Verify environment variables
4. Check Render community forum
5. Review this guide's troubleshooting section

---

## 🎉 Success! What's Next?

After successful deployment:

1. **Test Everything** (Use checklist above)
2. **Monitor First Week**:
   - Check Render metrics daily
   - Watch for errors
   - Monitor response times
3. **Optimize**:
   - Add caching if needed
   - Upgrade plan if hitting limits
   - Configure CDN for static assets
4. **Announce Launch**:
   - Notify students via email
   - Post on college portal
   - Train staff on system usage

---

## 📋 Quick Reference Commands

```bash
# Force redeploy
git commit --allow-empty -m "Force deploy"
git push origin main

# View logs
# Dashboard → Your Service → Logs

# Access shell
# Dashboard → Your Service → Shell

# Clear build cache
# Settings → Clear build cache & deploy

# Restart service
# Manual Deploy → Clear build cache & deploy
```

---

**Deployment Time Estimate**: 
- Initial setup: 20-30 minutes
- Build & deploy: 5-8 minutes
- Testing: 15-20 minutes
- **Total**: ~1 hour for first deployment

**Subsequent deploys**: ~5 minutes (auto-deploy on git push)

---

## ✅ You're Ready to Deploy!

1. Set environment variables in Render
2. Click "Create Web Service"
3. Wait for build (~5 min)
4. Test your app
5. Celebrate! 🎊