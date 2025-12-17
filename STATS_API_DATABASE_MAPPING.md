# Stats API & Database Mapping - Complete Reference

## Critical Bug Fixed

**Issue**: Frontend was checking for `total_requests` but database returns `total_forms`
**Fix**: Changed validation in [`AdminDashboard.jsx:198`](src/components/admin/AdminDashboard.jsx:198) from `total_requests` to `total_forms`

---

## Database Function: `get_form_statistics()`

**Location**: [`ULTIMATE_DATABASE_SETUP.sql:590-615`](ULTIMATE_DATABASE_SETUP.sql:590)

**Returns:**
```sql
RETURNS TABLE (
    total_forms BIGINT,         -- ✅ Used in frontend
    pending_forms BIGINT,        -- ✅ Used in frontend
    approved_forms BIGINT,       -- ❌ NOT used (no 'approved' status in forms)
    rejected_forms BIGINT,       -- ✅ Used in frontend
    completed_forms BIGINT,      -- ✅ Used in frontend
    forms_today BIGINT,          -- ✅ Used in frontend
    forms_this_week BIGINT,      -- ✅ Used in frontend
    forms_this_month BIGINT      -- ✅ Used in frontend
)
```

**SQL Logic:**
```sql
SELECT
    COUNT(*)::BIGINT as total_forms,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_forms,
    COUNT(*) FILTER (WHERE status = 'approved')::BIGINT as approved_forms,
    COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_forms,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_forms,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::BIGINT as forms_today,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as forms_this_week,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::BIGINT as forms_this_month
FROM public.no_dues_forms
WHERE is_manual_entry = false; -- ✅ Excludes manual entries
```

---

## Admin Stats API Response Structure

**API**: [`/api/admin/stats`](src/app/api/admin/stats/route.js)

**Response Format:**
```javascript
{
  overallStats: [
    {
      total_forms: 150,
      pending_forms: 45,
      approved_forms: 0,      // Always 0 (no 'approved' status exists)
      rejected_forms: 20,
      completed_forms: 85,
      forms_today: 5,
      forms_this_week: 25,
      forms_this_month: 60
    }
  ],
  departmentStats: [
    {
      department_name: "library",
      total_requests: 150,
      approved_requests: 95,
      rejected_requests: 15,
      pending_requests: 40,
      avg_response_time: "2h 30m",
      avg_response_time_seconds: 9000,
      approval_rate: "63.33%",
      rejection_rate: "10.00%"
    },
    // ... more departments
  ],
  recentActivity: [...],
  pendingAlerts: [...]
}
```

---

## Admin Dashboard Frontend Usage

**Component**: [`AdminDashboard.jsx`](src/components/admin/AdminDashboard.jsx)

### Stats Cards Display (Lines 324-357)

```javascript
{statsLoaded && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
    <StatsCard
      title="Total Requests"
      value={stats.overallStats[0]?.total_forms || 0}  // ✅ Correct
      subtitle="All applications"
      icon={FileText}
    />
    <StatsCard
      title="Pending"
      value={stats.overallStats[0]?.pending_forms || 0}  // ✅ Correct
      subtitle="Awaiting action"
      icon={Clock}
    />
    <StatsCard
      title="Completed"
      value={stats.overallStats[0]?.completed_forms || 0}  // ✅ Correct
      subtitle="Fully cleared"
      icon={CheckCircle}
    />
    <StatsCard
      title="Rejected"
      value={stats.overallStats[0]?.rejected_forms || 0}  // ✅ Correct
      subtitle="Needs attention"
      icon={XCircle}
    />
  </div>
)}
```

### Validation Logic (Line 192-199)

**BEFORE (BROKEN):**
```javascript
const statsLoaded = Boolean(
  stats &&
  stats.overallStats &&
  Array.isArray(stats.overallStats) &&
  stats.overallStats.length > 0 &&
  stats.overallStats[0] &&
  typeof stats.overallStats[0].total_requests !== 'undefined'  // ❌ WRONG FIELD
);
```

**AFTER (FIXED):**
```javascript
const statsLoaded = Boolean(
  stats &&
  stats.overallStats &&
  Array.isArray(stats.overallStats) &&
  stats.overallStats.length > 0 &&
  stats.overallStats[0] &&
  typeof stats.overallStats[0].total_forms !== 'undefined'  // ✅ CORRECT FIELD
);
```

---

## Staff/Department Stats API Response

**API**: [`/api/staff/stats`](src/app/api/staff/stats/route.js)

**Response Format:**
```javascript
{
  department: "Central Library",        // Display name
  departmentName: "library",            // Internal name
  pending: 15,                          // Department pending count (need action)
  approved: 45,                         // MY approved count (personal)
  rejected: 8,                          // MY rejected count (personal)
  total: 53,                            // MY total actions (personal)
  approvalRate: 85,                     // Percentage (MY approval rate)
  todayApproved: 3,                     // MY actions today
  todayRejected: 1,                     // MY actions today
  todayTotal: 4                         // MY actions today
}
```

**Note**: Staff stats show:
- `pending`: Department-wide pending (all staff can see)
- `approved/rejected/total`: **Personal** actions by this staff member only

---

## Staff Dashboard Frontend Usage

**Component**: [`src/app/staff/dashboard/page.js`](src/app/staff/dashboard/page.js)

### Stats Cards Display (Lines 389-469)

```javascript
<StatsCard
  title="Pending Requests"
  value={stats.pending || 0}           // ✅ Department pending
  subtitle="Awaiting your action"
  icon={Clock}
  color="yellow"
/>

<StatsCard
  title="My Approved"
  value={stats.approved || 0}          // ✅ Personal approved
  subtitle="Applications you approved"
  icon={CheckCircle}
  color="green"
/>

<StatsCard
  title="My Rejected"
  value={stats.rejected || 0}          // ✅ Personal rejected
  subtitle="Applications you rejected"
  icon={XCircle}
  color="red"
/>

<StatsCard
  title="My Total Actions"
  value={stats.total || 0}             // ✅ Personal total
  subtitle={stats.approvalRate ? `${stats.approvalRate}% your approval rate` : 'Your all time actions'}
  icon={TrendingUp}
  color="blue"
/>
```

---

## Database Form Status Values

**Table**: `no_dues_forms`
**Column**: `status`
**Constraint**: `CHECK (status IN ('pending', 'approved', 'rejected', 'completed'))`

### Status Flow:
1. **`pending`** - Initial state, awaiting department actions
2. **`rejected`** - ANY department rejected → form becomes rejected
3. **`completed`** - ALL departments approved → form becomes completed
4. **`approved`** - ❌ **NEVER USED FOR FORMS** (only for individual department statuses)

### Why `approved_forms` is always 0:
- Forms don't have an "approved" status
- Forms go from `pending` → `completed` (when all depts approve)
- Forms go from `pending` → `rejected` (when any dept rejects)
- The `approved` status only exists in `no_dues_status` table (individual department clearances)

---

## Department Status Values

**Table**: `no_dues_status`
**Column**: `status`
**Constraint**: `CHECK (status IN ('pending', 'approved', 'rejected'))`

### Department Status Flow:
1. **`pending`** - Awaiting action from this department
2. **`approved`** - This department cleared the student
3. **`rejected`** - This department rejected the student

**This is what `departmentStats` shows:**
- `pending_requests`: Count of `pending` in no_dues_status
- `approved_requests`: Count of `approved` in no_dues_status  
- `rejected_requests`: Count of `rejected` in no_dues_status

---

## Complete Field Mapping

### Admin Dashboard
| Frontend Display | API Field | Database Source | Type |
|-----------------|-----------|-----------------|------|
| Total Requests | `overallStats[0].total_forms` | `COUNT(*) WHERE is_manual_entry=false` | BIGINT |
| Pending | `overallStats[0].pending_forms` | `COUNT(*) WHERE status='pending'` | BIGINT |
| Completed | `overallStats[0].completed_forms` | `COUNT(*) WHERE status='completed'` | BIGINT |
| Rejected | `overallStats[0].rejected_forms` | `COUNT(*) WHERE status='rejected'` | BIGINT |
| Today | `overallStats[0].forms_today` | `COUNT(*) WHERE created_at >= CURRENT_DATE` | BIGINT |
| This Week | `overallStats[0].forms_this_week` | `COUNT(*) WHERE created_at >= -7 days` | BIGINT |
| This Month | `overallStats[0].forms_this_month` | `COUNT(*) WHERE created_at >= -30 days` | BIGINT |

### Staff Dashboard
| Frontend Display | API Field | Database Source | Type |
|-----------------|-----------|-----------------|------|
| Pending Requests | `pending` | `COUNT(*) WHERE department_name=X AND status='pending'` | NUMBER |
| My Approved | `approved` | `COUNT(*) WHERE action_by_user_id=Y AND status='approved'` | NUMBER |
| My Rejected | `rejected` | `COUNT(*) WHERE action_by_user_id=Y AND status='rejected'` | NUMBER |
| My Total Actions | `total` | `COUNT(*) WHERE action_by_user_id=Y` | NUMBER |
| Approval Rate | `approvalRate` | `(approved / total) * 100` | NUMBER |
| Today Approved | `todayApproved` | `COUNT(*) WHERE action_by_user_id=Y AND action_at >= TODAY AND status='approved'` | NUMBER |
| Today Rejected | `todayRejected` | `COUNT(*) WHERE action_by_user_id=Y AND action_at >= TODAY AND status='rejected'` | NUMBER |
| Today Total | `todayTotal` | `COUNT(*) WHERE action_by_user_id=Y AND action_at >= TODAY` | NUMBER |

---

## Manual Entries (Separate Workflow)

**API**: [`/api/admin/manual-entries-stats`](src/app/api/admin/manual-entries-stats/route.js)

**Database Function**: `get_manual_entry_statistics()`

**Returns:**
```javascript
{
  total_entries: 25,
  pending_entries: 10,
  approved_entries: 12,
  rejected_entries: 3
}
```

**Table**: `no_dues_forms` WHERE `is_manual_entry = true`
**Status Field**: `manual_status` (NOT `status`)
**Values**: `'pending_review' | 'info_requested' | 'approved' | 'rejected'`

---

## Summary

✅ **All mappings are now correct!**

**Key Fixes:**
1. Changed validation from `total_requests` → `total_forms` ✅
2. Verified all field names match database exactly ✅
3. Confirmed manual entries are excluded from regular stats ✅
4. Documented complete data flow from DB → API → Frontend ✅

**No further changes needed** - the system correctly:
- Excludes manual entries from regular form counts
- Uses correct field names from database
- Displays stats accurately in both admin and staff dashboards