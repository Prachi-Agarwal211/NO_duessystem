# 🚀 JECRC No Dues System - Render Deployment Guide

Complete step-by-step guide to deploy your Next.js application to Render.

## 📋 Prerequisites

- ✅ GitHub account with your repository
- ✅ Render account (free tier available at [render.com](https://render.com))
- ✅ Supabase project with database configured
- ✅ Resend API key (optional, for emails)

## 🎯 Quick Deployment Steps

### **Step 1: Prepare Your Repository**

1. **Ensure all files are committed to Git:**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Verify these files exist in your repo:**
   - ✅ `render.yaml` (blueprint configuration)
   - ✅ `package.json` (with build and start scripts)
   - ✅ `next.config.mjs` (Next.js configuration)

### **Step 2: Create Render Web Service**

1. **Go to Render Dashboard:**
   - Visit [https://dashboard.render.com](https://dashboard.render.com)
   - Click **"New +"** → **"Web Service"**

2. **Connect Your Repository:**
   - Choose **"Connect a repository"**
   - Authorize Render to access your GitHub
   - Select your `jecrc-no-dues-system` repository

3. **Configure Service Settings:**
   ```
   Name: jecrc-no-dues-system
   Region: Singapore (or closest to your users)
   Branch: main
   Root Directory: (leave blank)
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   Plan: Free (or Starter for production)
   ```

### **Step 3: Add Environment Variables**

In the Render dashboard, add these environment variables:

#### **Required Variables:**

| Key | Value | Where to Find |
|-----|-------|---------------|
| `NODE_ENV` | `production` | Fixed value |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Supabase Dashboard → Settings → API |

#### **Optional Variables:**

| Key | Value | Where to Find |
|-----|-------|---------------|
| `RESEND_API_KEY` | Your Resend key | Resend Dashboard → API Keys |

**How to add in Render:**
1. Scroll to **"Environment Variables"** section
2. Click **"Add Environment Variable"**
3. Enter `Key` and `Value`
4. Click **"Add"** for each variable

### **Step 4: Deploy**

1. **Click "Create Web Service"**
   - Render will start building your application
   - Watch the build logs for any errors

2. **Wait for deployment** (5-10 minutes first time)
   - You'll see: 
     ```
     ==> Installing dependencies...
     ==> Building application...
     ==> Starting server...
     ==> Your service is live 🎉
     ```

3. **Access your deployed app:**
   - Your app will be at: `https://jecrc-no-dues-system.onrender.com`
   - Custom domain can be added later

### **Step 5: Verify Deployment**

1. **Test the homepage:**
   - Visit your Render URL
   - Should see the landing page

2. **Test authentication:**
   - Try logging in as different roles
   - Verify Supabase connection works

3. **Check logs:**
   - Render Dashboard → Your Service → Logs
   - Look for any errors

## 🔧 Render-Specific Configuration

### **Health Checks**
Render automatically monitors your app at `/` endpoint. The system will auto-restart if it fails.

### **Auto-Deploy**
Your app will automatically redeploy when you push to the `main` branch:
```bash
git add .
git commit -m "Update feature"
git push origin main
# Render will auto-deploy
```

### **Manual Deploy**
To manually trigger a deploy:
1. Go to Render Dashboard
2. Select your service
3. Click **"Manual Deploy"** → **"Deploy latest commit"**

## 🌐 Custom Domain Setup (Optional)

1. **In Render Dashboard:**
   - Go to your service → Settings
   - Scroll to **"Custom Domains"**
   - Click **"Add Custom Domain"**

2. **Add your domain:**
   - Enter: `yourdomain.com`
   - Render provides DNS records

3. **Update DNS:**
   - Add CNAME record in your domain registrar
   - Point to Render's provided URL
   - SSL certificate will be auto-generated

## 📊 Monitoring & Logs

### **View Logs:**
```
Dashboard → Your Service → Logs
```
- Real-time application logs
- Build logs
- Error tracking

### **Metrics:**
```
Dashboard → Your Service → Metrics
```
- CPU usage
- Memory usage
- Request count
- Response times

### **Alerts:**
- Set up email alerts for downtime
- Configure in Service Settings → Notifications

## 🔒 Security Best Practices

### **Environment Variables:**
- ✅ Never commit `.env` files to Git
- ✅ Use Render's encrypted environment variables
- ✅ Rotate keys regularly

### **HTTPS:**
- ✅ Automatically enabled on all Render apps
- ✅ Free SSL certificates
- ✅ Auto-renewal

### **Access Control:**
- ✅ Use Render Teams for collaboration
- ✅ Set up proper RLS in Supabase
- ✅ Implement rate limiting

## 🐛 Troubleshooting

### **Build Fails:**

**Error: "Module not found"**
```bash
# Solution: Ensure all dependencies are in package.json
npm install --save missing-package
git commit -am "Add missing dependency"
git push
```

**Error: "Out of memory"**
```yaml
# Solution: Upgrade to Starter plan or optimize build
# In package.json, add:
"scripts": {
  "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
}
```

### **App Not Starting:**

**Check logs for:**
1. Missing environment variables
2. Port binding issues (Render provides PORT automatically)
3. Database connection errors

**Solution:**
```bash
# Verify all environment variables are set
# Check Supabase connection in logs
# Ensure NEXT_PUBLIC_* variables are correct
```

### **Database Connection Issues:**

**Error: "Could not connect to Supabase"**
```bash
# Solution:
1. Verify NEXT_PUBLIC_SUPABASE_URL is correct
2. Check if Supabase project is active
3. Verify network connectivity from Render
4. Check Supabase logs for connection attempts
```

### **Slow Performance:**

**On Free Tier:**
- Services spin down after 15 minutes of inactivity
- First request after downtime takes 30-60 seconds

**Solutions:**
1. Upgrade to Starter plan ($7/month) for always-on
2. Use external uptime monitoring (like UptimeRobot)
3. Implement proper caching strategies

## 💰 Pricing Tiers

### **Free Tier:**
- ✅ 750 hours/month (enough for 1 service)
- ✅ Spins down after 15 min inactivity
- ✅ 512 MB RAM
- ✅ Shared CPU
- ✅ Perfect for development/testing

### **Starter Tier ($7/month):**
- ✅ Always-on (no spin down)
- ✅ 512 MB RAM
- ✅ Shared CPU
- ✅ Better for production

### **Standard Tier ($25/month):**
- ✅ Always-on
- ✅ 2 GB RAM
- ✅ 1 dedicated CPU
- ✅ Production-grade performance

## 🔄 CI/CD Pipeline

Your deployment is fully automated:

```
┌─────────────┐
│ Push to Git │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   GitHub    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Render    │
│  Auto-Build │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Deploy    │
│     Live    │
└─────────────┘
```

## 📈 Performance Optimization

### **For Production:**

1. **Update next.config.mjs:**
```javascript
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  // ... existing config
};
```

2. **Enable Caching:**
```javascript
// In API routes
export const revalidate = 60; // Revalidate every 60 seconds
```

3. **Image Optimization:**
```javascript
// next.config.mjs
images: {
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200],
},
```

## 🔗 Useful Links

- **Render Dashboard:** https://dashboard.render.com
- **Render Docs:** https://render.com/docs
- **Supabase Dashboard:** https://app.supabase.com
- **Next.js Deployment:** https://nextjs.org/docs/deployment

## ✅ Post-Deployment Checklist

- [ ] Application builds successfully
- [ ] All environment variables configured
- [ ] Database connection working
- [ ] Authentication working (all roles)
- [ ] File uploads working (Supabase Storage)
- [ ] Email notifications working (if enabled)
- [ ] Custom domain added (if needed)
- [ ] SSL certificate active
- [ ] Monitoring alerts configured
- [ ] Backup strategy implemented

## 🎯 Quick Commands

```bash
# View service logs
# Dashboard → Your Service → Logs

# Trigger manual deploy
# Dashboard → Your Service → Manual Deploy

# Add environment variable
# Dashboard → Your Service → Environment → Add Variable

# View service metrics
# Dashboard → Your Service → Metrics

# Configure custom domain
# Dashboard → Your Service → Settings → Custom Domains
```

## 🆘 Getting Help

### **If deployment fails:**

1. **Check build logs** in Render dashboard
2. **Verify environment variables** are all set correctly
3. **Test locally first:**
   ```bash
   npm run build
   npm start
   # If this works, deployment should work
   ```
4. **Check Render status:** https://status.render.com
5. **Contact Render support:** support@render.com

### **For database issues:**
1. Check Supabase dashboard for errors
2. Verify RLS policies are correct
3. Test database connections locally
4. Check Supabase logs

---

## 🎉 Deployment Complete!

Your JECRC No Dues System is now live on Render!

**Next Steps:**
1. Share the URL with your team
2. Set up monitoring and alerts
3. Configure custom domain (optional)
4. Set up regular backups
5. Monitor performance and optimize

**Your app is accessible at:**
`https://jecrc-no-dues-system.onrender.com`

**Estimated deployment time:** 10-15 minutes (first time)

---

**Need help?** Check the troubleshooting section above or contact support.

**🚀 Happy deploying!**