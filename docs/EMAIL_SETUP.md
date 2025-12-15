# 📧 Gmail SMTP Setup Guide for JECRC No Dues System

## ✅ Quick Setup (5 Minutes)

You're using Gmail as your SMTP provider. Follow these exact steps:

---

## Step 1: Enable 2-Factor Authentication (2FA)

**Why needed:** Gmail requires 2FA to generate App Passwords for SMTP

1. Go to: https://myaccount.google.com/security
2. Scroll to **"How you sign in to Google"**
3. Click **"2-Step Verification"**
4. If not enabled:
   - Click **"Get Started"**
   - Follow the prompts to set up 2FA
   - Use your phone number for verification

**Already enabled?** Skip to Step 2.

---

## Step 2: Generate App Password

**This is your SMTP password (NOT your Gmail password)**

1. Go to: https://myaccount.google.com/apppasswords
2. You may need to sign in again
3. Under "App Passwords":
   - **Select app:** Choose **"Mail"**
   - **Select device:** Choose **"Other (Custom name)"**
   - Enter name: `JECRC No Dues System`
   - Click **"Generate"**

4. **Copy the 16-character password** shown on screen
   - Example: `abcd efgh ijkl mnop`
   - **Important:** This is shown only once. Copy it immediately!
   - Remove all spaces: `abcdefghijklmnop`

5. Click **"Done"**

---

## Step 3: Prepare Your Environment Variables

**Using these exact values for Gmail:**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-16-char-app-password-no-spaces
SMTP_FROM=JECRC No Dues <your-gmail-address@gmail.com>
```

**Replace:**
- `your-gmail-address@gmail.com` → Your actual Gmail address
- `your-16-char-app-password-no-spaces` → The app password from Step 2 (remove spaces)

**Example (with fake values):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=jecrc.nodues@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM=JECRC No Dues <jecrc.nodues@gmail.com>
```

---

## Step 4: Add to Vercel Environment Variables

1. Go to: https://vercel.com/dashboard
2. Select project: **jecrc-no-dues-system**
3. Go to: **Settings** → **Environment Variables**
4. Add each variable:

| Variable Name | Value | Apply to |
|--------------|-------|----------|
| `SMTP_HOST` | `smtp.gmail.com` | ✓ Production, ✓ Preview, ✓ Development |
| `SMTP_PORT` | `587` | ✓ Production, ✓ Preview, ✓ Development |
| `SMTP_SECURE` | `false` | ✓ Production, ✓ Preview, ✓ Development |
| `SMTP_USER` | `your-gmail@gmail.com` | ✓ Production, ✓ Preview, ✓ Development |
| `SMTP_PASS` | `your-app-password` | ✓ Production, ✓ Preview, ✓ Development |
| `SMTP_FROM` | `JECRC No Dues <your-gmail@gmail.com>` | ✓ Production, ✓ Preview, ✓ Development |

5. Click **"Save"** after each variable

---

## Step 5: Test Locally (Optional)

**Before deploying, test on your local machine:**

1. Create `.env.local` file in project root:
```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=JECRC No Dues <your-gmail@gmail.com>

# Your existing Supabase variables
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

2. Start dev server:
```bash
npm run dev
```

3. Test email:
   - Go to: http://localhost:3000
   - Submit a test no-dues form
   - Check terminal for: `✅ Email sent successfully`
   - Check Gmail inbox for the email

4. If successful, proceed to deployment!

---

## Step 6: Create Email Queue Table

**Run this in Supabase SQL Editor:**

1. Open: https://supabase.com/dashboard
2. Select your project
3. Go to: **SQL Editor** (left sidebar)
4. Click: **"New Query"**
5. Copy and paste from: [`EMAIL_QUEUE_SCHEMA.sql`](EMAIL_QUEUE_SCHEMA.sql:1)
6. Click: **"Run"** or press `Ctrl+Enter`

**Verify table created:**
```sql
SELECT COUNT(*) FROM email_queue;
```
Expected: `0` (empty table, but exists)

---

## Step 7: Deploy to Vercel

```bash
git add .
git commit -m "feat: configure Gmail SMTP for email service"
git push origin main
```

Vercel will automatically deploy. Wait for "Ready" status.

---

## ✅ Verification Steps

After deployment, verify everything works:

### 1. Check Queue Status
```bash
curl https://your-domain.vercel.app/api/email/status
```

**Expected response:**
```json
{
  "success": true,
  "smtp": {
    "configured": true,
    "host": "smtp.gmail.com",
    "from": "JECRC No Dues <your-gmail@gmail.com>"
  }
}
```

### 2. Submit Test Form
- Go to your production site
- Submit a no-dues application
- Staff should receive email within 5 seconds

### 3. Check Vercel Logs
- Go to: Vercel Dashboard → Functions → Logs
- Look for: `✅ Email sent successfully`

### 4. Verify Cron Job
- Go to: Settings → Cron Jobs
- Should show: `/api/email/process-queue` every 5 minutes

---

## 📊 Gmail Limits & Monitoring

### Daily Limits

**Free Gmail:**
- **500 emails per day** (rolling 24-hour period)
- Resets at midnight Pacific Time

**Google Workspace:**
- **2,000 emails per day** per user
- More reliable for production use

### What Happens When Limit Reached?

1. Gmail returns error: "Daily limit exceeded"
2. Email automatically queues in database
3. Cron job retries after limit resets
4. No emails are lost!

### Monitor Your Usage

**Check Gmail sent folder:**
```
Settings → See all settings → Filters and Blocked Addresses
```

**Check queue status daily:**
```bash
curl https://your-domain.vercel.app/api/email/status
```

**Watch for:**
- High `pending` count (> 50)
- Old pending emails (> 1 hour)
- Many failed emails

---

## 🐛 Troubleshooting Gmail Issues

### Issue: "Invalid login" error

**Cause:** Wrong app password or using regular Gmail password

**Solution:**
1. Generate NEW app password: https://myaccount.google.com/apppasswords
2. Copy it without spaces
3. Update `SMTP_PASS` in Vercel
4. Redeploy

### Issue: "Username and Password not accepted"

**Cause:** 2FA not enabled or app password revoked

**Solution:**
1. Verify 2FA enabled: https://myaccount.google.com/security
2. Generate fresh app password
3. Update Vercel environment variables

### Issue: "Daily sending quota exceeded"

**Cause:** Sent > 500 emails in 24 hours

**Solution:**
1. Wait for quota reset (midnight Pacific Time)
2. Emails will queue and auto-send after reset
3. Consider upgrading to Google Workspace ($6/month)
4. Or switch to SendGrid/Mailgun for higher limits

### Issue: Emails going to spam

**Cause:** Gmail used with non-Gmail domains

**Solution:**
1. **Short-term:** Ask recipients to mark as "Not Spam"
2. **Long-term:** 
   - Set up custom domain with SendGrid/Mailgun
   - Configure SPF, DKIM, DMARC records
   - Use domain matching `SMTP_FROM` address

### Issue: "Less secure app access"

**Cause:** Using old Gmail security (deprecated)

**Solution:**
- Gmail now requires App Passwords (not "Less secure apps")
- Follow Step 1 & 2 above to generate App Password
- "Less secure apps" setting is disabled by Google since May 2022

---

## 🔒 Security Best Practices

1. **Never share your App Password**
   - It grants full email access
   - Store only in Vercel environment variables
   - Never commit to git

2. **Rotate passwords regularly**
   - Revoke old app passwords
   - Generate new ones every 6 months
   - Update in Vercel immediately

3. **Use dedicated Gmail account**
   - Create account: `jecrc.nodues@gmail.com`
   - Use only for this application
   - Separate from personal email

4. **Enable monitoring**
   - Gmail → Settings → Filters
   - Set up activity alerts
   - Monitor sent folder daily

5. **Backup plan**
   - Keep SendGrid account ready
   - Can switch quickly if Gmail fails
   - Takes 5 minutes to reconfigure

---

## 📈 When to Upgrade from Gmail

**Consider upgrading if:**

- ✓ Sending > 500 emails/day regularly
- ✓ Need guaranteed delivery SLA
- ✓ Want detailed analytics/tracking
- ✓ Using custom domain (not @gmail.com)
- ✓ Need higher reliability

**Best alternatives:**
1. **SendGrid** - $15/month (40,000 emails)
2. **Mailgun** - Pay-as-you-go ($0.80/1000 emails)
3. **Google Workspace** - $6/user/month (2,000 emails/day)
4. **Amazon SES** - $0.10/1000 emails

**To switch:** Just update 3 environment variables in Vercel!

---

## ✅ Gmail Setup Complete!

You're ready when:

- [x] 2FA enabled on Gmail account
- [x] App Password generated (16 characters)
- [x] Environment variables added to Vercel (all 6)
- [x] Email queue table created in Supabase
- [x] Changes deployed to Vercel
- [x] Test email sent successfully
- [x] Cron job running every 5 minutes

**Next:** Submit a test form and verify staff receive emails!

---

## 🆘 Need Help?

**Gmail Account Help:**
- https://support.google.com/accounts/answer/185833 (App Passwords)
- https://support.google.com/accounts/answer/1064203 (2FA Setup)

**JECRC System Help:**
- Check: [`EMAIL_MIGRATION_DEPLOYMENT_CHECKLIST.md`](EMAIL_MIGRATION_DEPLOYMENT_CHECKLIST.md:1)
- Check: [`NODEMAILER_MIGRATION_COMPLETE.md`](NODEMAILER_MIGRATION_COMPLETE.md:1)

**Quick Test Command:**
```bash
# Test SMTP connection
node -e "const nodemailer = require('nodemailer'); const t = nodemailer.createTransport({host:'smtp.gmail.com',port:587,auth:{user:'YOUR_GMAIL',pass:'YOUR_APP_PASSWORD'}}); t.verify().then(() => console.log('✅ Gmail SMTP working!')).catch(err => console.error('❌ Error:', err.message));"
```

Replace `YOUR_GMAIL` and `YOUR_APP_PASSWORD` with your values.

---

**Last Updated:** 2025-12-12  
**Gmail Daily Limit:** 500 emails/day (free), 2000/day (Workspace)  
**Setup Time:** 5 minutes  
**Difficulty:** Easy