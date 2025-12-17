# Email Issues - Deep Diagnostic & Solutions

## 🔍 Root Cause Analysis

Based on the production error `SMTP connection timeout`, here are the possible causes:

### 1. **SMTP Server Blocking Connections** (Most Likely)
Your error shows: `Error: Connection timeout` with `code: 'ETIMEDOUT', command: 'CONN'`

This means the SMTP connection attempt is timing out before establishing a connection.

### Possible Causes:

#### A. **Gmail SMTP with "Less Secure Apps" Disabled**
If you're using Gmail SMTP (`smtp.gmail.com:587`):
- Google has **disabled "Less secure app access"** as of May 2022
- Regular Gmail passwords **NO LONGER WORK** with SMTP
- You **MUST** use an "App Password" instead

**Solution:**
1. Go to https://myaccount.google.com/apppasswords
2. Generate an App Password (select "Mail" and "Other")
3. Use this 16-character App Password as `SMTP_PASS` (not your Gmail password)

#### B. **Firewall/Network Blocking**
Render.com (your hosting) might be blocking outbound SMTP connections on port 587 or 465.

**Solution:**
- Use port 587 with TLS (most reliable)
- Or try port 465 with SSL
- Check Render's firewall rules

#### C. **DNS Issues with Vercel Domain**
You mentioned "Vercel account DNS is being set on the no dues reply thing"

**Problem:** If your `SMTP_FROM` email uses a Vercel domain that doesn't exist or isn't properly configured, the SMTP server might reject the connection.

**Current Setting:**
```javascript
const FROM_EMAIL = process.env.SMTP_FROM || 'JECRC UNIVERSITY NO DUES <noreply@jecrc.ac.in>';
```

**Solution:**
- Make sure `noreply@jecrc.ac.in` is a real email address OR
- Use your actual Gmail address as the FROM address
- Update `SMTP_FROM` in Render environment variables

---

## ✅ CORRECT Environment Variables for Gmail

Here's what you need to set in **Render.com Dashboard → Environment**:

```bash
# Gmail SMTP Configuration (RECOMMENDED)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=JECRC NO DUES <your-gmail@gmail.com>

# Supabase (already set)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Optional: Cron job security
CRON_SECRET=your-random-secret
```

### How to Get Gmail App Password:
1. Go to Google Account: https://myaccount.google.com/
2. Click "Security" → "2-Step Verification" (must be enabled)
3. Scroll down to "App passwords"
4. Click "App passwords"
5. Select "Mail" and "Other (Custom name)"
6. Name it "JECRC No Dues System"
7. Click "Generate"
8. Copy the 16-character password (spaces don't matter)
9. Use this as `SMTP_PASS` in Render

---

## 🔄 Alternative: Use Resend.com (Recommended for Production)

Gmail has strict rate limits (100-500 emails/day). For a university system, you should use a transactional email service:

### Option 1: Resend.com (Free tier: 3,000 emails/month)
```bash
# No SMTP needed - uses API
RESEND_API_KEY=re_xxxxxxxxxxxxx
SMTP_FROM=JECRC NO DUES <noreply@yourdomain.com>
```

### Option 2: SendGrid (Free tier: 100 emails/day)
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=JECRC NO DUES <noreply@yourdomain.com>
```

### Option 3: AWS SES (Cheapest for high volume)
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM=JECRC NO DUES <verified@yourdomain.com>
```

---

## 🧪 Test Email Configuration

### Method 1: Test Script (Quick)

Create `test-email.js`:
```javascript
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testEmail() {
  console.log('🧪 Testing SMTP Configuration...\n');
  console.log('Configuration:');
  console.log(`  Host: ${process.env.SMTP_HOST}`);
  console.log(`  Port: ${process.env.SMTP_PORT}`);
  console.log(`  User: ${process.env.SMTP_USER}`);
  console.log(`  From: ${process.env.SMTP_FROM}\n`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000
  });

  try {
    console.log('⏳ Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    console.log('⏳ Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_USER, // Send to yourself
      subject: 'Test Email from JECRC No Dues System',
      html: '<h1>Success!</h1><p>Email configuration is working correctly.</p>'
    });

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}\n`);
    console.log('🎉 All tests passed! Email is configured correctly.');
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('\nTroubleshooting:');
    
    if (error.code === 'ETIMEDOUT') {
      console.error('  → Connection timeout. Possible causes:');
      console.error('     1. Firewall blocking SMTP port');
      console.error('     2. Wrong SMTP_HOST or SMTP_PORT');
      console.error('     3. Network issues on hosting provider');
    } else if (error.code === 'EAUTH') {
      console.error('  → Authentication failed. Possible causes:');
      console.error('     1. Wrong SMTP_USER or SMTP_PASS');
      console.error('     2. Need to use App Password (for Gmail)');
      console.error('     3. 2-Step Verification not enabled (Gmail)');
    } else if (error.code === 'ENOTFOUND') {
      console.error('  → Host not found. Check SMTP_HOST spelling');
    }
  }
}

testEmail();
```

Run it:
```bash
node test-email.js
```

### Method 2: Use Render Logs
After deployment, check Render logs:
1. Go to Render Dashboard → Your Service
2. Click "Logs"
3. Look for these messages:
   - ✅ `SMTP server ready to send emails` = Good
   - ❌ `SMTP connection failed` = Check credentials
   - ❌ `Connection timeout` = Firewall/network issue

---

## 🔧 Current Code Issues & Fixes

### Issue 1: SMTP Connection Timeout (Already Identified)
**Location:** [`src/lib/emailService.js:17-29`](src/lib/emailService.js:17-29)

**Current Code:**
```javascript
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateLimit: 10
};
```

**Problem:** No connection timeout configured. Default timeout is too long.

**Fix:** Add timeout configuration:
```javascript
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateLimit: 10,
  connectionTimeout: 10000, // 10 seconds (default: 2 minutes)
  greetingTimeout: 10000,   // 10 seconds (default: 30 seconds)
  socketTimeout: 10000       // 10 seconds (default: unlimited)
};
```

### Issue 2: Email Queue Column Mismatch (FIXED ✅)
Already fixed in previous update:
- Changed `html_content` → `html_body`
- Changed `text_content` → `text_body`
- Changed `to_address` → `recipient_email`

### Issue 3: Missing Error Context
**Location:** [`src/lib/emailService.js:142-158`](src/lib/emailService.js:142-158)

**Problem:** Error logs don't show which SMTP setting is wrong.

**Fix:** Add diagnostic logging:
```javascript
} catch (error) {
  console.error('❌ Email send error:', error);
  console.error('   SMTP Host:', process.env.SMTP_HOST || 'smtp.gmail.com');
  console.error('   SMTP Port:', process.env.SMTP_PORT || '587');
  console.error('   SMTP User:', process.env.SMTP_USER || 'NOT SET');
  console.error('   Error Code:', error.code);
  console.error('   Error Command:', error.command);
  
  // Add to queue on failure if enabled
  if (queueOnFailure) {
    console.log('📥 Adding failed email to queue for retry...');
    const queueResult = await addToQueue({ to, subject, html, text, metadata });
    return { 
      success: false, 
      error: error.message, 
      queued: queueResult.success,
      queueId: queueResult.queueId 
    };
  }
  
  return { success: false, error: error.message };
}
```

---

## 📋 Action Plan (Priority Order)

### STEP 1: Fix Gmail Authentication (CRITICAL)
1. Enable 2-Step Verification on Gmail
2. Generate App Password
3. Update `SMTP_PASS` in Render with App Password
4. Update `SMTP_FROM` to use your Gmail address
5. Redeploy

### STEP 2: Add Timeout Configuration
1. Update `SMTP_CONFIG` with timeouts
2. Add better error logging
3. Deploy and test

### STEP 3: Test Email Functionality
1. Submit a test form
2. Check Render logs for SMTP connection
3. Verify email is received or queued

### STEP 4: Monitor Email Queue
1. Check `email_queue` table: `SELECT * FROM email_queue ORDER BY created_at DESC LIMIT 10`
2. Check for `status = 'pending'` (queued for retry)
3. Check for `status = 'failed'` (needs investigation)

### STEP 5: Consider Production Email Service (Optional)
1. Sign up for Resend.com (free tier)
2. Verify domain
3. Get API key
4. Update environment variables
5. Switch from SMTP to Resend API

---

## 🚨 Quick Fix for Immediate Testing

If you just want emails working NOW for testing:

```bash
# Use Gmail with App Password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=JECRC NO DUES <your-email@gmail.com>
```

Then run:
```bash
node test-email.js
```

If this works locally but not on Render, the issue is Render's firewall blocking SMTP.

---

## 📊 Monitoring & Debugging

### Check Email Queue Status:
```sql
-- See pending emails
SELECT id, recipient_email, subject, status, attempts, last_error, created_at 
FROM email_queue 
WHERE status = 'pending' 
ORDER BY created_at DESC 
LIMIT 20;

-- See failed emails
SELECT id, recipient_email, subject, status, attempts, last_error, created_at 
FROM email_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 20;

-- Clear old queued emails (optional)
DELETE FROM email_queue WHERE status IN ('sent', 'failed') AND created_at < NOW() - INTERVAL '7 days';
```

### Check Render Logs:
```bash
# In Render Dashboard → Logs, look for:
✅ SMTP server ready to send emails
❌ SMTP connection failed: <error>
📥 Email added to queue: <id>
✅ Email sent successfully - ID: <messageId>
```

---

## 💡 Best Practices

1. **Use App Passwords** (not regular passwords) for Gmail
2. **Use Transactional Email Service** (Resend/SendGrid) for production
3. **Monitor Email Queue** regularly
4. **Set up Cron Job** to process queue every 5 minutes
5. **Log all email events** to audit_log table
6. **Rate limit** email sending to avoid spam flags

---

## 🆘 Still Not Working?

If emails still don't work after all fixes:

1. **Check Render's SMTP Support:**
   - Contact Render support to confirm SMTP is allowed
   - Ask if port 587 is blocked

2. **Use Alternative:**
   - Switch to Resend.com API (no SMTP needed)
   - Or use SendGrid/AWS SES

3. **Disable Emails Temporarily:**
   - Set `SMTP_USER=` (empty) to queue all emails
   - Process queue manually later when fixed

---

**Created**: 2025-12-17  
**Status**: Diagnostic Complete - Action Required