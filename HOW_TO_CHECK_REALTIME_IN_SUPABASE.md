# How to Check if Realtime is Enabled in Supabase

## 🚀 Quick Check Methods

### Method 1: Use Our Verification Script (Recommended)
```bash
node scripts/verify-realtime-setup.js
```

This will automatically check:
- ✅ Tables exist
- ✅ Replica identity is FULL
- ✅ Tables are in publication
- ✅ Realtime subscription works

---

### Method 2: Check in Supabase Dashboard (Visual)

#### Step 1: Go to Database → Replication
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Database** → **Replication** (left sidebar)

#### Step 2: Check Publication
Look for the `supabase_realtime` publication. You should see:
- ✅ `public.no_dues_forms`
- ✅ `public.no_dues_status`

**Screenshot reference:**
```
Publications
└── supabase_realtime
    ├── public.no_dues_forms    ✓
    ├── public.no_dues_status   ✓
    └── ... (other tables)
```

If these tables are **NOT** in the list, realtime is **NOT** enabled!

---

### Method 3: Check via SQL Query

Run this in **SQL Editor**:

```sql
-- Check if tables are in publication
SELECT 
  tablename,
  pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('no_dues_forms', 'no_dues_status')
ORDER BY tablename;
```

**Expected Result:**
```
tablename         | pubname
------------------+------------------
no_dues_forms     | supabase_realtime
no_dues_status    | supabase_realtime
```

If you see 0 rows, realtime is **NOT** enabled!

---

### Method 4: Check Replica Identity

Run this in **SQL Editor**:

```sql
-- Check replica identity (must be FULL for realtime)
SELECT 
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname IN ('no_dues_forms', 'no_dues_status')
ORDER BY c.relname;
```

**Expected Result:**
```
table_name       | replica_identity
-----------------+-----------------
no_dues_forms    | full
no_dues_status   | full
```

If replica_identity is **NOT** "full", realtime won't work properly!

---

## 🔧 How to Enable Realtime (If Not Enabled)

### Option A: Run the Complete Database Setup
This includes realtime setup:
```sql
-- In Supabase SQL Editor, run:
-- FINAL_COMPLETE_DATABASE_SETUP.sql (lines 1229-1237)

ALTER PUBLICATION supabase_realtime ADD TABLE public.no_dues_forms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.no_dues_status;
ALTER TABLE public.no_dues_forms REPLICA IDENTITY FULL;
ALTER TABLE public.no_dues_status REPLICA IDENTITY FULL;
```

### Option B: Enable via Dashboard (Alternative)
1. Go to **Database** → **Replication**
2. Find `supabase_realtime` publication
3. Click **Edit**
4. Add tables:
   - `public.no_dues_forms`
   - `public.no_dues_status`
5. Click **Save**

---

## 🧪 Test Realtime is Working

### Test 1: Browser Console Test
1. Open your app in browser
2. Open DevTools Console (F12)
3. Run:
```javascript
// Subscribe to realtime
const channel = supabase
  .channel('test_channel')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'no_dues_forms' },
    (payload) => console.log('Realtime event received:', payload)
  )
  .subscribe((status) => console.log('Status:', status));

// Should log: Status: SUBSCRIBED
```

### Test 2: Submit a Form and Watch Dashboard
1. Submit a no dues form
2. Keep staff dashboard open
3. You should see the new form appear **without refreshing**!

If you need to refresh to see new data, realtime is **NOT** working.

---

## 🐛 Troubleshooting

### Issue 1: "Status: CHANNEL_ERROR"
**Cause:** Tables not in publication  
**Fix:** Run the SQL commands in Option A above

### Issue 2: "Status: TIMED_OUT"
**Cause:** Network/firewall blocking WebSocket connection  
**Fix:** Check if port 443 is open for WSS connections

### Issue 3: Subscription works but no events received
**Cause:** Replica identity not set to FULL  
**Fix:** Run:
```sql
ALTER TABLE public.no_dues_forms REPLICA IDENTITY FULL;
ALTER TABLE public.no_dues_status REPLICA IDENTITY FULL;
```

### Issue 4: "permission denied for publication"
**Cause:** Using anon key instead of service role key  
**Fix:** Realtime setup requires service role key (backend only)

---

## ✅ Verification Checklist

Use this checklist to confirm realtime is properly configured:

- [ ] **Tables in Publication**
  - Run: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`
  - Confirm `no_dues_forms` and `no_dues_status` are listed

- [ ] **Replica Identity is FULL**
  - Run the replica identity query above
  - Both tables should show "full"

- [ ] **Subscription Status is SUBSCRIBED**
  - Run browser console test
  - Should log: `Status: SUBSCRIBED`

- [ ] **Real-time Events Received**
  - Submit a form
  - Dashboard updates without refresh
  - Browser console shows event payload

- [ ] **Verification Script Passes**
  - Run: `node scripts/verify-realtime-setup.js`
  - All checks should pass (✅)

---

## 📝 What the Database Setup Script Does

The `FINAL_COMPLETE_DATABASE_SETUP.sql` includes these realtime commands (lines 1229-1237):

```sql
-- Enable realtime for forms and status tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.no_dues_forms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.no_dues_status;

-- Set replica identity for realtime updates
ALTER TABLE public.no_dues_forms REPLICA IDENTITY FULL;
ALTER TABLE public.no_dues_status REPLICA IDENTITY FULL;
```

**This is automatically included when you run the complete setup!**

---

## 🎯 Summary

**To check if realtime is enabled:**
1. **Quickest:** Run `node scripts/verify-realtime-setup.js`
2. **Visual:** Check Database → Replication in Supabase Dashboard
3. **Manual:** Run SQL queries to check publication and replica identity

**If realtime is NOT enabled:**
- Run the SQL commands from FINAL_COMPLETE_DATABASE_SETUP.sql (lines 1229-1237)
- OR run the complete database setup script

**To test realtime is working:**
- Submit a form and watch dashboard update without refresh
- OR run browser console test with subscription

---

## 📞 Need Help?

If realtime still doesn't work after following this guide:
1. Check Supabase project logs (Dashboard → Logs)
2. Verify your `.env.local` has correct credentials
3. Ensure you're using the correct Supabase project
4. Try recreating the publication from scratch