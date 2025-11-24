# Render Deployment Guide - JECRC No Dues System

This guide covers deploying your Next.js application to Render with all the fixes applied.

## ✅ Pre-Deployment Checklist

All critical deployment issues have been fixed:

1. ✅ **Environment Validation** - Removed faulty Supabase URL validation
2. ✅ **API Routes** - Added `dynamic = 'force-dynamic'` to all 8 API routes
3. ✅ **Suspense Boundaries** - Wrapped `useSearchParams()` in all 3 pages
4. ✅ **Build Configuration** - Ready for production deployment

## 🚀 Deployment Steps

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Fixed all deployment issues for Render"
git push origin main
```

### Step 2: Configure Render Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `https://github.com/Prachi-Agarwal211/NO_duessystem`
4. Configure the service:

   **Basic Settings:**
   - **Name:** `jecrc-no-dues-system`
   - **Region:** Choose closest to your users (e.g., Singapore for India)
   - **Branch:** `main` or `render`
   - **Root Directory:** Leave empty (uses project root)
   - **Runtime:** `Node`
   - **Build Command:** `npm install --legacy-peer-deps --include=dev && npm run build`
   - **Start Command:** `npm start`

   **Instance Type:**
   - Start with **Free** tier for testing
   - Upgrade to **Starter ($7/month)** for production

### Step 3: Configure Environment Variables

Go to **Environment** tab and add these variables:

#### Required Variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Secret (32+ characters)
JWT_SECRET=your-secure-jwt-secret-minimum-32-characters-long

# Resend Email Service
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM=noreply@yourdomain.com

# Node Environment
NODE_ENV=production

# Base URL (will be provided by Render)
NEXT_PUBLIC_BASE_URL=https://your-app-name.onrender.com
```

#### Department Email Variables (Optional but Recommended):

```env
SCHOOL_HOD_EMAIL=hod.school@jecrc.ac.in
SCHOOL_EMAIL=school@jecrc.ac.in
LIBRARY_EMAIL=library@jecrc.ac.in
IT_DEPARTMENT_EMAIL=it@jecrc.ac.in
HOSTEL_EMAIL=hostel@jecrc.ac.in
MESS_EMAIL=mess@jecrc.ac.in
CANTEEN_EMAIL=canteen@jecrc.ac.in
TPO_EMAIL=tpo@jecrc.ac.in
ALUMNI_EMAIL=alumni@jecrc.ac.in
ACCOUNTS_EMAIL=accounts@jecrc.ac.in
REGISTRAR_EMAIL=registrar@jecrc.ac.in
EXAM_CELL_EMAIL=exam@jecrc.ac.in
SPORTS_EMAIL=sports@jecrc.ac.in
```

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build your application
   - Start the server
3. Monitor the deployment in the **Logs** tab

### Step 5: Post-Deployment

1. **Update Base URL:**
   - Once deployed, update `NEXT_PUBLIC_BASE_URL` with your Render URL
   - Example: `https://jecrc-no-dues-system.onrender.com`

2. **Configure Custom Domain (Optional):**
   - Go to **Settings** → **Custom Domains**
   - Add your domain (e.g., `nodues.jecrc.ac.in`)
   - Update DNS records as instructed

3. **Test the Application:**
   ```bash
   # Test endpoints
   curl https://your-app.onrender.com/api/health
   
   # Visit in browser
   https://your-app.onrender.com
   ```

## 🔧 Troubleshooting

### Build Fails with "Dynamic Server Usage" Error

**Fixed!** All API routes now have:
```javascript
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
```

### "useSearchParams suspense" Error

**Fixed!** All pages now wrap `useSearchParams()` in `<Suspense>` boundaries.

### Environment Variable Errors

**Fixed!** Removed faulty Supabase URL validation that caused false positives.

### Build Cache Issues

If you encounter caching issues:
1. Go to **Settings** → **Build & Deploy**
2. Click **"Clear Build Cache"**
3. Trigger manual deploy

### Slow Cold Starts (Free Tier)

Free tier services sleep after 15 minutes of inactivity:
- **Solution 1:** Upgrade to Starter plan ($7/month) - no sleep
- **Solution 2:** Use a service like [UptimeRobot](https://uptimerobot.com/) to ping every 14 minutes
- **Solution 3:** Accept 30-60 second cold start delay

## 📊 Monitoring

### View Logs

```bash
# Real-time logs in Render dashboard
Settings → Logs → Live Logs
```

### Monitor Performance

1. Go to **Metrics** tab
2. Monitor:
   - CPU usage
   - Memory usage
   - Request rate
   - Response time

### Set Up Alerts

1. Go to **Notifications**
2. Configure alerts for:
   - Deploy failures
   - Service crashes
   - High resource usage

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Rotate secrets regularly** - Update JWT_SECRET and API keys quarterly
3. **Use environment-specific configs** - Different secrets for staging/production
4. **Enable HTTPS only** - Render provides free SSL certificates
5. **Implement rate limiting** - Consider Cloudflare for additional protection

## 💰 Cost Optimization

### Free Tier Limitations:
- 750 hours/month free compute
- Service sleeps after 15 mins inactivity
- Shared CPU/memory
- 100GB bandwidth/month

### Starter Tier ($7/month):
- No sleep
- Dedicated resources
- 100GB bandwidth included
- Better performance

### Scaling Options:
- **Horizontal:** Multiple instances behind load balancer
- **Vertical:** Upgrade to Standard/Pro plans for more resources

## 🔄 Auto-Deploy Setup

Render automatically deploys when you push to the configured branch:

```bash
# Make changes
git add .
git commit -m "Your changes"
git push origin main

# Render auto-deploys within seconds
```

## 📝 Deployment Checklist

Before going live:

- [ ] All environment variables configured correctly
- [ ] Supabase database schema migrated
- [ ] RLS policies enabled and tested
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Test user accounts created
- [ ] Email service tested
- [ ] All API endpoints tested
- [ ] Performance monitoring enabled
- [ ] Backup strategy in place

## 🆘 Support

- **Render Documentation:** https://render.com/docs
- **Render Status:** https://status.render.com/
- **Community Forum:** https://community.render.com/

## 🎉 Success!

Your application should now be live at: `https://your-app-name.onrender.com`

Test all features:
1. Student form submission
2. Staff login and approval
3. Admin dashboard
4. Email notifications
5. File uploads
6. Certificate generation