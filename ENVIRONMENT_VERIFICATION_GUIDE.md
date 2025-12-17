# Environment Variables Verification Guide

## 🔍 Complete Environment Setup Checklist

This guide helps you verify that all environment variables are correctly configured for the JECRC No Dues System.

---

## 📋 Required Environment Variables

### ✅ For Local Development (.env.local)

```bash
# ========================================
# 1. SUPABASE CONFIGURATION (CRITICAL)
# ========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # ⚠️ Must be SERVICE ROLE, NOT anon!

# ========================================
# 2. JWT SECRET (CRITICAL)
# ========================================
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6  # Min 32 characters

# ========================================
# 3. EMAIL CONFIGURATION (REQUIRED)
# ========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@jecrcu.edu.in
SMTP_PASS=abcd efgh ijkl mnop  # Gmail App Password (16 chars)
SMTP_FROM=JECRC No Dues <noreply.nodues@jecrcu.edu.in>

# ========================================
# 4. APPLICATION URL
# ========================================
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# ========================================
# 5. EMAIL QUEUE (OPTIONAL)
# ========================================
EMAIL_QUEUE_BATCH_SIZE=50
EMAIL_MAX_RETRIES=3
CRON_SECRET=your-random-cron-secret
```

---

## ✅ For Production (Render/Vercel)

```bash
# Same as above, but with production values:
NEXT_PUBLIC_BASE_URL=https://no-duessystem.onrender.com
NODE_ENV=production
```

---

## 🔍 Verification Checklist

### Step 1: Check Supabase Keys

#### ✅ NEXT_PUBLIC_SUPABASE_URL
```bash
# Should look like:
https://abcdefghijklmnop.supabase.co
```

**How to find:**
1. Go to Supabase Dashboard
2. Select your project
3. Settings → API
4. Copy "Project URL"

#### ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
```bash
# Should start with:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to find:**
1. Supabase Dashboard → Settings → API
2. Copy "anon public" key
3. ⚠️ **NOT** the service_role key!

#### ⚠️ SUPABASE_SERVICE_ROLE_KEY (CRITICAL!)
```bash
# Should start with:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# BUT will be DIFFERENT and LONGER than anon key
```

**How to find:**
1. Supabase Dashboard → Settings → API
2. Copy "service_role" key (secret!)
3. ⚠️ **This bypasses RLS - NEVER expose to frontend!**

**Common Mistake:**
```bash
❌ WRONG: Using anon key as service_role key
✅ RIGHT: Using actual service_role key (longer, more permissions)
```

---

### Step 2: Check JWT Secret

#### ✅ JWT_SECRET
```bash
# Should be at least 32 characters, random string
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

**How to generate:**
```bash
# On Linux/Mac:
openssl rand -hex 32

# Or Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output example:
7f3e9d2c8b1a5f4e6c9d2a8b7e5f3c1d9a6e4b2c8f7d3a1e9c5b7f4d2a8e6c3
```

---

### Step 3: Check Email Configuration

#### ✅ SMTP Credentials for Gmail

**Current Setup (from .env.example):**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@jecrcu.edu.in  # ✅ Correct domain
SMTP_PASS=abcd efgh ijkl mnop    # Gmail App Password
SMTP_FROM=JECRC No Dues <noreply.nodues@jecrcu.edu.in>
```

**⚠️ CRITICAL: Gmail App Password Setup**

If using Gmail, you MUST create an App Password:

1. Go to Google Account: https://myaccount.google.com/
2. Security → 2-Step Verification (enable if not already)
3. Security → App Passwords
4. Select App: "Mail"
5. Select Device: "Other" → "JECRC No Dues System"
6. Click "Generate"
7. Copy the 16-character password (format: `abcd efgh ijkl mnop`)
8. Paste in `SMTP_PASS` (with or without spaces)

**Common Issues:**
```bash
❌ WRONG: Using regular Gmail password
✅ RIGHT: Using 16-character App Password

❌ WRONG: SMTP_PORT=465 with SMTP_SECURE=false
✅ RIGHT: SMTP_PORT=587 with SMTP_SECURE=false
   OR: SMTP_PORT=465 with SMTP_SECURE=true
```

---

### Step 4: Test Environment Variables

#### Test Script 1: Supabase Connection
Create `scripts/test-supabase.js`:
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase Connection...\n');

// Test 1: Public client
console.log('1. Testing PUBLIC client (anon key)...');
const publicClient = createClient(supabaseUrl, supabaseAnonKey);
publicClient.from('profiles').select('count').single()
  .then(({ data, error }) => {
    if (error) {
      console.log('   ❌ PUBLIC client failed:', error.message);
    } else {
      console.log('   ✅ PUBLIC client works!');
    }
  });

// Test 2: Service client
console.log('2. Testing SERVICE client (service_role key)...');
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
serviceClient.from('profiles').select('count').single()
  .then(({ data, error }) => {
    if (error) {
      console.log('   ❌ SERVICE client failed:', error.message);
    } else {
      console.log('   ✅ SERVICE client works!');
    }
  });

// Test 3: Storage access
console.log('3. Testing STORAGE access...');
serviceClient.storage.from('no-dues-files').list('manual-entries', { limit: 1 })
  .then(({ data, error }) => {
    if (error) {
      console.log('   ❌ STORAGE access failed:', error.message);
    } else {
      console.log('   ✅ STORAGE access works!');
    }
  });

setTimeout(() => {
  console.log('\n✅ All tests complete!');
  process.exit(0);
}, 2000);
```

**Run it:**
```bash
node scripts/test-supabase.js
```

**Expected Output:**
```
Testing Supabase Connection...

1. Testing PUBLIC client (anon key)...
   ✅ PUBLIC client works!
2. Testing SERVICE client (service_role key)...
   ✅ SERVICE client works!
3. Testing STORAGE access...
   ✅ STORAGE access works!

✅ All tests complete!
```

---

#### Test Script 2: Email Configuration
Create `scripts/test-email.js`:
```javascript
const nodemailer = require('nodemailer');

console.log('Testing Email Configuration...\n');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

console.log('Configuration:');
console.log('  Host:', process.env.SMTP_HOST);
console.log('  Port:', process.env.SMTP_PORT);
console.log('  User:', process.env.SMTP_USER);
console.log('  Pass:', process.env.SMTP_PASS ? '****' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');

transporter.verify((error, success) => {
  if (error) {
    console.log('\n❌ Email configuration FAILED:');
    console.log('   Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check SMTP_USER is correct email');
    console.log('   2. Check SMTP_PASS is App Password (not regular password)');
    console.log('   3. Ensure 2FA is enabled on Gmail account');
    console.log('   4. Verify SMTP_PORT (587 or 465)');
  } else {
    console.log('\n✅ Email configuration works!');
    console.log('   SMTP server is ready to send emails');
  }
  process.exit(error ? 1 : 0);
});
```

**Run it:**
```bash
node scripts/test-email.js
```

**Expected Output:**
```
Testing Email Configuration...

Configuration:
  Host: smtp.gmail.com
  Port: 587
  User: noreply@jecrcu.edu.in
  Pass: ****mnop

✅ Email configuration works!
   SMTP server is ready to send emails
```

---

## 🔍 Production Environment Check (Render)

### Step 1: Verify Variables in Render Dashboard

1. Go to https://dashboard.render.com
2. Select your service: `no-duessystem`
3. Environment → Environment Variables
4. Check all variables are present:

```
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY  ⚠️ CRITICAL
✅ JWT_SECRET
✅ SMTP_HOST
✅ SMTP_PORT
✅ SMTP_SECURE
✅ SMTP_USER
✅ SMTP_PASS
✅ SMTP_FROM
✅ NEXT_PUBLIC_BASE_URL (https://no-duessystem.onrender.com)
✅ NODE_ENV (production)
```

### Step 2: Test Production Endpoints

```bash
# Test 1: Health check
curl https://no-duessystem.onrender.com/

# Test 2: API connectivity
curl https://no-duessystem.onrender.com/api/public/config

# Test 3: Upload API (should require auth)
curl -X POST https://no-duessystem.onrender.com/api/upload

# Expected: 401 Unauthorized (good - protected!)
```

---

## ❌ Common Issues & Fixes

### Issue 1: "Invalid Supabase URL"
```
Error: Invalid Supabase URL
```

**Fix:**
```bash
# Check format:
❌ WRONG: your-project.supabase.co
✅ RIGHT: https://your-project.supabase.co

# Include https://
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
```

---

### Issue 2: "JWT malformed" or "Invalid JWT"
```
Error: JWT malformed
```

**Fix:**
```bash
# Ensure no extra spaces or line breaks
❌ WRONG:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
  IkpXVCJ9...

✅ RIGHT:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Issue 3: "row-level security policy violation"
```
Error: new row violates row-level security policy
```

**Fix:**
```bash
# You're using ANON key instead of SERVICE_ROLE key
❌ WRONG: Using NEXT_PUBLIC_SUPABASE_ANON_KEY for server operations
✅ RIGHT: Using SUPABASE_SERVICE_ROLE_KEY for server operations

# Check in your code:
import { supabase } from '@/lib/supabaseClient'  // ❌ Uses anon key
import { supabaseAdmin } from '@/lib/supabaseAdmin'  // ✅ Uses service key
```

---

### Issue 4: "Invalid login" (Email)
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Fix:**
```bash
# You're using regular Gmail password instead of App Password
❌ WRONG: SMTP_PASS=MyGmailPassword123
✅ RIGHT: SMTP_PASS=abcd efgh ijkl mnop  # 16-char App Password

# How to get App Password:
# 1. Enable 2FA on Gmail
# 2. Google Account → Security → App Passwords
# 3. Generate new password
# 4. Use that 16-character code
```

---

### Issue 5: "Connection timeout" (Email)
```
Error: Connection timeout
```

**Fix:**
```bash
# Wrong port or secure setting
❌ WRONG:
SMTP_PORT=465
SMTP_SECURE=false

✅ RIGHT (Option 1):
SMTP_PORT=587
SMTP_SECURE=false

✅ RIGHT (Option 2):
SMTP_PORT=465
SMTP_SECURE=true
```

---

## 📊 Environment Variables Summary

### Local Development (.env.local)
```bash
# 5 CRITICAL variables:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Different from anon!
JWT_SECRET=32+ character random string
SMTP_PASS=16-character App Password

# 6 Standard variables:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@jecrcu.edu.in
SMTP_FROM=JECRC No Dues <noreply.nodues@jecrcu.edu.in>
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# 3 Optional variables:
EMAIL_QUEUE_BATCH_SIZE=50
EMAIL_MAX_RETRIES=3
CRON_SECRET=random-secret
```

### Production (Render)
```bash
# All of the above PLUS:
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://no-duessystem.onrender.com
```

---

## ✅ Final Verification Checklist

```
□ Supabase URL includes https://
□ Anon key starts with eyJ...
□ Service role key is DIFFERENT from anon key
□ JWT secret is at least 32 characters
□ SMTP_USER uses @jecrcu.edu.in domain
□ SMTP_PASS is 16-character App Password (not regular password)
□ Gmail 2FA is enabled
□ SMTP_PORT is 587 or 465
□ SMTP_SECURE matches port (false for 587, true for 465)
□ No trailing spaces in any values
□ All variables present in production (Render)
□ Test scripts pass (test-supabase.js, test-email.js)
```

---

## 🚀 Next Steps

After verifying all environment variables:

1. **Clear Render build cache:**
   - Render Dashboard → Manual Deploy → Clear build cache & deploy

2. **Test production:**
   ```bash
   curl https://no-duessystem.onrender.com/api/upload
   ```

3. **Run automated tests:**
   ```bash
   TEST_URL=https://no-duessystem.onrender.com npx playwright test
   ```

---

## 📞 Still Having Issues?

If environment variables are correct but system still fails:

1. **Check browser console** for detailed error messages
2. **Check Render logs** for server-side errors
3. **Verify RLS policies** in Supabase
4. **Test API routes individually** with curl
5. **Review uploaded code changes** (Zod migration, upload route)

---

**Your .env.example is correct!** ✅

Just need to:
1. Copy values to `.env.local` (local) and Render (production)
2. Use actual keys (not placeholders)
3. Get Gmail App Password for SMTP_PASS
4. Run test scripts to verify
