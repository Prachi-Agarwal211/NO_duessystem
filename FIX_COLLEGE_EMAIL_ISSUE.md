# 🔧 Fix College Email Domain Issue - Complete Guide

## Problem
You're seeing error: **"College email must end with jecrc.ac.in"**  
You want it to say: **"College email must end with jecrcu.edu.in"**

---

## ⚡ QUICK FIX (1 Minute)

### Step 1: Open Supabase SQL Editor
1. Go to [https://supabase.com](https://supabase.com)
2. Open your project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New query"**

### Step 2: Run the Fix Script
Copy and paste **ONE** of these scripts:

#### Option A: Quick Fix (Just fixes email domain)
```bash
Run: scripts/fix-college-email-domain.sql
```

#### Option B: Complete Fix (Fixes everything + email domain) ⭐ RECOMMENDED
```bash
Run: scripts/ONE_CLICK_FIX_ALL_ISSUES.sql
```

### Step 3: Clear Browser Cache
```
Press: Ctrl + Shift + R (Windows/Linux)
   Or: Cmd + Shift + R (Mac)
```

### Step 4: Test
1. Go to student form: `http://localhost:3000/student/submit-form`
2. Try entering email: `test@jecrcu.edu.in`
3. Should work now! ✅

---

## 📊 What Each Script Does

### `fix-college-email-domain.sql`
- Creates `config_emails` table if missing
- Updates domain to `jecrcu.edu.in`
- Sets up basic email configurations
- Enables RLS policies
- **Time:** ~10 seconds

### `ONE_CLICK_FIX_ALL_ISSUES.sql` ⭐ RECOMMENDED
- Everything from above PLUS:
- Creates all config tables if missing
- Updates validation rules
- Adds country codes
- Creates indexes
- Comprehensive error handling
- **Time:** ~15 seconds

### `FINAL_COMPLETE_DATABASE_SETUP.sql`
- COMPLETE database reset and setup
- All 13 schools, 40+ courses, 200+ branches
- All 11 departments
- All triggers and functions
- Everything for production
- **Time:** ~30 seconds
- **Warning:** Deletes ALL existing data

---

## 🔍 Why This Happened

### Root Cause
The college email domain is stored in the database:

```
Database Table: config_emails
Row: { key: 'college_domain', value: '???' }
```

Your database either has:
- ❌ Old value: `jecrc.ac.in`
- ❌ Table doesn't exist yet
- ✅ Should be: `jecrcu.edu.in`

### Data Flow
```
1. Database (config_emails table)
   ↓
2. API: /api/public/config
   ↓
3. Frontend: useFormConfig hook
   ↓
4. Validation: SubmitForm.jsx
```

If Step 1 has wrong data, everything downstream shows wrong domain.

---

## ✅ Verification Steps

### 1. Check Database
Run in Supabase SQL Editor:
```sql
SELECT key, value 
FROM public.config_emails 
WHERE key = 'college_domain';
```

**Expected Result:**
```
key              | value
----------------|----------------
college_domain  | jecrcu.edu.in
```

### 2. Check API Response
Open browser console, go to Network tab, filter for `config`, check response:
```json
{
  "success": true,
  "data": {
    "collegeDomain": "jecrcu.edu.in"  // ✅ Should be this
  }
}
```

### 3. Check Form Validation
In student form:
1. Enter email: `test@jecrc.ac.in` → Should show error ❌
2. Enter email: `test@jecrcu.edu.in` → Should work ✅

---

## 🚨 Troubleshooting

### Issue 1: Script Fails - "Table already exists"
**Solution:** Table exists but has old data. Run this:
```sql
UPDATE public.config_emails 
SET value = 'jecrcu.edu.in' 
WHERE key = 'college_domain';
```

### Issue 2: Still Shows Old Domain After Fix
**Cause:** Browser cache
**Solution:** 
1. Clear cache (Ctrl+Shift+R)
2. Or open in incognito/private window
3. Hard refresh multiple times

### Issue 3: API Returns null/undefined
**Cause:** RLS policies blocking access
**Solution:** Run `ONE_CLICK_FIX_ALL_ISSUES.sql` which fixes RLS

### Issue 4: "Permission denied for table config_emails"
**Cause:** Using wrong Supabase key
**Solution:** Make sure you're using `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

---

## 📁 All Files Created

| File | Purpose | When to Use |
|------|---------|-------------|
| `scripts/fix-college-email-domain.sql` | Quick domain fix only | You just need to change email domain |
| `scripts/ONE_CLICK_FIX_ALL_ISSUES.sql` | Fix domain + config tables | Recommended for most cases ⭐ |
| `FINAL_COMPLETE_DATABASE_SETUP.sql` | Complete database reset | Fresh start or production setup |
| `FIX_COLLEGE_EMAIL_ISSUE.md` | This guide | Understanding the issue |

---

## 🎯 Recommended Workflow

### For Development/Testing
```bash
1. Run: scripts/ONE_CLICK_FIX_ALL_ISSUES.sql
2. Clear browser cache
3. Test the form
4. Done! ✅
```

### For Production Setup
```bash
1. Run: FINAL_COMPLETE_DATABASE_SETUP.sql (complete setup)
2. Run: scripts/add-staff-scope.sql (HOD filtering)
3. Run: node scripts/create-specific-staff-accounts.js (staff accounts)
4. Clear browser cache
5. Test everything
6. Deploy! 🚀
```

---

## 🔐 Environment Variables Check

Make sure your `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ⚠️ IMPORTANT: Service role key
```

The service role key bypasses RLS policies and is required for API operations.

---

## 💡 Pro Tips

1. **Always clear browser cache** after database changes
2. **Use ONE_CLICK_FIX_ALL_ISSUES.sql** for quick fixes
3. **Use FINAL_COMPLETE_DATABASE_SETUP.sql** for fresh starts
4. **Check Supabase SQL Editor output** for error messages
5. **Verify in browser Network tab** that API returns correct domain

---

## 📞 Need Help?

If you're still stuck:
1. Check Supabase logs for errors
2. Check browser console for API errors
3. Verify `.env.local` has correct service role key
4. Try running `FINAL_COMPLETE_DATABASE_SETUP.sql` for complete reset

---

## ✅ Success Checklist

- [ ] Ran fix script in Supabase SQL Editor
- [ ] Saw success message in SQL output
- [ ] Cleared browser cache (Ctrl+Shift+R)
- [ ] Checked database has `jecrcu.edu.in`
- [ ] Tested form accepts `@jecrcu.edu.in` emails
- [ ] Tested form rejects `@jecrc.ac.in` emails

**All checked? You're done! 🎉**