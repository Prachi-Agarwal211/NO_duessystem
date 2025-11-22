# ⚡ Render Deployment - Quick Start (5 Minutes)

Ultra-fast deployment guide for JECRC No Dues System on Render.

## 🚀 Prerequisites
- GitHub repo with this code
- Render account (free at [render.com](https://render.com))
- Supabase project URL and keys

## 📝 Step-by-Step

### 1️⃣ Push to GitHub (if not done)
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2️⃣ Create Web Service on Render
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select `jecrc-no-dues-system`

### 3️⃣ Configure Settings
```
Name: jecrc-no-dues-system
Region: Singapore (or your region)
Branch: main
Build Command: npm install && npm run build
Start Command: npm start
Plan: Free (or Starter)
```

### 4️⃣ Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

**Add these 4 variables:**

| Variable Name | Value | Get From |
|--------------|-------|----------|
| `NODE_ENV` | `production` | Fixed value |
| `NEXT_PUBLIC_SUPABASE_URL` | Your URL | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your key | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Your key | Supabase → Settings → API |

**Optional (for emails):**
- `RESEND_API_KEY` - Get from [resend.com](https://resend.com)

### 5️⃣ Deploy
1. Click **"Create Web Service"**
2. Wait 5-10 minutes for build
3. Your app will be live at: `https://jecrc-no-dues-system.onrender.com`

## ✅ Verify Deployment

1. **Visit your URL**
2. **Test login** with your Supabase users
3. **Check logs** in Render dashboard if any issues

## 🔧 Quick Fixes

**Build failed?**
- Check environment variables are set
- View build logs in Render dashboard

**App not loading?**
- Verify Supabase URL is correct
- Check if Supabase project is active
- Look for errors in Render logs

**Slow first load?**
- Free tier spins down after 15 min
- Upgrade to Starter ($7/month) for always-on

## 📱 Auto-Deploy

Every push to `main` branch auto-deploys:
```bash
git add .
git commit -m "Update feature"
git push
# Render automatically deploys! 🎉
```

## 💡 Pro Tips

1. **Use render.yaml** - Already created for you!
2. **Monitor logs** - Dashboard → Your Service → Logs
3. **Add custom domain** - Settings → Custom Domains
4. **Enable notifications** - Settings → Notifications

## 🆘 Need Help?

**Full guide:** See [`RENDER_DEPLOYMENT_GUIDE.md`](RENDER_DEPLOYMENT_GUIDE.md)

**Common issues:**
- Missing env vars → Add in Render dashboard
- Build errors → Check logs, verify package.json
- Connection issues → Verify Supabase credentials

---

**🎉 That's it! Your app should be live in ~10 minutes.**

**URL:** `https://jecrc-no-dues-system.onrender.com`

For detailed troubleshooting and advanced features, see the full [`RENDER_DEPLOYMENT_GUIDE.md`](RENDER_DEPLOYMENT_GUIDE.md)