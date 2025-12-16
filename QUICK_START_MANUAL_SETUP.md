# 🚀 Quick Start - Manual Supabase Setup (5 Minutes)

## ⚠️ Important: The Setup Script Created Your Buckets!

✅ **Good news:** The script successfully created all 3 storage buckets:
- `no-dues-files` (100KB limit)
- `alumni-screenshots` (100KB limit) 
- `certificates` (200KB limit)

Now you just need to run the SQL file manually.

---

## Step 1: Go to Supabase SQL Editor

1. Open [supabase.com](https://supabase.com)
2. Select your project: `ycvorjengbxcikqcwjnv`
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"** button

---

## Step 2: Copy & Paste SQL File

1. Open `ULTIMATE_DATABASE_SETUP.sql` in your project
2. **Select ALL content** (Ctrl+A / Cmd+A)
3. **Copy** (Ctrl+C / Cmd+C)
4. **Paste** into Supabase SQL Editor (Ctrl+V / Cmd+V)

---

## Step 3: Run the SQL

1. Click the **"Run"** button (bottom right, green button)
2. Wait ~30-60 seconds
3. You should see success messages

### ✅ Expected Output:

```
╔═══════════════════════════════════════════════════════════════╗
║  JECRC NO DUES SYSTEM - ULTIMATE DATABASE SETUP COMPLETE     ║
╚═══════════════════════════════════════════════════════════════╝

✅ Database Statistics:
   - Schools: 13
   - Courses: ~50
   - Branches: 139
   - Departments: 10
   - Tables Created: 17
   - Indexes Created: 40+

🚀 System Ready for 1000+ Concurrent Users!
```

---

## Step 4: Create Admin Account

### A. Create User in Supabase Auth

1. Go to **Authentication → Users** (left sidebar)
2. Click **"Add User"** (green button, top right)
3. Fill in:
   ```
   Email: admin@jecrcu.edu.in
   Password: [Create a strong password]
   Auto Confirm User: ✓ (check this box)
   ```
4. Click **"Create User"**
5. **COPY the User ID** (the UUID shown in the user list)

### B. Link to Profiles Table

1. Go back to **SQL Editor**
2. Run this query (replace `YOUR_USER_ID` with the UUID you copied):

```sql
INSERT INTO profiles (id, email, full_name, role, is_active)
VALUES (
  'YOUR_USER_ID',  -- ← Paste the UUID here
  'admin@jecrcu.edu.in',
  'System Administrator',
  'admin',
  true
);
```

3. Click **"Run"**

---

## Step 5: Verify Setup

Run these verification queries one by one in SQL Editor:

```sql
-- Should return 10
SELECT COUNT(*) FROM departments;

-- Should return 13
SELECT COUNT(*) FROM config_schools;

-- Should return 139+
SELECT COUNT(*) FROM config_branches;

-- Should return 1 (your admin account)
SELECT * FROM profiles WHERE role = 'admin';
```

### ✅ All Correct? You're Done!

---

## Step 6: Deploy to Render

### A. Add Environment Variables in Render

Go to your Render service → Environment tab, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://ycvorjengbxcikqcwjnv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljdm9yamVuZ2J4Y2lrcWN3am52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTgwMjAsImV4cCI6MjA4MTQ3NDAyMH0.dw6kp59TM8jcQ9u9u5Pk0cSWoJwTMgJN2RBOhPTNXQo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljdm9yamVuZ2J4Y2lrcWN3am52Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg5ODAyMCwiZXhwIjoyMDgxNDc0MDIwfQ.HCgChuNG4mI0_ot91xu3E21ARJIQFh2bzSNF8viY6_M
NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
NODE_ENV=production
```

### B. Deploy

```bash
git add .
git commit -m "Database setup complete"
git push origin main
```

Render will auto-deploy (takes ~10 minutes)

---

## Step 7: Test Everything

Once Render deployment completes:

1. Visit your app URL
2. Go to `/staff/login`
3. Login with:
   - Email: `admin@jecrcu.edu.in`
   - Password: [the one you set]
4. You should see the admin dashboard!

---

## 🎉 That's It!

Your system is now fully deployed and ready to use.

**Total Time:** ~5 minutes for manual setup + 10 minutes for Render deployment

---

## 🆘 Troubleshooting

### "Table already exists" Error

**Solution:** This is fine if you're re-running the SQL. The SQL file drops all tables first, so just run it again.

### "Cannot find admin@jecrcu.edu.in"

**Solution:** 
1. Make sure you created the user in Supabase Auth first
2. Verify you copied the correct User ID
3. Check the profiles table: `SELECT * FROM profiles;`

### "Login doesn't work"

**Solution:**
1. Verify admin user exists: `SELECT * FROM profiles WHERE email = 'admin@jecrcu.edu.in';`
2. Make sure `is_active = true` and `role = 'admin'`
3. Try resetting password in Supabase Dashboard → Authentication → Users

### "Render build fails"

**Solution:**
1. Check environment variables are set correctly
2. Make sure you pushed the latest code
3. Check Render logs for specific error

---

## Optional: Enable Connection Pooling (Performance)

Go to Supabase Dashboard → Settings → Database → Connection Pooling:

```
Mode: Transaction
Pool Size: 15
Connection Timeout: 15 seconds
```

Click **"Save"**

This makes the dashboard load faster!

---

**Everything should work now!** 🚀