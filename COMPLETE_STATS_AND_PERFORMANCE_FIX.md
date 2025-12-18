# Complete Stats & Performance Fix Guide

## Problems Identified

### 1. ❌ Student Form Submission Failing (500 Error)
**Error:** `record "new" has no field "is_manual_entry"`
**Cause:** Database trigger still references the deleted `is_manual_entry` column
**Impact:** Students cannot submit new no-dues applications

### 2. ❌ Stats Showing Zero Despite Approvals
**Symptoms:** Department dashboard shows `Approved: 0` even after approving applications
**Possible Causes:**
- `action_by_user_id` not populated in old approval records
- `assigned_department_ids` is NULL or empty for librarian account
- Frontend caching old response
- Stats API query logic error

### 3. ⚠️ Slow Dashboard Loading
**Symptoms:** Department and admin dashboards take too long to load
**Causes:**
- Admin dashboard uses 30-second cache (good for performance but blocks real-time updates)
- N+1 query problems
- Large dataset fetches without pagination optimization

---

## Solution: Three-Step Fix

### Step 1: Fix Database Triggers (CRITICAL - DO THIS FIRST)

Run this SQL to fix the form submission error:

```sql
-- File: COMPLETE_PRODUCTION_FIX.sql
-- This removes the broken trigger and creates clean ones
```

**What it does:**
- Drops ALL triggers on `no_dues_forms` table
- Recreates 3 essential triggers WITHOUT `is_manual_entry` references:
  1. `after_form_insert_create_statuses` - Creates 7 department status rows
  2. `after_status_update` - Updates form status when all departments approve
  3. `before_form_update` - Updates timestamps

**Verification:**
```sql
-- Should show 3 triggers after running the fix
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'no_dues_forms';
```

---

### Step 2: Diagnose Stats Issue

Run this diagnostic SQL to identify why stats show zero:

```sql
-- File: DIAGNOSE_ZERO_STATS_ISSUE.sql
-- This runs 9 checks to pinpoint the exact problem
```

**What to look for in results:**

#### Check #1: Librarian Account
```
✅ GOOD: email = '15anuragsingh2003@gmail.com' exists
❌ BAD: assigned_department_ids is NULL or empty array
```

#### Check #3: Authorization
```
✅ GOOD: "Library ID is in assigned list"
❌ BAD: "Library ID is NOT in assigned list"
```

#### Check #5: Librarian Actions Count
```
✅ GOOD: approved_count > 0
❌ BAD: approved_count = 0 (means no approvals in database)
```

#### Check #9: NULL Check
```
❌ PROBLEM: "NULL - THIS IS THE PROBLEM!"
❌ PROBLEM: "EMPTY ARRAY - THIS IS THE PROBLEM!"
✅ GOOD: "Has assigned departments"
```

---

### Step 3: Apply the Appropriate Fix Based on Diagnostic Results

#### Fix A: If `assigned_department_ids` is NULL or Empty

**Problem:** Librarian account doesn't have library department UUID assigned

**Solution:**
```sql
-- Get the library department UUID
SELECT id FROM departments WHERE name = 'library';
-- Result: e.g., '397c48e1-f242-4612-b0ec-fdb2e386d2d3'

-- Update librarian profile with correct UUID
UPDATE profiles
SET assigned_department_ids = ARRAY['397c48e1-f242-4612-b0ec-fdb2e386d2d3']::uuid[]
WHERE email = '15anuragsingh2003@gmail.com';

-- Verify the fix
SELECT 
    email, 
    assigned_department_ids,
    (SELECT name FROM departments WHERE id = ANY(assigned_department_ids)) as has_library
FROM profiles
WHERE email = '15anuragsingh2003@gmail.com';
```

#### Fix B: If Approved Count is Zero

**Problem:** The approval action didn't get recorded with `action_by_user_id`

**Solution:** You need to approve an application again (the previous approval might have failed silently)

1. Log in as librarian: `15anuragsingh2003@gmail.com`
2. Go to dashboard
3. Click "Approve" on a pending application
4. Verify in database:
```sql
SELECT 
    s.department_name,
    s.status,
    s.action_by_user_id,
    p.full_name
FROM no_dues_status s
JOIN profiles p ON p.id = s.action_by_user_id
WHERE s.department_name = 'library'
AND s.status = 'approved';
```

#### Fix C: If Frontend is Caching

**Problem:** Browser or Next.js is serving cached stats response

**Solutions:**

1. **Clear Browser Cache:**
   - Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac) to hard refresh
   - Or open DevTools → Network tab → Check "Disable cache"

2. **Clear Admin Dashboard Cache (if admin):**
```bash
# Call the cache invalidation endpoint
curl -X DELETE https://your-domain.vercel.app/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Redeploy Frontend:**
   - Push any change to trigger Vercel rebuild
   - This clears all server-side Next.js caches

---

## Performance Optimization (Separate from Zero Stats Issue)

### Admin Dashboard Cache

**Current behavior:** 30-second cache on admin dashboard (line 27-28 in `src/app/api/admin/dashboard/route.js`)

**Trade-off:**
- ✅ Faster load times (returns cached data within 30 seconds)
- ❌ Real-time updates delayed by up to 30 seconds

**To disable cache (for real-time updates):**

```javascript
// In src/app/api/admin/dashboard/route.js
// Comment out or remove these lines:
// const dashboardCache = new Map();
// const CACHE_TTL = 30000;

// And remove the cache check/set logic in the GET function
```

### Staff Dashboard Optimization

**Current:** Already optimized with:
- Parallel queries (Promise.all)
- Pagination
- No caching (real-time updates)
- Optional stats inclusion (`includeStats=true`)

**No changes needed** - staff dashboard is already performant.

---

## Verification Steps

### 1. Test Form Submission
```bash
# Try submitting a new form via student portal
# Should succeed without "is_manual_entry" error
```

### 2. Test Stats Update
```bash
# 1. Approve an application as librarian
# 2. Refresh dashboard (Ctrl+Shift+R)
# 3. Check stats cards - should show Approved: 1

# Or query database directly:
SELECT 
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
    COUNT(*) FILTER (WHERE status = 'pending') as pending
FROM no_dues_status
WHERE department_name = 'library'
AND action_by_user_id = (
    SELECT id FROM profiles WHERE email = '15anuragsingh2003@gmail.com'
);
```

### 3. Test Dashboard Performance
```bash
# Check network tab in DevTools
# Admin dashboard first load: Should be < 2 seconds
# Admin dashboard cached load: Should be < 100ms
# Staff dashboard: Should be < 1 second
```

---

## Expected Results After All Fixes

1. ✅ Students can submit new applications without errors
2. ✅ Stats cards show accurate real-time numbers:
   - Pending: X (applications waiting for approval)
   - Approved: Y (applications YOU approved)
   - Rejected: Z (applications YOU rejected)
   - Total: Y + Z (your total actions)
3. ✅ Librarian can approve/reject applications
4. ✅ Dashboard loads quickly (< 2 seconds)
5. ✅ Stats update in real-time (or within 30 seconds for admin due to cache)

---

## Rollback Plan (If Something Breaks)

### Revert Trigger Changes
```sql
-- Restore from backup (if you took one)
-- Or manually recreate triggers from your previous working schema
```

### Revert Profile Changes
```sql
-- Reset assigned_department_ids to original value
UPDATE profiles
SET assigned_department_ids = NULL -- or original value
WHERE email = '15anuragsingh2003@gmail.com';
```

---

## Summary

**Root Causes:**
1. Database trigger referencing deleted column → Form submission fails
2. Missing `assigned_department_ids` → Authorization fails
3. Missing `action_by_user_id` values → Stats show zero
4. Frontend caching → Stats don't update immediately

**Fix Priority:**
1. **URGENT:** Run `COMPLETE_PRODUCTION_FIX.sql` (fixes form submission)
2. **HIGH:** Run `DIAGNOSE_ZERO_STATS_ISSUE.sql` (identifies stats problem)
3. **HIGH:** Apply Fix A or B based on diagnostic results
4. **MEDIUM:** Clear caches if needed (Fix C)
5. **LOW:** Adjust admin cache TTL if real-time updates required

**Time to Fix:** 5-10 minutes total