# 🔍 Frontend Stats Debugging Guide

## Problem
Stats cards showing 0 but "Today's Activity" shows correct data (1 approved).

## Diagnostic Steps

### Step 1: Check Browser Console

1. Open your staff dashboard
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Look for this log entry:

```
📊 Staff Dashboard Stats State:
```

### What to Look For:

**Scenario A: Stats is NULL**
```javascript
📊 Staff Dashboard Stats State: {
  statsExists: false,
  statsIsNull: true,  ← Problem here
  statsLoading: false,
  pending: undefined,
  approved: undefined
}
```
**Cause:** API not being called or returning null  
**Fix:** Check Network tab for /api/staff/stats or /api/staff/dashboard

---

**Scenario B: Stats EXISTS but fields are 0**
```javascript
📊 Staff Dashboard Stats State: {
  statsExists: true,
  statsIsNull: false,
  statsLoading: false,
  pending: 0,  ← All zeros
  approved: 0,
  rejected: 0,
  total: 0
}
```
**Cause:** Query returns empty or wrong user ID  
**Fix:** Run the SQL fixes (action_by_user_id mismatch)

---

**Scenario C: Stats has DIFFERENT field names**
```javascript
📊 Staff Dashboard Stats State: {
  statsExists: true,
  fullStats: {
    pendingCount: 6,  ← Wrong field name
    approvedCount: 1,
    totalActions: 1
  },
  pending: undefined  ← Expected field missing
}
```
**Cause:** API returns different field names than frontend expects  
**Fix:** Field name mismatch in API response

---

### Step 2: Check Network Tab

1. In DevTools, go to **Network** tab
2. Refresh page
3. Look for these requests:
   - `/api/staff/dashboard?userId=...&includeStats=true`
   - `/api/staff/stats`

4. Click on the request → **Response** tab
5. Check what `stats` object contains

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "applications": [...],
    "stats": {
      "pending": 6,
      "approved": 1,
      "rejected": 0,
      "total": 1,
      "department": "Central Library",
      "todayApproved": 1,
      "todayRejected": 0,
      "todayTotal": 1
    }
  }
}
```

---

### Step 3: Check for Errors

Look for any RED error messages in console like:
```
❌ Error fetching stats: ...
⚠️ No stats included in dashboard response
```

---

## Quick Fixes Based on Findings

### If stats is NULL:
```javascript
// The dashboard API might not be including stats
// Check line 113 in useStaffDashboard.js:
includeStats: 'true'  // Make sure this is present
```

### If stats has 0 values:
```bash
# Run the SQL fix
# Open Supabase SQL Editor
# Run: RUN_THIS_NOW_COMPLETE_FIX.sql
```

### If field names are wrong:
Check what the API actually returns vs what frontend expects:

**Frontend expects** (dashboard page.js line 391-463):
- `stats.pending`
- `stats.approved`  
- `stats.rejected`
- `stats.total`

**API should return** (stats route.js line 260-269):
```javascript
stats = {
  pending: pendingCount,
  approved: myApprovedCount,
  rejected: myRejectedCount,
  total: myTotalCount
}
```

---

## Action Plan

1. **First:** Check console log → Share the output
2. **Then:** Check Network tab → Share the stats object from response
3. **Finally:** Based on findings, we'll know exact fix needed

---

## Common Issues

### Issue 1: Dashboard API not including stats
**Symptom:** No stats in response, separate /api/staff/stats call made  
**Fix:** Dashboard API should include stats (line 113 of hook)

### Issue 2: Stats API returns but has wrong user ID
**Symptom:** Stats returns but all values are 0  
**Fix:** Run SQL fix to update action_by_user_id

### Issue 3: Caching issue
**Symptom:** Old data showing, refresh doesn't help  
**Fix:** Hard refresh (Ctrl+Shift+R) or clear browser cache

---

## Manual Test Query

Run this in Supabase SQL Editor to test if data exists:

```sql
-- Replace with your librarian's profile ID
WITH librarian AS (
    SELECT id FROM profiles WHERE email = '15anuragsingh2003@gmail.com'
)
SELECT 
    'Expected Stats' as test,
    COUNT(*) FILTER (WHERE s.status = 'approved') as approved,
    COUNT(*) FILTER (WHERE s.status = 'pending') as pending,
    COUNT(*) as total
FROM no_dues_status s
JOIN librarian l ON s.action_by_user_id = l.id
WHERE s.department_name = 'library';
```

Expected result: `approved: 1, pending: 0, total: 1`

If this returns 0, the SQL fix is needed!