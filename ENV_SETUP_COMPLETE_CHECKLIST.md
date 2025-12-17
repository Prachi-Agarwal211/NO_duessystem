# Environment Setup Complete Checklist ✅

## 🎯 Your Credentials (Already Added)

I've created `.env.local` with your credentials:

```bash
✅ NEXT_PUBLIC_SUPABASE_URL=https://ycvorjengbxcikqcwjnv.supabase.co
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (your anon key)
✅ JWT_SECRET=dab703f47fc04382d7559b03f2abebfc054d0ad09943c1eb9eab95266e90fd13
```

---

## ⚠️ CRITICAL: 2 Missing Values

You need to add these manually to `.env.local`:

### 1. SUPABASE_SERVICE_ROLE_KEY (CRITICAL!)

**Where to find:**
1. Go to: https://supabase.com/dashboard/project/ycvorjengbxcikqcwjnv/settings/api
2. Scroll down to "Project API keys"
3. Find **"service_role"** (secret) - it's LONGER than anon key
4. Click "Reveal" and copy

**Open `.env.local` and replace:**
```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**With the actual service_role key (starts with `eyJhbGc...` but DIFFERENT from anon key)**

---

### 2. Gmail App Password (For Emails)

**Steps to get:**
1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification** (if not already)
3. Go to: https://myaccount.google.com/apppasswords
4. Select:
   - App: "Mail"
   - Device: "Other" → Type "JECRC No Dues System"
5. Click "Generate"
6. Copy the 16-character password (format: `abcd efgh ijkl mnop`)

**Open `.env.local` and update:**
```bash
SMTP_USER=your-email@jecrcu.edu.in
SMTP_PASS=abcd-efgh-ijkl-mnop  # Your 16-char App Password
```

---

## 🚀 After Adding Both Keys

### Step 1: Verify Environment
```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

**Expected:** Server starts at http://localhost:3000

---

### Step 2: Test Supabase Connection

Create `test-connection.js`:
```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase Connection...\n');
console.log('URL:', url);
console.log('Anon Key:', anonKey ? '✅ Present' : '❌ Missing');
console.log('Service Key:', serviceKey && serviceKey !== 'your-service-role-key-here' ? '✅ Present' : '❌ Missing or not set');

if (!serviceKey || serviceKey === 'your-service-role-key-here') {
  console.log('\n⚠️  SERVICE_ROLE_KEY not set!');
  console.log('Go to: https://supabase.com/dashboard/project/ycvorjengbxcikqcwjnv/settings/api');
  console.log('Copy the "service_role" key and update .env.local');
  process.exit(1);
}

const publicClient = createClient(url, anonKey);
const adminClient = createClient(url, serviceKey);

async function test() {
  try {
    console.log('\n1. Testing PUBLIC client...');
    const { data, error } = await publicClient.from('profiles').select('count');
    if (error) {
      console.log('   ❌ Error:', error.message);
    } else {
      console.log('   ✅ PUBLIC client works!');
    }

    console.log('\n2. Testing ADMIN client...');
    const { data: data2, error: error2 } = await adminClient.from('profiles').select('count');
    if (error2) {
      console.log('   ❌ Error:', error2.message);
    } else {
      console.log('   ✅ ADMIN client works!');
    }

    console.log('\n3. Testing STORAGE access...');
    const { data: data3, error: error3 } = await adminClient.storage.from('no-dues-files').list('', { limit: 1 });
    if (error3) {
      console.log('   ❌ Error:', error3.message);
    } else {
      console.log('   ✅ STORAGE access works!');
    }

    console.log('\n✅ All connections successful!\n');
  } catch (err) {
    console.log('\n❌ Test failed:', err.message);
  }
}

test();
```

**Run test:**
```bash
node test-connection.js
```

**Expected Output:**
```
Testing Supabase Connection...

URL: https://ycvorjengbxcikqcwjnv.supabase.co
Anon Key: ✅ Present
Service Key: ✅ Present

1. Testing PUBLIC client...
   ✅ PUBLIC client works!

2. Testing ADMIN client...
   ✅ ADMIN client works!

3. Testing STORAGE access...
   ✅ STORAGE access works!

✅ All connections successful!
```

---

### Step 3: Test Application

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser:**
   ```
   http://localhost:3000
   ```

3. **Test workflows:**
   - Submit a form
   - Upload a file (manual entry)
   - Check status

---

## 📋 Environment Status

| Variable | Status | Value |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Set | https://ycvorjengbxcikqcwjnv.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Set | eyJhbGc... (your key) |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ **YOU NEED TO ADD** | Get from Supabase dashboard |
| `JWT_SECRET` | ✅ Set | dab703f4... |
| `SMTP_USER` | ⚠️ **YOU NEED TO ADD** | your-email@jecrcu.edu.in |
| `SMTP_PASS` | ⚠️ **YOU NEED TO ADD** | Gmail App Password |
| `SMTP_HOST` | ✅ Set | smtp.gmail.com |
| `SMTP_PORT` | ✅ Set | 587 |
| `NEXT_PUBLIC_BASE_URL` | ✅ Set | http://localhost:3000 |

---

## 🎯 Quick Action Items

```bash
# 1. Get SERVICE_ROLE_KEY
□ Go to: https://supabase.com/dashboard/project/ycvorjengbxcikqcwjnv/settings/api
□ Copy "service_role" key
□ Paste in .env.local → SUPABASE_SERVICE_ROLE_KEY

# 2. Get Gmail App Password
□ Go to: https://myaccount.google.com/apppasswords
□ Generate for "JECRC No Dues System"
□ Copy 16-character password
□ Paste in .env.local → SMTP_PASS
□ Update SMTP_USER with your actual email

# 3. Test
□ Run: node test-connection.js
□ Run: npm run dev
□ Open: http://localhost:3000

# 4. Run Automated Tests
□ npm install --save-dev @playwright/test
□ npx playwright install
□ npx playwright test --ui
```

---

## 🔗 Direct Links

- **Supabase API Settings:** https://supabase.com/dashboard/project/ycvorjengbxcikqcwjnv/settings/api
- **Gmail App Passwords:** https://myaccount.google.com/apppasswords
- **Your Supabase Project:** https://supabase.com/dashboard/project/ycvorjengbxcikqcwjnv

---

## ⚠️ Common Issues

### Issue: "Invalid JWT"
**Fix:** SERVICE_ROLE_KEY is wrong or missing. Get from Supabase dashboard.

### Issue: "RLS policy violation"
**Fix:** Using anon key instead of service_role key. Check SUPABASE_SERVICE_ROLE_KEY is set.

### Issue: "Invalid login" (email)
**Fix:** Using regular password instead of App Password. Generate Gmail App Password.

### Issue: "Connection timeout" (email)
**Fix:** Gmail blocked sign-in attempt. Check SMTP settings and App Password.

---

## ✅ Final Checklist

After adding SERVICE_ROLE_KEY and SMTP credentials:

```bash
□ .env.local exists
□ All 3 Supabase keys set (URL, anon, service_role)
□ JWT_SECRET set
□ SMTP credentials set (user, pass)
□ test-connection.js passes
□ npm run dev starts successfully
□ Can access http://localhost:3000
□ Can submit forms
□ Can upload files
□ Emails send (test with support ticket)
```

---

## 🚀 Ready to Test!

Once you've added the 2 missing values:
1. SERVICE_ROLE_KEY
2. SMTP credentials

Run:
```bash
npm run dev
```

Then run automated tests:
```bash
npx playwright test --ui
```

**Everything else is already configured!** 🎉