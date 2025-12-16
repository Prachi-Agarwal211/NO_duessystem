# 🔑 How to Get Supabase Credentials

## Quick Guide: Finding Your Supabase URL and Keys

When running `node scripts/setup-supabase.js` or `node scripts/test-deployment.js`, you'll be asked for these credentials:

---

## Step 1: Go to Your Supabase Project

1. Open [supabase.com](https://supabase.com)
2. Click **"Sign In"**
3. Select your project (e.g., "jecrc-no-dues-system")

---

## Step 2: Navigate to API Settings

1. In the left sidebar, click **"Settings"** (gear icon at bottom)
2. Click **"API"** in the Settings menu

---

## Step 3: Copy Your Credentials

You'll see this page with all your credentials:

### 📍 **Project URL** (Supabase URL)

```
Location: API Settings → Project URL
Format: https://xxxxxxxxxxxxx.supabase.co
```

**Example:**
```
https://abcdefghijklmnop.supabase.co
```

**Copy this entire URL including `https://`**

---

### 🔓 **Anon Key** (Public Key - Safe to Share)

```
Location: API Settings → Project API keys → anon public
Format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**This is a LONG string (200+ characters)**

**Use for:** Frontend, testing scripts

---

### 🔐 **Service Role Key** (Secret - NEVER SHARE)

```
Location: API Settings → Project API keys → service_role secret
Format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**This is also a LONG string (200+ characters)**

**⚠️ WARNING:** This key has **full admin access** to your database. Never commit it to Git or share it publicly!

**Use for:** Backend operations, setup scripts

---

## Visual Guide

Here's exactly where to find them:

```
Supabase Dashboard
└── Settings (⚙️)
    └── API
        ├── Project URL
        │   └── https://your-project.supabase.co  ← Copy this
        │
        └── Project API keys
            ├── anon public
            │   └── eyJhbG...  ← Copy this for frontend/tests
            │
            └── service_role secret  ⚠️
                └── eyJhbG...  ← Copy this for setup script
```

---

## For Setup Script (`setup-supabase.js`)

When you run:
```bash
node scripts/setup-supabase.js
```

You'll see:
```
Enter your Supabase URL: 
```
**Paste:** `https://your-project.supabase.co`

```
Enter your Supabase Service Role Key: 
```
**Paste:** `eyJhbGciOiJIUzI1NiIs...` (the long service_role key)

---

## For Test Script (`test-deployment.js`)

When you run:
```bash
node scripts/test-deployment.js
```

You'll see:
```
Enter your Supabase URL: 
```
**Paste:** `https://your-project.supabase.co`

```
Enter your Supabase Anon Key: 
```
**Paste:** `eyJhbGciOiJIUzI1NiIs...` (the long anon public key)

```
Enter your App URL: 
```
**Paste:** `https://your-app.onrender.com` (your Render deployment URL)

---

## Security Best Practices

### ✅ DO:
- Store Service Role Key in environment variables
- Add to `.env.local` for local development
- Add to Render environment variables for production
- Keep it secret and secure

### ❌ DON'T:
- Commit Service Role Key to Git
- Share it in Discord/Slack/Email
- Hardcode it in your source code
- Use it in frontend code

---

## Environment Variables Setup

### For Local Development:

Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### For Render Deployment:

Go to Render Dashboard → Your Service → Environment

Add these variables:
```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY = your_service_role_key_here
```

---

## Troubleshooting

### "Invalid API key" Error

**Problem:** Key is incorrect or incomplete

**Solution:**
1. Go back to Supabase Dashboard → Settings → API
2. Copy the ENTIRE key (it's very long, ~200+ characters)
3. Make sure you copied from start to end
4. Try again

### "Project not found" Error

**Problem:** URL is incorrect

**Solution:**
1. Verify URL includes `https://`
2. Check there are no extra spaces
3. Format should be: `https://xxxxxxxxxxxxx.supabase.co`

### "Forbidden" Error

**Problem:** Using anon key instead of service_role key

**Solution:**
- Setup script needs **service_role** key (the secret one)
- Test script can use **anon** key (the public one)
- Check which key you're using

---

## Quick Reference Card

Copy this for easy access:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUPABASE CREDENTIALS QUICK REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Project URL:
   https://_____________________.supabase.co

🔓 Anon Key (public):
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9._________

🔐 Service Role Key (secret - DO NOT SHARE):
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9._________

📍 Location:
   Supabase Dashboard → Settings → API

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## That's It!

Now you know exactly where to find your credentials for the automation scripts.

**Next Step:** Run the setup script:
```bash
node scripts/setup-supabase.js