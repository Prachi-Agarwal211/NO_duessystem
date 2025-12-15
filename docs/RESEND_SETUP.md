# Resend Domain Verification Setup Guide

## Problem Identified

The Resend API is currently in **test mode**, which means:
- ✅ Emails can only be sent to: `15anuragsingh2003@gmail.com` (your account email)
- ❌ Cannot send to department emails like `surbhi.jetavat@jecrcu.edu.in`
- ❌ All 10 department notifications fail

**Error from logs:**
```
statusCode: 403, name: 'validation_error', 
message: 'You can only send testing emails to your own email address (15anuragsingh2003@gmail.com). 
To send emails to other recipients, please verify a domain at resend.com/domains'
```

---

## Solution: Verify Domain on Resend

### Option 1: Use JECRC University Domain (Recommended)
**Domain:** `jecrcu.edu.in`

#### Steps:
1. **Login to Resend Dashboard**
   - Go to: https://resend.com/domains
   - Login with your account

2. **Add Domain**
   - Click "Add Domain"
   - Enter: `jecrcu.edu.in`
   - Click "Add"

3. **Get DNS Records**
   Resend will provide DNS records like:
   ```
   TXT record:
   Name: _resend.jecrcu.edu.in
   Value: resend-verification-code-xyz123
   
   MX records (for receiving):
   Priority 10: feedback-smtp.us-east-1.amazonses.com
   ```

4. **Add DNS Records**
   - Contact JECRC IT department
   - Ask them to add these DNS records to `jecrcu.edu.in`
   - Wait 24-48 hours for DNS propagation

5. **Verify Domain**
   - Click "Verify" in Resend dashboard
   - Once verified, you can send emails from `noreply@jecrcu.edu.in`

6. **Update Environment Variables**
   ```bash
   RESEND_FROM_EMAIL="JECRC No Dues <noreply@jecrcu.edu.in>"
   RESEND_REPLY_TO="support@jecrcu.edu.in"
   ```

---

### Option 2: Use Personal Domain (Quick Alternative)

If you have a personal domain (e.g., `example.com`):

1. Add domain to Resend
2. Add DNS records to your domain provider
3. Verify domain
4. Update environment variables:
   ```bash
   RESEND_FROM_EMAIL="JECRC No Dues <noreply@example.com>"
   ```

---

### Option 3: Use Resend's Subdomain (Fastest for Testing)

Resend provides free subdomains for quick setup:

1. Go to Resend dashboard
2. Click "Use Resend subdomain"
3. Get subdomain like: `yourcompany.resend.dev`
4. Update environment variables:
   ```bash
   RESEND_FROM_EMAIL="JECRC No Dues <noreply@yourcompany.resend.dev>"
   ```

**Note:** This looks less professional but works immediately.

---

## Update Vercel Environment Variables

Once domain is verified:

### Step 1: Go to Vercel Dashboard
1. Open: https://vercel.com/dashboard
2. Select project: `no-duessystem`
3. Go to: Settings → Environment Variables

### Step 2: Add/Update Variables
```bash
# Required
RESEND_API_KEY=re_your_actual_api_key_here

# Optional (recommended after domain verification)
RESEND_FROM_EMAIL=JECRC No Dues <noreply@jecrcu.edu.in>
RESEND_REPLY_TO=support@jecrcu.edu.in
```

### Step 3: Redeploy
- Go to Deployments tab
- Click "Redeploy" on latest deployment
- Or push new commit to trigger auto-deploy

---

## Testing After Setup

### Test 1: Send to Single Department
```bash
# Login as student
# Submit form
# Check logs for successful email
```

### Test 2: Send to All 10 Departments
```bash
# Submit new form
# Should see 10 emails sent successfully
# Each department email should receive notification
```

### Test 3: Check Email Deliverability
```bash
# Ask department staff to check:
# 1. Inbox (primary)
# 2. Spam folder
# 3. Check email headers
```

---

## Current Configuration

**File:** `src/lib/emailService.js`

```javascript
// Line 14-15
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'JECRC No Dues <onboarding@resend.dev>';
const REPLY_TO = process.env.RESEND_REPLY_TO || 'onboarding@resend.dev';
```

**Default sender:** `onboarding@resend.dev` (Resend's test email)
- ✅ Works for testing to your email only
- ❌ Cannot send to other recipients

**After domain verification:**
- ✅ Can send to any email address
- ✅ Professional sender name
- ✅ Proper reply-to address

---

## Troubleshooting

### Issue: DNS records not verified
**Solution:** 
- Wait 24-48 hours for DNS propagation
- Use `dig` or `nslookup` to check records
- Contact domain administrator

### Issue: Emails going to spam
**Solution:**
- Add SPF record
- Add DKIM record (Resend provides)
- Add DMARC record
- Warm up domain gradually

### Issue: Rate limit errors
**Solution:**
- Current code already handles this (1.1s delay)
- For 10 departments: ~11 seconds total
- No changes needed

---

## Quick Fix for Immediate Testing

If you need to test NOW without domain verification:

### Temporary Workaround
Change all department emails in database to your email temporarily:

```sql
-- TEMPORARY - For testing only
UPDATE departments 
SET email = '15anuragsingh2003@gmail.com';
```

**Then revert after domain is verified:**
```sql
-- Run the UPDATE_DEPARTMENT_EMAILS.sql script
```

**Warning:** This defeats the purpose of the system but allows you to test the workflow.

---

## Recommended Approach

### For Production (JECRC University):
1. ✅ Verify `jecrcu.edu.in` domain
2. ✅ Use `noreply@jecrcu.edu.in` as sender
3. ✅ Professional and trustworthy
4. ✅ Matches existing department emails

### Timeline:
- **Today:** Request DNS records from IT department
- **Tomorrow:** IT adds DNS records
- **Day 3-4:** DNS propagates and verifies
- **Day 5:** Production ready with verified domain

---

## Contact Information

**Resend Support:**
- Email: support@resend.com
- Docs: https://resend.com/docs

**JECRC IT Department:**
- Request DNS record changes for email system
- Provide Resend's DNS records
- Explain it's for official No Dues System

---

## Files Modified

All email functionality already uses environment variables:
- ✅ `src/lib/emailService.js` - Uses `RESEND_FROM_EMAIL`
- ✅ All API routes use centralized email service
- ✅ No code changes needed after domain verification

**Action Required:** Only environment variables in Vercel

---

## Summary

**Current State:**
- ❌ Resend in test mode
- ❌ Can only send to: 15anuragsingh2003@gmail.com
- ❌ All department notifications fail

**After Domain Verification:**
- ✅ Send to any email address
- ✅ Professional sender identity
- ✅ All 10 departments receive notifications
- ✅ Production ready

**Next Step:** Choose domain verification option and follow steps above.