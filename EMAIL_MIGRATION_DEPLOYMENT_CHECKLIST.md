# 📧 Email Migration Deployment Checklist

## ✅ What's Already Complete

All code and infrastructure changes are complete! Here's what's been done:

### 1. ✅ Code Migration
- **Email Service:** Completely rewritten with Nodemailer ([`src/lib/emailService.js`](src/lib/emailService.js:1))
- **Queue Processor:** Created API endpoint ([`src/app/api/email/process-queue/route.js`](src/app/api/email/process-queue/route.js:1))
- **Status Monitor:** Created API endpoint ([`src/app/api/email/status/route.js`](src/app/api/email/status/route.js:1))
- **Vercel Cron:** Configured in [`vercel.json`](vercel.json:1)

### 2. ✅ Dependencies
- **Removed:** `resend` package
- **Added:** `nodemailer` package (v6.9.7)
- Package.json already updated

### 3. ✅ Database Schema
- SQL script ready: [`EMAIL_QUEUE_SCHEMA.sql`](EMAIL_QUEUE_SCHEMA.sql:1)
- Includes: table, indexes, triggers, RLS policies, views

### 4. ✅ Environment Variables
- Template ready: [`.env.example`](.env.example:1)
- All SMTP variables documented

---

## 🚀 Deployment Steps (DO THESE NOW)

### Step 1: Create Email Queue Table in Supabase

**Action:** Run the SQL script in Supabase SQL Editor

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **"New Query"**
5. Copy and paste the entire content from [`EMAIL_QUEUE_SCHEMA.sql`](EMAIL_QUEUE_SCHEMA.sql:1)
6. Click **"Run"** or press `Ctrl+Enter`

**Expected Output:**
```
Success. No rows returned
```

**Verify Table Created:**
```sql
-- Run this to verify
SELECT COUNT(*) FROM email_queue;
```

Expected: `0` (table exists but empty)

---

### Step 2: Configure SMTP Credentials

You need to choose an SMTP provider. Here are your options:

#### Option A: Gmail (Easiest for Testing)

**Setup:**
1. Enable 2-Factor Authentication on your Gmail account
2. Go to: https://myaccount.google.com/apppasswords
3. Select "Mail" and "Other (Custom name)"
4. Name it: "JECRC No Dues System"
5. Click "Generate"
6. Copy the 16-character password (no spaces)

**Environment Variables:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=JECRC No Dues <your-email@gmail.com>
```

**Limitations:**
- 500 emails/day limit (free)
- 2,000 emails/day limit (Google Workspace)

#### Option B: SendGrid (Recommended for Production)

**Setup:**
1. Sign up: https://sendgrid.com
2. Verify your sender email/domain
3. Create API Key: Settings → API Keys → Create API Key
4. Copy the API key

**Environment Variables:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key-here
SMTP_FROM=JECRC No Dues <noreply@jecrc.ac.in>
```

**Pricing:**
- Free: 100 emails/day
- Essentials: $15/month (40,000 emails/month)

#### Option C: Mailgun

**Setup:**
1. Sign up: https://mailgun.com
2. Add and verify your domain
3. Get SMTP credentials from: Sending → Domain Settings → SMTP Credentials

**Environment Variables:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-smtp-password
SMTP_FROM=JECRC No Dues <noreply@jecrc.ac.in>
```

**Pricing:**
- Free: 5,000 emails/month (3 months)
- Pay-as-you-go: $0.80 per 1,000 emails

#### Option D: Amazon SES (Most Cost-Effective at Scale)

**Environment Variables:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-iam-smtp-username
SMTP_PASS=your-iam-smtp-password
SMTP_FROM=JECRC No Dues <noreply@jecrc.ac.in>
```

**Pricing:**
- $0.10 per 1,000 emails
- First 62,000 emails free if sending from EC2

---

### Step 3: Add Environment Variables to Vercel

**Action:** Configure SMTP in Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Select your project: `jecrc-no-dues-system`
3. Go to **Settings** → **Environment Variables**
4. Add these variables (use values from Step 2):

| Variable | Value | Environment |
|----------|-------|-------------|
| `SMTP_HOST` | (from your provider) | Production, Preview, Development |
| `SMTP_PORT` | `587` | Production, Preview, Development |
| `SMTP_SECURE` | `false` | Production, Preview, Development |
| `SMTP_USER` | (from your provider) | Production, Preview, Development |
| `SMTP_PASS` | (from your provider) | Production, Preview, Development |
| `SMTP_FROM` | `JECRC No Dues <noreply@jecrc.ac.in>` | Production, Preview, Development |

**Optional (for security):**
| Variable | Value | Environment |
|----------|-------|-------------|
| `CRON_SECRET` | (generate random string) | Production |

**Generate Random Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. Click **"Save"** after adding each variable

---

### Step 4: Test Locally (Optional but Recommended)

**Before deploying to production, test locally:**

1. **Add variables to `.env.local`:**
```bash
# Copy from Step 2
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=JECRC No Dues <your-email@gmail.com>

# Your existing Supabase variables
NEXT_PUBLIC_SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key
```

2. **Start dev server:**
```bash
npm run dev
```

3. **Test email sending:**
   - Submit a test form
   - Check terminal for email logs
   - Check your email inbox

4. **Test queue status:**
```bash
curl http://localhost:3000/api/email/status
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2025-01-01T00:00:00Z",
  "queue": {
    "total": 0,
    "statusCounts": {},
    "avgAttempts": 0
  },
  "smtp": {
    "configured": true,
    "host": "smtp.gmail.com",
    "from": "JECRC No Dues <...>"
  }
}
```

5. **Test queue processor:**
```bash
curl -X POST http://localhost:3000/api/email/process-queue
```

---

### Step 5: Deploy to Vercel

**Action:** Push changes and deploy

1. **Commit and push:**
```bash
git add .
git commit -m "feat: migrate from Resend to Nodemailer with email queue"
git push origin main
```

2. **Vercel auto-deploys** (connected to your GitHub repo)

3. **Monitor deployment:**
   - Go to Vercel Dashboard → Deployments
   - Wait for "Ready" status
   - Check deployment logs for errors

4. **Verify cron job configured:**
   - Go to Project Settings → Cron Jobs
   - Should show: `/api/email/process-queue` running `*/5 * * * *` (every 5 minutes)

---

### Step 6: Test Production Deployment

**Action:** Verify everything works in production

1. **Check queue status:**
```bash
curl https://your-domain.vercel.app/api/email/status
```

2. **Submit a test form:**
   - Go to your production site
   - Submit a No Dues application
   - Check if staff receive emails

3. **Monitor queue processing:**
   - Check Vercel Functions logs
   - Look for `/api/email/process-queue` executions
   - Should run every 5 minutes

4. **Check Vercel logs:**
   - Functions → Logs
   - Filter by `/api/email/process-queue`
   - Look for: `✅ Queue processing complete`

---

## 🔍 Verification Checklist

After deployment, verify each item:

- [ ] **Email queue table exists in Supabase**
  ```sql
  SELECT COUNT(*) FROM email_queue;
  ```
  Expected: `0` or higher (table exists)

- [ ] **SMTP variables configured in Vercel**
  - Check: Settings → Environment Variables
  - All 6 variables present

- [ ] **Cron job configured**
  - Check: Settings → Cron Jobs
  - Shows: `/api/email/process-queue` every 5 minutes

- [ ] **Queue status endpoint works**
  ```bash
  curl https://your-domain.vercel.app/api/email/status
  ```
  Expected: `"success": true, "smtp": { "configured": true }`

- [ ] **Form submission sends emails**
  - Submit test form
  - Staff receive notification emails
  - Check Vercel logs for: `✅ Email sent successfully`

- [ ] **Queue processor runs automatically**
  - Wait 5 minutes
  - Check Vercel Functions logs
  - Should see automatic execution

- [ ] **Failed emails queue and retry**
  - Temporarily disable SMTP (wrong password)
  - Submit form
  - Check: `SELECT * FROM email_queue WHERE status = 'pending';`
  - Re-enable SMTP
  - Wait for cron (5 minutes)
  - Check: emails should be sent and marked completed

---

## 📊 Monitoring After Deployment

### Daily Monitoring

**Check queue health:**
```bash
curl https://your-domain.vercel.app/api/email/status | jq
```

**Look for:**
- `total`: Should be low (< 10 in queue)
- `statusCounts.pending`: Should be 0 or very low
- `oldestPending`: Should be null or recent (< 1 hour)

### Weekly Maintenance

**Check for stuck emails:**
```sql
-- Emails pending for > 1 hour
SELECT id, to_address, subject, created_at, attempts, error_message
FROM email_queue 
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Check failed emails:**
```sql
-- Recently failed emails
SELECT to_address, subject, error_message, attempts, created_at
FROM email_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Cleanup old emails (automatic but can run manually):**
```sql
-- Delete completed/failed emails older than 30 days
DELETE FROM email_queue 
WHERE status IN ('completed', 'failed') 
AND updated_at < NOW() - INTERVAL '30 days';
```

---

## 🐛 Troubleshooting

### Issue: "SMTP not configured" error

**Symptoms:** Status endpoint shows `"configured": false`

**Solution:**
1. Check environment variables in Vercel
2. Verify all 6 SMTP variables are set
3. Redeploy after adding variables

### Issue: Emails not sending

**Symptoms:** Forms submit but no emails received

**Solution:**
1. Check SMTP credentials are correct
2. For Gmail: Verify App Password (not regular password)
3. Check Vercel logs for SMTP errors
4. Test SMTP locally:
```bash
node -e "const nodemailer = require('nodemailer'); const t = nodemailer.createTransport({host:'smtp.gmail.com',port:587,auth:{user:'your-email',pass:'your-pass'}}); t.verify().then(console.log).catch(console.error);"
```

### Issue: Emails queued but not processing

**Symptoms:** `email_queue` has pending emails that never send

**Solution:**
1. Check cron job is configured (Settings → Cron Jobs)
2. Manually trigger processor:
```bash
curl -X POST https://your-domain.vercel.app/api/email/process-queue
```
3. Check Vercel Functions logs for errors
4. Verify `scheduled_for` is not in future:
```sql
SELECT id, scheduled_for, created_at 
FROM email_queue 
WHERE status = 'pending';
```

### Issue: SMTP authentication failed

**Symptoms:** Error: "Invalid login" or "535 Authentication failed"

**Solution:**

**For Gmail:**
1. Enable 2FA on Gmail account
2. Generate new App Password
3. Use App Password (16 chars, no spaces)
4. Update SMTP_PASS in Vercel

**For other providers:**
1. Verify credentials are correct
2. Check if SMTP access is enabled
3. Verify port and secure settings
4. Check provider documentation

### Issue: Cron job not running

**Symptoms:** `/api/email/process-queue` never executes automatically

**Solution:**
1. Check `vercel.json` is in repository root
2. Re-deploy to apply cron configuration:
```bash
git commit --allow-empty -m "trigger deploy"
git push
```
3. Verify in Vercel: Settings → Cron Jobs
4. Check cron schedule syntax: `*/5 * * * *` = every 5 minutes

---

## 📈 Performance Metrics

### Expected Performance

**Email Delivery:**
- Direct send: < 2 seconds
- Queue + retry: < 5 minutes (on next cron run)
- Batch of 10 emails: 2-3 seconds

**Queue Processing:**
- 50 emails: ~15-20 seconds
- Runs every: 5 minutes
- Timeout limit: 50 seconds (Vercel safe)

### Optimization Options

**Increase batch size (if SMTP allows):**
```javascript
// In emailService.js line 207
const results = await sendBulkEmails(emails, 20, 45000); // 20 instead of 10
```

**Reduce cron frequency:**
```json
// In vercel.json
"schedule": "*/10 * * * *"  // Every 10 minutes instead of 5
```

**Adjust retry delays:**
```javascript
// In process-queue/route.js line 102
const retryDelay = Math.pow(2, newAttempts) * 10; // 10, 20, 40 minutes
```

---

## 🎉 Success Criteria

Your email migration is complete when:

✅ **All emails sending successfully**
- Test form submissions send emails
- Staff receive department notifications
- Students receive status updates

✅ **Queue system operational**
- Failed emails automatically queue
- Cron job processes queue every 5 minutes
- Retry logic working (3 attempts with backoff)

✅ **Monitoring in place**
- Status endpoint accessible
- Queue statistics showing healthy state
- Vercel logs showing successful processing

✅ **Zero Resend dependencies**
- No Resend code remaining
- Package.json only has nodemailer
- All functionality working

✅ **Production stable**
- No email delivery errors
- Queue stays empty or near-empty
- All features working as before

---

## 📚 Additional Resources

- **Nodemailer Documentation:** https://nodemailer.com/
- **Vercel Cron Jobs:** https://vercel.com/docs/cron-jobs
- **Gmail App Passwords:** https://support.google.com/accounts/answer/185833
- **SendGrid Setup:** https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api
- **Complete Migration Guide:** [`NODEMAILER_MIGRATION_COMPLETE.md`](NODEMAILER_MIGRATION_COMPLETE.md:1)

---

## 🔐 Security Best Practices

1. **Never commit SMTP credentials** to git
2. **Use environment variables** for all sensitive data
3. **Enable cron secret** for production (CRON_SECRET)
4. **Rotate SMTP passwords** periodically
5. **Monitor failed emails** for suspicious patterns
6. **Use domain authentication** (SPF, DKIM, DMARC) for production

---

**Last Updated:** 2025-12-12  
**Status:** Ready for Deployment  
**Estimated Time:** 30-45 minutes  
**Difficulty:** Easy  
**Prerequisites:** Supabase access, Vercel access, SMTP credentials