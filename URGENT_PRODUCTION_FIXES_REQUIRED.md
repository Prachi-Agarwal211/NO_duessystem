# 🚨 URGENT: Production Deployment Fixes Required

**Issue:** Form submission failing with 500 error on production (https://no-duessystem.vercel.app)

**Root Cause:** Missing database tables and environment variables after migration from Resend to Nodemailer

---

## ❌ Current Errors

```
POST https://no-duessystem.vercel.app/api/student 500 (Internal Server Error)
Error: Failed to create form record
```

**Why it fails:**
1. `emailService.js` tries to insert into `email_queue` table → **Table doesn't exist**
2. Email service initialization fails → Form submission fails
3. SMTP credentials not configured in Vercel

---

## ✅ FIXES REQUIRED (Do in Order)

### **FIX 1: Create Email Queue Table in Supabase** ⚡ CRITICAL

**Action:** Run the SQL in Supabase SQL Editor (Production Database)

**File:** `EMAIL_QUEUE_SCHEMA.sql` (already exists in project)

**How to Apply:**
```bash
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
2. Copy ENTIRE contents of EMAIL_QUEUE_SCHEMA.sql
3. Paste in SQL Editor
4. Click "Run" or press Ctrl+Enter
5. Verify: Should see "Success. No rows returned"
```

**What it creates:**
- ✅ `email_queue` table with columns: id, to_address, subject, html_content, status, etc.
- ✅ Indexes for performance
- ✅ RLS policies (service role bypass)
- ✅ Retry logic columns

---

### **FIX 2: Add SMTP Environment Variables to Vercel** ⚡ CRITICAL

**Action:** Add the following variables in Vercel Dashboard

**Go to:** https://vercel.com/your-team/no-duessystem/settings/environment-variables

**Add These Variables:**

```bash
# SMTP Configuration (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply.nodues@jecrcu.edu.in
SMTP_PASS=kwqo vora yeih rkce
SMTP_FROM=JECRC No Dues <noreply.nodues@jecrcu.edu.in>

# Email Queue Settings
EMAIL_QUEUE_BATCH_SIZE=50
EMAIL_MAX_RETRIES=3
```

**Important:**
- ✅ Set environment to: **Production**
- ✅ After adding, click "Redeploy" on latest deployment
- ❌ **DELETE OLD VARIABLES:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`

---

### **FIX 3: Verify Convocation Table Has Data**

**Action:** Check if `convocation_eligible_students` table is populated

**SQL Query to Run:**
```sql
-- Check if table exists and has data
SELECT COUNT(*) as total_students FROM convocation_eligible_students;

-- Should return: 3,181 students
```

**If COUNT = 0 or error:**
```bash
1. Open file: CONVOCATION_CSV_IMPORT.sql
2. Copy entire SQL content
3. Paste in Supabase SQL Editor
4. Run to import all 3,181 students
```

---

### **FIX 4: Fix RLS Policy for Form Duplicate Check** (Optional - Removes 406 Error)

**Problem:** "Check" button in form uses client-side Supabase (blocked by RLS)

**Quick Fix Option A - Remove Check Button (Recommended):**

Edit `src/components/student/SubmitForm.jsx` lines 602-620:
```jsx
// Comment out or remove the "Check" button
{/* 
<button
  type="button"
  onClick={checkExistingForm}
  ...
>
  Check
</button>
*/}
```

**Or Option B - Create API Endpoint (Better UX):**

Create `src/app/api/student/check/route.js`:
```javascript
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const { registration_no } = await request.json();
  
  if (!registration_no) {
    return NextResponse.json(
      { exists: false, error: 'Registration number required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('no_dues_forms')
    .select('id')
    .eq('registration_no', registration_no.trim().toUpperCase())
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ exists: false, error: 'Check failed' }, { status: 500 });
  }

  return NextResponse.json({ exists: !!data });
}
```

Then update button in `SubmitForm.jsx`:
```javascript
const checkExistingForm = async () => {
  setChecking(true);
  try {
    const response = await fetch('/api/student/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_no: formData.registration_no })
    });
    const result = await response.json();
    if (result.exists) {
      setError('A form already exists...');
    }
  } catch (err) {
    console.error(err);
  } finally {
    setChecking(false);
  }
};
```

---

## 🚀 DEPLOYMENT STEPS (After Fixes)

### **Step 1: Apply Database Fixes**
```bash
✅ Run EMAIL_QUEUE_SCHEMA.sql in Supabase SQL Editor
✅ Verify convocation data exists (3,181 students)
✅ Test: SELECT COUNT(*) FROM email_queue; (should not error)
```

### **Step 2: Update Vercel Environment Variables**
```bash
✅ Add all SMTP_* variables
✅ Add EMAIL_* variables  
✅ Delete old RESEND_* variables
✅ Click "Redeploy" on latest deployment
```

### **Step 3: Push Code Changes (If needed)**
```bash
git add .
git commit -m "fix: Remove Check button or add API endpoint"
git push origin main
# Vercel auto-deploys
```

### **Step 4: Test Production**
```bash
1. Go to: https://no-duessystem.vercel.app/student/submit-form
2. Fill out form with test data:
   - Registration: 22BCAN001 (or any from convocation list)
   - Tab out → Should auto-fill name/year
   - Fill remaining fields
3. Submit form
4. Check Vercel logs: Should see "✅ Email sent" or "📥 Email queued"
5. Check Supabase email_queue table for queued emails
```

---

## 📊 Verification Checklist

After applying fixes, verify:

**Database:**
- [ ] `email_queue` table exists
- [ ] `convocation_eligible_students` has 3,181 rows
- [ ] RLS policies allow service role access

**Vercel:**
- [ ] All SMTP_* environment variables added
- [ ] Old RESEND_* variables deleted
- [ ] Latest deployment successful
- [ ] Function logs show no SMTP errors

**Functionality:**
- [ ] Form submission works (200 OK response)
- [ ] Email notifications sent or queued
- [ ] Convocation validation works (tab out from reg number)
- [ ] Auto-fill works for eligible students
- [ ] Staff receives email notifications

---

## 🔍 Debugging Commands

**Check Vercel Logs:**
```bash
vercel logs --prod
# Look for "✅ Email sent" or "📥 Email queued"
```

**Check Email Queue in Supabase:**
```sql
-- See queued emails
SELECT * FROM email_queue 
WHERE status = 'pending' 
ORDER BY created_at DESC 
LIMIT 10;

-- See sent emails
SELECT * FROM email_queue 
WHERE status = 'sent' 
ORDER BY sent_at DESC 
LIMIT 10;
```

**Check Form Submissions:**
```sql
-- Recent submissions
SELECT id, registration_no, student_name, status, created_at
FROM no_dues_forms
ORDER BY created_at DESC
LIMIT 10;
```

---

## ⚡ Quick Emergency Fix (Temporary)

If you need form submission to work **immediately** while debugging email:

**Modify:** `src/app/api/student/route.js` line 391-487

**Wrap email code in try-catch:**
```javascript
// Line 391: Wrap email notification in try-catch
try {
  // ... existing email notification code ...
  await notifyAllDepartments({...});
} catch (emailError) {
  console.error('❌ Email failed (non-fatal):', emailError);
  // Continue - form is already created
}

// Line 489: Return success (form created even if email fails)
return NextResponse.json({
  success: true,
  data: form,
  message: 'Application submitted successfully'
});
```

This allows form submission even if email fails (emails will be queued for retry).

---

## 📞 Support

**If issues persist:**
1. Check Vercel function logs for detailed error
2. Check Supabase logs for database errors  
3. Verify SMTP credentials work (test Gmail login)
4. Check if Gmail App Password is correct

**Test Email Manually:**
```bash
# In Vercel function or local terminal
node -e "
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'noreply.nodues@jecrcu.edu.in', pass: 'kwqo vora yeih rkce' }
});
transport.sendMail({
  from: 'JECRC <noreply.nodues@jecrcu.edu.in>',
  to: 'test@example.com',
  subject: 'Test',
  html: '<p>Test email</p>'
}).then(console.log).catch(console.error);
"
```

---

## 📝 Summary

**Priority Order:**
1. ⚡ **CRITICAL:** Create `email_queue` table (Supabase SQL)
2. ⚡ **CRITICAL:** Add SMTP variables to Vercel
3. 🔄 **IMPORTANT:** Verify convocation data exists
4. 🎨 **OPTIONAL:** Fix "Check" button (remove or add API)

**After fixes:** Form submission will work, emails will send/queue properly, convocation auto-fill will work.

**Time Required:** ~15 minutes (mostly copy-paste operations)

---

Last Updated: 2025-01-12 13:11 IST