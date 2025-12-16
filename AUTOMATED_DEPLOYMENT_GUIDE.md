# 🤖 Automated Deployment Guide - JECRC No Dues System

## Overview

This guide shows you how to deploy your system using **automation scripts** that handle 90% of the setup for you.

---

## 📋 Prerequisites

1. **Node.js 18+** installed
2. **Supabase project** created
3. **Render account** (free tier works)
4. **Git repository** set up

---

## 🚀 Quick Start (3 Commands)

```bash
# 1. Install dependencies
npm install

# 2. Setup Supabase automatically
node scripts/setup-supabase.js

# 3. Test everything
node scripts/test-deployment.js
```

That's it! 🎉

---

## Detailed Steps

### Step 1: Setup Supabase (Automated)

Run the automated setup script:

```bash
node scripts/setup-supabase.js
```

**What it does:**
- ✅ Creates all 3 storage buckets with correct size limits
- ✅ Runs ULTIMATE_DATABASE_SETUP.sql (if possible)
- ✅ Creates admin account
- ✅ Verifies database tables
- ✅ Guides you through manual steps if needed

**You'll be prompted for:**
1. Supabase URL (from Supabase Dashboard → Settings → API)
2. Service Role Key (from Supabase Dashboard → Settings → API)
3. Admin email and password

**Expected Output:**
```
╔════════════════════════════════════════════════════════════════╗
║                  🎉 SETUP COMPLETE! 🎉                        ║
╚════════════════════════════════════════════════════════════════╝

✓ Storage buckets created (3)
✓ Database schema deployed
✓ Admin account created
```

### Manual Steps (If Script Can't Complete SQL)

If the script can't run SQL automatically:

1. Go to **Supabase Dashboard → SQL Editor**
2. Open `ULTIMATE_DATABASE_SETUP.sql`
3. Copy & paste the entire file
4. Click **"Run"**
5. Return to script and confirm

---

### Step 2: Deploy to Render

#### Option A: Using Git (Recommended)

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. Go to [Render Dashboard](https://dashboard.render.com/)

3. Click **"New +"** → **"Web Service"**

4. Connect your repository

5. Configure:
   ```
   Name: jecrc-no-dues-system
   Region: Singapore
   Branch: main
   Build Command: npm install && npm run build
   Start Command: npm run start
   ```

6. Add environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
   NODE_ENV=production
   ```

7. Click **"Create Web Service"**

8. Wait 5-10 minutes for deployment

#### Option B: Using Render CLI (Faster)

```bash
# Install Render CLI
npm install -g render-cli

# Login to Render
render login

# Deploy
render deploy
```

---

### Step 3: Test Everything (Automated)

Run the comprehensive test suite:

```bash
node scripts/test-deployment.js
```

**What it tests:**
- ✅ Supabase connection
- ✅ Database tables (10 checks)
- ✅ Storage buckets (3 checks)
- ✅ Database functions (3 checks)
- ✅ Admin account exists
- ✅ API endpoints respond
- ✅ Generates detailed report

**You'll be prompted for:**
1. Supabase URL
2. Supabase Anon Key
3. App URL (your Render URL)

**Expected Output:**
```
╔════════════════════════════════════════════════════════════════╗
║              DEPLOYMENT TEST REPORT                           ║
╚════════════════════════════════════════════════════════════════╝

✓ Passed:   15
✗ Failed:   0
⚠ Warnings: 0
━ Total:    15

Pass Rate: 100.0%

🎉 All critical tests passed! Your deployment is ready for production.
```

---

## 📊 What Each Script Does

### `scripts/setup-supabase.js`

**Automates:**
- Storage bucket creation (no-dues-files, alumni-screenshots, certificates)
- Database schema deployment
- Admin account creation
- Basic verification

**Manual Steps It Guides:**
- SQL file execution (if API doesn't support it)
- Connection pooling setup
- Realtime configuration

**Time Saved:** ~20 minutes → 2 minutes

---

### `scripts/test-deployment.js`

**Tests:**
- **Connection Tests:** Supabase connectivity
- **Database Tests:** All tables exist with correct data
- **Storage Tests:** All buckets exist and are public
- **Function Tests:** All 3 critical functions work
- **Auth Tests:** Admin account exists
- **API Tests:** Endpoints respond correctly

**Generates:**
- Detailed pass/fail report
- Specific error messages
- Recommendations for fixes

**Time Saved:** ~30 minutes → 1 minute

---

## 🎯 Complete Workflow

### For First-Time Setup:

```bash
# 1. Clone repository
git clone <your-repo>
cd jecrc-no-dues-system

# 2. Install dependencies
npm install

# 3. Setup Supabase (automated)
node scripts/setup-supabase.js

# 4. Deploy to Render
git push origin main
# (Render auto-deploys)

# 5. Test deployment
node scripts/test-deployment.js

# 6. Done! 🎉
```

**Total Time:** ~15 minutes (vs 2+ hours manually)

---

### For Updates:

```bash
# 1. Make changes
# ...edit code...

# 2. Test locally
npm run dev

# 3. Deploy
git add .
git commit -m "Your changes"
git push

# 4. Test
node scripts/test-deployment.js
```

**Total Time:** ~5 minutes

---

## 🔧 Troubleshooting

### "Script fails to connect to Supabase"

**Solution:**
1. Check your Supabase URL and Service Role Key
2. Verify project isn't paused
3. Test connection:
   ```bash
   curl https://your-project.supabase.co/rest/v1/
   ```

### "SQL execution fails"

**Solution:**
1. Script will guide you to run SQL manually
2. Go to Supabase Dashboard → SQL Editor
3. Paste ULTIMATE_DATABASE_SETUP.sql
4. Click Run
5. Return to script

### "Tests fail after deployment"

**Solution:**
1. Check Render logs for build errors
2. Verify environment variables are set
3. Run test script again with correct URLs
4. Review specific failed tests in report

### "Admin account creation fails"

**Solution:**
1. Create user manually in Supabase Dashboard → Authentication
2. Copy user ID
3. Run this SQL:
   ```sql
   INSERT INTO profiles (id, email, full_name, role, is_active)
   VALUES ('USER_ID', 'admin@jecrcu.edu.in', 'Admin', 'admin', true);
   ```

---

## 📝 Manual Steps (Still Required)

Some things can't be automated and require 1 minute each:

### 1. Connection Pooling (Performance)

**Dashboard:** Supabase → Settings → Database → Connection Pooling

```
Mode: Transaction
Pool Size: 15
Connection Timeout: 15s
```

### 2. Realtime Subscriptions (Live Updates)

**Dashboard:** Supabase → Database → Replication

Enable for:
- `no_dues_forms`
- `no_dues_status`
- `support_tickets`
- `profiles`

### 3. Email Configuration (Optional)

If using email notifications:

**Dashboard:** Supabase → Authentication → Email Templates

Or add to Render environment:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## ✅ Success Checklist

After running scripts, verify:

- [ ] `setup-supabase.js` completed successfully
- [ ] All 3 storage buckets exist
- [ ] Admin account created
- [ ] Render deployment succeeded (green status)
- [ ] `test-deployment.js` shows 100% pass rate
- [ ] Can login as admin
- [ ] Dashboard loads in <2 seconds
- [ ] Student form submission works
- [ ] File uploads work

---

## 🎉 That's It!

You just deployed a production-ready system in **under 15 minutes** using automation.

**Next Steps:**
1. Train staff on the system
2. Create department accounts
3. Import convocation data (if needed)
4. Announce to students

**Support:**
- Check `RENDER_DEPLOYMENT_CHECKLIST.md` for detailed manual steps
- Review `DEPLOYMENT_STEPS.md` for troubleshooting
- Run test script anytime to verify system health

---

## 🚀 Pro Tips

### Continuous Deployment

Add to `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run build
      - run: npm run test
```

### Scheduled Health Checks

Add to Render:
```bash
# Dashboard → Cron Jobs → Add Cron Job
Schedule: 0 */6 * * *  # Every 6 hours
Command: node scripts/test-deployment.js --silent
```

### Auto-Backup Database

Add to Supabase:
```bash
# Dashboard → Database → Backups
Enable: Daily backups at 2 AM UTC
Retention: 7 days
```

---

**Everything is automated. Just run the scripts and deploy!** 🚀