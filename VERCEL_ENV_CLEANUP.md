# ✅ Vercel Environment Variables - What to Delete

## 🗑️ DELETE These Old Resend Variables (No Longer Needed)

Go to Vercel → Settings → Environment Variables and **DELETE** these 3 variables:

### 1. RESEND_FROM_EMAIL ❌
- **Action:** Delete
- **Reason:** Using Gmail SMTP now, not Resend
- **Click:** Three dots menu → Delete

### 2. RESEND_API_KEY ❌
- **Action:** Delete
- **Reason:** No longer using Resend service
- **Click:** Three dots menu → Delete

### 3. RESEND_REPLY_TO ❌
- **Action:** Delete
- **Reason:** Not needed with Gmail SMTP
- **Click:** Three dots menu → Delete

---

## ✅ KEEP These Variables (Required)

### Gmail SMTP Variables (Just Added) ✅
- `SMTP_HOST` ✅ Keep
- `SMTP_PORT` ✅ Keep
- `SMTP_SECURE` ✅ Keep
- `SMTP_USER` ✅ Keep
- `SMTP_PASS` ✅ Keep
- `SMTP_FROM` ✅ Keep

### Application Variables ✅
- `NEXT_PUBLIC_APP_URL` ✅ Keep
- `NEXT_PUBLIC_SUPABASE_URL` ✅ Keep
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅ Keep
- `SUPABASE_SERVICE_ROLE_KEY` ✅ Keep
- `JWT_SECRET` ✅ Keep

---

## 📋 Step-by-Step Deletion

### In Vercel Dashboard:

1. **Go to:** Settings → Environment Variables

2. **Find:** RESEND_FROM_EMAIL
   - Click: Three dots (⋮) on the right
   - Click: **Delete**
   - Confirm deletion

3. **Find:** RESEND_API_KEY
   - Click: Three dots (⋮) on the right
   - Click: **Delete**
   - Confirm deletion

4. **Find:** RESEND_REPLY_TO
   - Click: Three dots (⋮) on the right
   - Click: **Delete**
   - Confirm deletion

---

## ✅ Final Environment Variables List

After cleanup, you should have **exactly 11 variables**:

```
✅ SMTP_HOST
✅ SMTP_PORT
✅ SMTP_SECURE
✅ SMTP_USER
✅ SMTP_PASS
✅ SMTP_FROM
✅ NEXT_PUBLIC_APP_URL
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ JWT_SECRET
```

**Total:** 11 variables (6 SMTP + 5 Application)

---

## 🚀 Next Steps After Cleanup

### 1. Create Email Queue Table
- Go to Supabase SQL Editor
- Run [`EMAIL_QUEUE_SCHEMA.sql`](EMAIL_QUEUE_SCHEMA.sql:1)
- Verify: `SELECT COUNT(*) FROM email_queue;`

### 2. Deploy Changes
```bash
git add .
git commit -m "feat: complete Gmail SMTP migration"
git push origin main
```

### 3. Verify Production
```bash
curl https://your-domain.vercel.app/api/email/status
```

Expected response:
```json
{
  "success": true,
  "smtp": {
    "configured": true,
    "host": "smtp.gmail.com",
    "from": "JECRC No Dues <noreply.nodues@jecrcu.edu.in>"
  }
}
```

### 4. Test Email Sending
- Submit a no-dues form
- Staff should receive emails
- Check Vercel logs for: `✅ Email sent successfully`

---

## ⚠️ Why Delete Old Variables?

1. **Security:** Unused API keys are a security risk
2. **Clarity:** Clean environment variables are easier to manage
3. **Cost:** Free up Resend API key for other uses
4. **Best Practice:** Remove deprecated dependencies

---

## 🔄 Can I Rollback?

If you need to revert to Resend:

1. **Don't delete yet!** Keep the Resend variables temporarily
2. Test Gmail thoroughly first
3. Once Gmail is working perfectly, then delete Resend variables
4. You can always re-add them later if needed

**Recommendation:** Test Gmail in production first, then delete Resend variables after 24 hours of successful operation.

---

## ✅ Cleanup Complete Checklist

- [ ] Deleted `RESEND_FROM_EMAIL`
- [ ] Deleted `RESEND_API_KEY`
- [ ] Deleted `RESEND_REPLY_TO`
- [ ] Verified 11 total variables remain
- [ ] Created email_queue table in Supabase
- [ ] Deployed to Vercel
- [ ] Tested production email sending
- [ ] Verified emails received successfully

---

**Status:** Ready to delete old Resend variables  
**Safety:** Keep for 24h if unsure, delete after testing  
**Impact:** Zero - code no longer uses Resend