# How to Fix Old/Deleted Student Data Still Appearing

## 🔍 Problem
You deleted student data but it still appears when checking status for registration number like `21BCON750`.

## 🎯 Root Causes

### 1. **Database Records Not Fully Deleted**
The most common issue - cascading deletes might not have worked properly.

### 2. **Browser/API Cache**
Your browser or API might be serving cached responses.

### 3. **Multiple Data Sources**
Data might exist in multiple tables (no_dues_forms, manual_entries, etc.)

---

## ✅ Solution Steps

### Step 1: Check Database
Run [`CLEANUP_OLD_STUDENT_DATA.sql`](CLEANUP_OLD_STUDENT_DATA.sql) in Supabase SQL Editor

```sql
-- First, check if data exists
SELECT * FROM no_dues_forms WHERE registration_no = '21BCON750';
SELECT * FROM manual_entries WHERE registration_no = '21BCON750';
```

**Expected Result**: Should return 0 rows if truly deleted

**If data exists**: Proceed to Step 2

### Step 2: Delete Specific Student

```sql
-- Delete statuses first (due to foreign key constraint)
DELETE FROM no_dues_status
WHERE form_id IN (
    SELECT id FROM no_dues_forms WHERE registration_no = '21BCON750'
);

-- Then delete the form
DELETE FROM no_dues_forms WHERE registration_no = '21BCON750';

-- Also check manual entries
DELETE FROM manual_entries WHERE registration_no = '21BCON750';
```

### Step 3: Clear Application Cache

#### Option A: Hard Refresh Browser
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

#### Option B: Clear Next.js Cache (if deployed)
```bash
# In Vercel dashboard:
# Deployments → Your latest deployment → ... menu → Redeploy
```

#### Option C: Local Development
```bash
# Stop your dev server (Ctrl+C)
rm -rf .next
npm run dev
```

### Step 4: Verify API Response

Open browser console and check:

```javascript
// In browser console
fetch('/api/student/check-status?registration_no=21BCON750')
  .then(r => r.json())
  .then(console.log)

// Expected: { found: false, error: "Application not found" }
// If you get data: Database still has records
```

### Step 5: Check for Orphaned Records

```sql
-- Find status records without matching forms
SELECT ns.*
FROM no_dues_status ns
LEFT JOIN no_dues_forms ndf ON ns.form_id = ndf.id
WHERE ndf.id IS NULL;

-- Clean up orphaned records
DELETE FROM no_dues_status
WHERE form_id NOT IN (SELECT id FROM no_dues_forms);
```

---

## 🧹 Complete Database Reset (Nuclear Option)

**⚠️ WARNING: This deletes ALL student applications**

Only use if you want to start fresh:

```sql
-- Delete all data
DELETE FROM no_dues_status;
DELETE FROM no_dues_forms;
DELETE FROM manual_entries;

-- Reset auto-increment IDs (optional)
ALTER SEQUENCE no_dues_forms_id_seq RESTART WITH 1;
ALTER SEQUENCE no_dues_status_id_seq RESTART WITH 1;
```

---

## 🔧 Prevent This Issue

### Add Cascade Delete (if not already present)

```sql
-- Check current foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'no_dues_status';

-- If delete_rule is not CASCADE, update it:
ALTER TABLE no_dues_status
DROP CONSTRAINT no_dues_status_form_id_fkey,
ADD CONSTRAINT no_dues_status_form_id_fkey
    FOREIGN KEY (form_id)
    REFERENCES no_dues_forms(id)
    ON DELETE CASCADE;
```

---

## 📊 Verification Checklist

After cleanup, verify:

- [ ] Database query returns 0 rows for deleted student
- [ ] Check status page shows "No Application Found"
- [ ] Staff dashboard doesn't show the student
- [ ] Admin dashboard doesn't show the student
- [ ] API response returns 404 for deleted registration number
- [ ] No orphaned status records exist

---

## 🐛 Still Seeing Old Data?

### Check These:

1. **Wrong Registration Number Format**
   - System converts to uppercase: `21bcon750` → `21BCON750`
   - Check exact format in database

2. **Multiple Submissions**
   - Student might have submitted multiple times
   - Check: `SELECT * FROM no_dues_forms WHERE student_name LIKE '%Shubhangi%'`

3. **Different Table**
   - Check manual_entries table separately
   - Check convocation_registrations if you have that

4. **Supabase Realtime Cache**
   - Realtime subscriptions might cache data
   - Restart your application

5. **Service Worker Cache** (if you have PWA)
   - Clear in browser: Chrome → DevTools → Application → Service Workers → Unregister
   - Or: Settings → Clear browsing data → Cached images and files

---

## 💡 Quick Debug Script

Run this to find where the data is:

```sql
-- Find all instances of registration number across tables
SELECT 'no_dues_forms' as source, id, registration_no, student_name, status, created_at
FROM no_dues_forms
WHERE registration_no ILIKE '%21BCON750%'

UNION ALL

SELECT 'manual_entries' as source, id::text, registration_no, student_name, status::text, created_at
FROM manual_entries
WHERE registration_no ILIKE '%21BCON750%'

ORDER BY created_at DESC;
```

---

## 📞 Need More Help?

If data persists after all these steps:

1. Check Supabase logs for the API call
2. Verify Row Level Security (RLS) policies aren't showing soft-deleted data
3. Check if you have a `deleted_at` column (soft delete) instead of hard delete
4. Export the problematic row and check all columns for unexpected data

---

## ✅ Expected Final State

After proper cleanup:

```bash
# API Response
{
  "found": false,
  "error": "Application not found"
}

# Database Query
SELECT COUNT(*) FROM no_dues_forms WHERE registration_no = '21BCON750';
-- Result: 0

# Check Status Page
"No Application Found" message should appear
```

---

## 🎯 Summary

**Most likely cause**: Database records still exist

**Quick fix**: 
1. Run the SQL delete commands in Step 2
2. Hard refresh browser (Ctrl+Shift+R)
3. Verify with API check

**Prevention**: Add CASCADE DELETE constraints to foreign keys