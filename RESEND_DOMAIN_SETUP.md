# Resend Email Configuration Guide

## Current Status: Using Default Sender

The system is currently configured to use Resend's default sender (`onboarding@resend.dev`) which works immediately without domain verification. This is suitable for development and testing.

## Email Configuration

### Current Setup (Testing/Development)
```env
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
# FROM_EMAIL defaults to: onboarding@resend.dev
# REPLY_TO defaults to: onboarding@resend.dev
```

### Production Setup (Custom Domain)

For production, you should use your own verified domain for professional appearance and better deliverability.

#### Step 1: Verify Your Domain in Resend

1. **Login to Resend Dashboard**
   - Go to: https://resend.com/domains
   - Click "Add Domain"

2. **Add Domain**
   - Enter: `jecrcu.edu.in` (or `jecrc.ac.in`)
   - Choose verification method

3. **Add DNS Records**
   You'll need to add these DNS records to your domain:
   
   ```
   Type: TXT
   Name: @
   Value: resend-verification=xxxxxxxxxxxxx
   
   Type: TXT
   Name: @
   Value: v=spf1 include:spf.resend.com ~all
   
   Type: TXT
   Name: resend._domainkey
   Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBi...
   
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:dmarc@jecrcu.edu.in
   ```

4. **Verify Domain**
   - Click "Verify DNS Records"
   - Wait for verification (usually 15 minutes to 48 hours)
   - Status will change to "Verified" when complete

#### Step 2: Update Environment Variables

Once domain is verified, update `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=JECRC No Dues <noreply@jecrcu.edu.in>
RESEND_REPLY_TO=support@jecrcu.edu.in
```

#### Step 3: Restart Application

```bash
# Stop the development server
# Restart it to load new environment variables
npm run dev
```

## Testing Email Delivery

### Test with Default Sender (Current)

```bash
# This should work immediately
node scripts/test-send-notification.js
```

**Expected Result:**
- ✅ Email sends successfully
- 📧 Received from: `JECRC No Dues <onboarding@resend.dev>`
- 📧 Reply-to: `onboarding@resend.dev`

### Test with Custom Domain (After Verification)

```bash
# After domain verification
node scripts/test-send-notification.js
```

**Expected Result:**
- ✅ Email sends successfully
- 📧 Received from: `JECRC No Dues <noreply@jecrcu.edu.in>`
- 📧 Reply-to: `support@jecrcu.edu.in`

## Common Issues

### 1. Domain Not Verified
**Error:** `Domain not verified`
**Solution:** 
- Check DNS records are added correctly
- Wait for DNS propagation (up to 48 hours)
- Verify in Resend dashboard

### 2. SPF/DKIM Issues
**Error:** Emails land in spam
**Solution:**
- Ensure SPF record is correct: `v=spf1 include:spf.resend.com ~all`
- Verify DKIM record is added
- Add DMARC policy

### 3. Invalid API Key
**Error:** `Invalid API key`
**Solution:**
- Verify `RESEND_API_KEY` in `.env.local`
- Check key starts with `re_`
- Ensure it's not expired

### 4. Rate Limiting
**Error:** `Too many requests`
**Solution:**
- Free tier: 100 emails/day, 1 email/second
- Upgrade plan if needed
- Add delays between bulk sends

## Email Deliverability Best Practices

### 1. Use Verified Domain
- Better inbox placement
- Professional appearance
- Higher trust score

### 2. Configure SPF/DKIM/DMARC
- Prevents spoofing
- Reduces spam classification
- Required by most providers

### 3. Warm Up Your Domain
- Start with low volume
- Gradually increase over weeks
- Monitor bounce rates

### 4. Monitor Metrics
- Open rates
- Bounce rates
- Spam complaints
- Unsubscribe rates

## Resend Dashboard Links

- **Domains:** https://resend.com/domains
- **API Keys:** https://resend.com/api-keys
- **Logs:** https://resend.com/logs
- **Analytics:** https://resend.com/analytics
- **Documentation:** https://resend.com/docs

## Current System Status

### ✅ Working Now (Default Sender)
- Email service initialized
- Test script functional
- Staff notifications configured
- Using: `onboarding@resend.dev`

### 🔄 Pending (Custom Domain)
- Domain verification in Resend
- DNS record configuration
- Custom sender email setup
- Production-ready configuration

## Next Steps

1. **For Development/Testing:** 
   - ✅ Current setup is ready
   - Run: `node scripts/test-send-notification.js`
   - Check email at: `15anuragsingh2003@gmail.com`

2. **For Production:**
   - Verify domain: `jecrcu.edu.in` in Resend
   - Add DNS records
   - Update `.env.local` with custom sender
   - Test again with verified domain

3. **Monitor and Optimize:**
   - Track delivery rates
   - Monitor spam scores
   - Optimize email templates
   - Handle bounces appropriately

---

## Quick Reference

### Test Email Now (Default Sender)
```bash
node scripts/test-send-notification.js
```

### Check Staff Configuration
```bash
node scripts/test-unified-notifications.js
```

### Create Test Staff
```bash
node scripts/create-test-staff.js
```

### Environment Variables
```env
# Required
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Optional (defaults to onboarding@resend.dev)
RESEND_FROM_EMAIL=JECRC No Dues <noreply@jecrcu.edu.in>
RESEND_REPLY_TO=support@jecrcu.edu.in
```

---

**Note:** The system will work immediately with `onboarding@resend.dev`. Custom domain setup is optional but recommended for production use.