# Complete No-Dues System Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Online Form Submission Workflow](#online-form-submission-workflow)
4. [Manual Entry Workflow](#manual-entry-workflow)
5. [Department Dashboard](#department-dashboard)
6. [Admin Dashboard](#admin-dashboard)
7. [Status Checking](#status-checking)
8. [Key Differences: Online vs Manual](#key-differences-online-vs-manual)

---

## System Overview

The JECRC No-Dues System has **TWO SEPARATE WORKFLOWS**:

### 1. Online Form Submission (Student Self-Service)
- Student fills form online → 7 departments approve → Auto-completed
- Uses `no_dues_forms` table with 7-department approval workflow
- Status field: `pending` → `completed`/`rejected`

### 2. Manual Entry (Pre-Completed Certificates)
- Student uploads already-completed offline certificate → Admin approves → Done
- Uses `no_dues_forms` table with `manual_status` field
- Manual status: `pending_review` → `approved`/`rejected`
- **NO department workflow** - direct admin approval only

---

## Database Schema

### Main Table: `no_dues_forms`

```sql
CREATE TABLE no_dues_forms (
  id UUID PRIMARY KEY,
  registration_no TEXT UNIQUE NOT NULL,
  student_name TEXT,
  school TEXT,
  course TEXT,
  branch TEXT,
  school_id UUID,
  course_id UUID,
  branch_id UUID,
  passing_year TEXT,
  personal_email TEXT,
  college_email TEXT,
  contact_no TEXT,
  certificate_url TEXT,
  
  -- DUAL STATUS SYSTEM
  status TEXT DEFAULT 'pending',           -- For online forms: pending/completed/rejected
  manual_status TEXT,                      -- For manual entries: pending_review/approved/rejected
  
  -- Metadata
  is_manual_entry BOOLEAN DEFAULT false,   -- Identifies manual vs online
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Department Approval Table: `no_dues_status`

```sql
CREATE TABLE no_dues_status (
  id UUID PRIMARY KEY,
  form_id UUID REFERENCES no_dues_forms(id),
  department_name TEXT,                    -- 7 departments
  status TEXT DEFAULT 'pending',           -- pending/approved/rejected
  remarks TEXT,
  actioned_by UUID REFERENCES auth.users(id),
  actioned_at TIMESTAMP
);
```

**7 Required Departments:**
1. Library
2. Hostel
3. Transport
4. Accounts
5. Academics
6. Placement
7. Student Welfare

### Configuration Tables

```sql
-- School/Course/Branch hierarchy
config_schools (id, name, is_active, display_order)
config_courses (id, school_id, name, is_active, display_order)
config_branches (id, course_id, name, is_active, display_order)

-- Staff/Department mapping
profiles (
  id UUID REFERENCES auth.users(id),
  role TEXT,                  -- admin/hod/staff
  department TEXT,            -- Library, Hostel, etc.
  email TEXT,
  full_name TEXT
)
```

---

## Online Form Submission Workflow

### Frontend: [`src/app/student/submit-form/page.js`](src/app/student/submit-form/page.js)

**User Journey:**
1. Student visits `/student/submit-form`
2. Fills personal details (registration_no, school, course, branch, year)
3. Provides contact info (personal_email, college_email, contact_no)
4. Submits form

**API Call:**
```javascript
POST /api/student
Body: {
  registration_no, student_name, school, course, branch,
  school_id, course_id, branch_id, passing_year,
  personal_email, college_email, contact_no
}
```

### Backend: [`src/app/api/student/route.js`](src/app/api/student/route.js)

**Process:**
```javascript
1. Validate input data
2. Check if registration_no already exists
3. Insert into no_dues_forms:
   - status = 'pending'
   - is_manual_entry = false
   - manual_status = null
4. Create 7 rows in no_dues_status (one per department):
   - status = 'pending' for each
5. Return success
```

**Database After Submission:**

`no_dues_forms`:
```
id: uuid-123
registration_no: 21BCON747
status: pending
is_manual_entry: false
manual_status: null
```

`no_dues_status` (7 rows):
```
form_id: uuid-123, department: Library, status: pending
form_id: uuid-123, department: Hostel, status: pending
form_id: uuid-123, department: Transport, status: pending
form_id: uuid-123, department: Accounts, status: pending
form_id: uuid-123, department: Academics, status: pending
form_id: uuid-123, department: Placement, status: pending
form_id: uuid-123, department: Student Welfare, status: pending
```

### Department Approval Process

**Staff Dashboard:** [`src/app/department/page.js`](src/app/department/page.js)

**API:** [`src/app/api/staff/dashboard/route.js`](src/app/api/staff/dashboard/route.js)

```javascript
GET /api/staff/dashboard?department=Library

// Returns forms needing Library department action
SELECT f.* FROM no_dues_forms f
JOIN no_dues_status ns ON f.id = ns.form_id
WHERE ns.department_name = 'Library'
  AND ns.status = 'pending'
  AND f.is_manual_entry = false  -- Only online forms
ORDER BY f.created_at
```

**Action API:** [`src/app/api/staff/action/route.js`](src/app/api/staff/action/route.js)

```javascript
POST /api/staff/action
Body: {
  formId: uuid-123,
  department: 'Library',
  action: 'approve',  // or 'reject'
  remarks: 'Books cleared'
}

Process:
1. Update no_dues_status:
   SET status = 'approved', 
       actioned_by = current_user_id,
       actioned_at = NOW()
   WHERE form_id = uuid-123 AND department = 'Library'

2. Check if all 7 departments approved:
   SELECT COUNT(*) FROM no_dues_status 
   WHERE form_id = uuid-123 AND status = 'approved'
   
3. If count = 7:
   UPDATE no_dues_forms 
   SET status = 'completed', updated_at = NOW()
   WHERE id = uuid-123
```

**Form Completion Logic:**
- Form stays `status = 'pending'` until ALL 7 departments approve
- If any department rejects → `status = 'rejected'`
- If all 7 approve → `status = 'completed'`

---

## Manual Entry Workflow

### Frontend: [`src/app/student/manual-entry/page.js`](src/app/student/manual-entry/page.js)

**User Journey:**
1. Student visits `/student/manual-entry`
2. Enters registration_no (validates against convocation database)
3. Fills school/course/branch details
4. **MUST provide contact info** (personal_email, college_email, contact_no)
5. **Uploads PDF certificate** (already completed offline)
6. Submits for admin review

**Certificate Upload:** [`src/app/api/upload/route.js`](src/app/api/upload/route.js)
```javascript
POST /api/upload
FormData: {
  file: certificate.pdf,
  bucket: 'no-dues-files',
  path: 'manual-entries',
  fileName: '21BCON747_1234567890.pdf'
}

// Handles file compression if needed
// Stores in Supabase Storage
// Returns public URL
```

**Submission API:** [`src/app/api/manual-entry/route.js`](src/app/api/manual-entry/route.js)

```javascript
POST /api/manual-entry
Body: {
  registration_no, student_name, school, course, branch,
  school_id, course_id, branch_id, passing_year,
  personal_email, college_email, contact_no,  // NOW REQUIRED
  certificate_url
}

Process:
1. Validate all required fields (including contact info)
2. Check if registration_no already exists
3. Insert into no_dues_forms:
   - status = 'pending'  (for compatibility)
   - is_manual_entry = true
   - manual_status = 'pending_review'  (THIS IS THE KEY!)
   - certificate_url = uploaded file URL
4. NO department status rows created
5. Return success
```

**Database After Manual Entry:**

`no_dues_forms`:
```
id: uuid-456
registration_no: 21BCON748
status: pending
is_manual_entry: true
manual_status: pending_review  ← Admin approval needed
certificate_url: https://supabase.co/storage/manual-entries/21BCON748_123.pdf
```

`no_dues_status`: **NO ROWS** (manual entries skip department workflow)

### Admin Approval Process

**Admin Dashboard:** [`src/app/admin/page.js`](src/app/admin/page.js)

**Get Manual Entries API:** [`src/app/api/manual-entry/route.js`](src/app/api/manual-entry/route.js)

```javascript
GET /api/manual-entry?status=pending_review

// Returns manual entries needing admin review
SELECT * FROM no_dues_forms
WHERE is_manual_entry = true
  AND manual_status = 'pending_review'  ← KEY FILTER
ORDER BY created_at DESC
```

**Admin Action API:** [`src/app/api/manual-entry/action/route.js`](src/app/api/manual-entry/action/route.js)

```javascript
POST /api/manual-entry/action
Body: {
  formId: uuid-456,
  action: 'approve',  // or 'reject'
  remarks: 'Certificate verified'
}

Process:
1. Update no_dues_forms:
   UPDATE no_dues_forms
   SET manual_status = 'approved',      ← Admin approval
       status = 'completed',             ← Also update general status
       updated_at = NOW()
   WHERE id = uuid-456
   
2. Return success
```

---

## Department Dashboard

### Route: [`src/app/department/page.js`](src/app/department/page.js)

**Displays:**
- Pending forms for their department (online forms only)
- Student details
- Action buttons (Approve/Reject)
- Remarks field

**API Endpoints Used:**
```javascript
GET /api/staff/dashboard?department=Library
  → Returns pending forms needing Library approval

POST /api/staff/action
  → Approve/reject a form for their department
```

**Stats Display:**
```javascript
GET /api/staff/stats?department=Library

Returns:
{
  pending: 5,    // Forms waiting for Library
  approved: 23,  // Forms Library already approved
  rejected: 2    // Forms Library rejected
}
```

---

## Admin Dashboard

### Route: [`src/app/admin/page.js`](src/app/admin/page.js)

**Tabs:**
1. **Overview** - System statistics
2. **Manual Entries** - Pending manual entry approvals
3. **All Forms** - Complete form listing
4. **Reports** - Analytics

### Tab 1: Overview Statistics

**API:** [`src/app/api/admin/stats/route.js`](src/app/api/admin/stats/route.js)

```javascript
GET /api/admin/stats

Calls database function: get_form_statistics()

Returns:
{
  total_forms: 150,
  completed_forms: 100,
  pending_forms: 45,
  rejected_forms: 5
}
```

**Database Function:** [`ULTIMATE_DATABASE_SETUP.sql`](ULTIMATE_DATABASE_SETUP.sql) line 590

```sql
CREATE OR REPLACE FUNCTION get_form_statistics()
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total_forms', COUNT(*),
      'completed_forms', COUNT(*) FILTER (WHERE status = 'completed'),  ← FIXED
      'pending_forms', COUNT(*) FILTER (WHERE status = 'pending'),
      'rejected_forms', COUNT(*) FILTER (WHERE status = 'rejected')
    )
    FROM no_dues_forms
    WHERE is_manual_entry = false  -- Only online forms
  );
END;
$$ LANGUAGE plpgsql;
```

**Previous Bug:** Function was checking `status = 'approved'` which doesn't exist. Fixed to check `status = 'completed'`.

### Tab 2: Manual Entries

**API:** [`src/app/api/manual-entry/route.js`](src/app/api/manual-entry/route.js)

```javascript
GET /api/manual-entry?status=pending_review

Returns manual entries with manual_status = 'pending_review'
```

**Manual Entry Stats API:** [`src/app/api/admin/manual-entries-stats/route.js`](src/app/api/admin/manual-entries-stats/route.js)

```javascript
GET /api/admin/manual-entries-stats

Calls: get_manual_entry_statistics()

Returns:
{
  total_entries: 10,
  pending_review: 3,
  approved: 6,
  rejected: 1
}
```

**Database Function:**

```sql
CREATE OR REPLACE FUNCTION get_manual_entry_statistics()
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total_entries', COUNT(*),
      'pending_review', COUNT(*) FILTER (WHERE manual_status = 'pending_review'),
      'approved', COUNT(*) FILTER (WHERE manual_status = 'approved'),
      'rejected', COUNT(*) FILTER (WHERE manual_status = 'rejected')
    )
    FROM no_dues_forms
    WHERE is_manual_entry = true
  );
END;
$$ LANGUAGE plpgsql;
```

---

## Status Checking

### Route: [`src/app/student/check-status/page.js`](src/app/student/check-status/page.js)

**API:** [`src/app/api/check-status/route.js`](src/app/api/check-status/route.js)

```javascript
GET /api/check-status?registration_no=21BCON747

Process:
1. Get form data:
   SELECT * FROM no_dues_forms 
   WHERE registration_no = '21BCON747'

2. Check if manual entry:
   if (form.is_manual_entry) {
     // Manual entry - check manual_status
     return {
       ...form,
       display_status: form.manual_status,  // pending_review/approved/rejected
       is_manual: true
     }
   } else {
     // Online form - get department statuses
     SELECT * FROM no_dues_status 
     WHERE form_id = form.id
     
     return {
       ...form,
       display_status: form.status,  // pending/completed/rejected
       is_manual: false,
       department_statuses: [...]  // Array of 7 department statuses
     }
   }
```

**Display Logic:**

**For Online Forms:**
```javascript
Status: Pending
Departments:
✓ Library - Approved (2024-12-15)
✓ Hostel - Approved (2024-12-15)
⏳ Transport - Pending
⏳ Accounts - Pending
⏳ Academics - Pending
⏳ Placement - Pending
⏳ Student Welfare - Pending
```

**For Manual Entries:**
```javascript
Status: Pending Admin Review
Certificate: [View Certificate]
No department workflow - awaiting admin verification
```

---

## Key Differences: Online vs Manual

| Feature | Online Form | Manual Entry |
|---------|------------|--------------|
| **Table** | `no_dues_forms` | `no_dues_forms` |
| **Identifier** | `is_manual_entry = false` | `is_manual_entry = true` |
| **Status Field** | `status` (pending/completed/rejected) | `manual_status` (pending_review/approved/rejected) |
| **Department Workflow** | ✅ Yes - 7 departments must approve | ❌ No - direct admin approval |
| **Department Status Rows** | ✅ 7 rows in `no_dues_status` | ❌ None |
| **Certificate** | ❌ Not required | ✅ Required (uploaded PDF) |
| **Contact Info** | ✅ Required | ✅ Required (added recently) |
| **Approval Flow** | Student → Dept1 → Dept2 → ... → Dept7 → Completed | Student → Admin → Completed |
| **Who Sees It** | Department dashboards | Admin dashboard only |
| **Stats Function** | `get_form_statistics()` | `get_manual_entry_statistics()` |

---

## Recent Bug Fixes

### 1. Manual Entry Vanishing Bug
**Problem:** Approved manual entries disappeared from admin panel
**Cause:** API was filtering by `status` instead of `manual_status`
**Fix:** Changed filter to `manual_status = 'pending_review'` in GET endpoint

### 2. Status Display Bug
**Problem:** Status showed "pending" after approval
**Cause:** Check-status API returned `status` field for manual entries
**Fix:** Added `display_status` helper field using `manual_status` for manual entries

### 3. Admin Stats NaN% Bug
**Problem:** Admin dashboard showed `0 (NaN%)` for all stats
**Cause:** Database function checked for non-existent `status = 'approved'`
**Fix:** Changed to `status = 'completed'` in `get_form_statistics()`

### 4. Manual Entry 404 Redirect Bug
**Problem:** After submitting manual entry, redirect to `/check-status` caused 404
**Cause:** Wrong redirect path - should be `/student/check-status`
**Fix:** Updated redirect in manual-entry page.js line 313

---

## SQL Queries Summary

### Get All Online Forms (Pending)
```sql
SELECT f.* FROM no_dues_forms f
WHERE f.is_manual_entry = false 
  AND f.status = 'pending'
ORDER BY f.created_at DESC;
```

### Get All Manual Entries (Pending Admin Review)
```sql
SELECT * FROM no_dues_forms
WHERE is_manual_entry = true 
  AND manual_status = 'pending_review'
ORDER BY created_at DESC;
```

### Get Forms for Specific Department
```sql
SELECT f.*, ns.status as dept_status
FROM no_dues_forms f
JOIN no_dues_status ns ON f.id = ns.form_id
WHERE ns.department_name = 'Library'
  AND ns.status = 'pending'
  AND f.is_manual_entry = false
ORDER BY f.created_at;
```

### Check if Form Fully Approved (All 7 Departments)
```sql
SELECT 
  f.id,
  f.registration_no,
  COUNT(*) FILTER (WHERE ns.status = 'approved') as approved_count
FROM no_dues_forms f
JOIN no_dues_status ns ON f.id = ns.form_id
WHERE f.id = 'uuid-123'
GROUP BY f.id, f.registration_no
HAVING COUNT(*) FILTER (WHERE ns.status = 'approved') = 7;
```

---

## File Structure

```
src/
├── app/
│   ├── student/
│   │   ├── submit-form/page.js       # Online form submission
│   │   ├── manual-entry/page.js      # Manual entry upload
│   │   └── check-status/page.js      # Status checking
│   ├── department/page.js            # Department dashboard
│   ├── admin/page.js                 # Admin dashboard
│   └── api/
│       ├── student/route.js          # Online form API
│       ├── manual-entry/
│       │   ├── route.js              # Get/Post manual entries
│       │   └── action/route.js       # Admin approve/reject
│       ├── staff/
│       │   ├── dashboard/route.js    # Dept pending forms
│       │   ├── action/route.js       # Dept approve/reject
│       │   └── stats/route.js        # Dept statistics
│       ├── admin/
│       │   ├── stats/route.js        # Online form stats
│       │   └── manual-entries-stats/route.js  # Manual entry stats
│       ├── check-status/route.js     # Status checking API
│       └── upload/route.js           # File upload
└── components/
    ├── admin/AdminDashboard.jsx      # Admin UI
    └── department/DepartmentDashboard.jsx  # Dept UI
```

---

**Documentation Complete** ✅
**Last Updated:** 2025-12-17