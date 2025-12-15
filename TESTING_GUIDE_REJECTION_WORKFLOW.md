# 🧪 Testing Guide: Online Form Rejection & Reapply Workflow

## Database Status: ✅ HEALTHY
```json
{
  "Online Forms": 2,
  "With Department Statuses": 2,
  "Without Statuses": 0
}
```
All forms have proper department status records. The issue was purely in the API logic (now fixed).

## What Was Fixed

The [`check-status API`](src/app/api/check-status/route.js) was returning **empty department status arrays** due to incorrect manual entry logic placement. This has been corrected.

## Complete Testing Procedure

### Test Case 1: Staff Rejects a Student Form ✅

**Prerequisites:**
- Have a test student form submitted
- Login as staff member (e.g., Library department)

**Steps:**
1. Navigate to staff dashboard
2. Find the test student's form
3. Click "Reject" and provide a reason: "Books not returned"
4. Submit the rejection

**Expected Behavior:**
- ✅ Form status changes to "rejected" in database
- ✅ ALL other pending departments cascade to "rejected" automatically
- ✅ Email notification sent to student
- ✅ Real-time update triggers (if student has page open)

**Database Verification:**
```sql
SELECT 
    f.registration_no,
    f.status AS form_status,
    s.department_name,
    s.status AS dept_status,
    s.rejection_reason
FROM no_dues_forms f
JOIN no_dues_status s ON s.form_id = f.id
WHERE f.registration_no = 'TEST_REG_NO'
ORDER BY s.department_name;
```

Should show:
- Form status: `rejected`
- All departments: `rejected` status
- Library: Has rejection reason

---

### Test Case 2: Student Checks Status Page ✅

**Prerequisites:**
- Student's form has been rejected (from Test Case 1)

**Steps:**
1. Open browser (preferably incognito/private mode)
2. Navigate to: `https://your-domain.com/check-status`
3. Enter registration number
4. Click "Check Status"

**Expected UI Display:**

#### 1. **Header Section**
```
Application Status
─────────────────
Student Name: [Name]
Registration No: [REG_NO]
Submitted: [Date]

[Refresh Button]
```

#### 2. **Progress Bar**
```
[━━━━━━━━━━░░░░░░░░░░] 1/10 Approved
```

#### 3. **🚨 RED REJECTION ALERT BOX** (THIS IS KEY!)
```
╔══════════════════════════════════════════════╗
║  ❌ Application Rejected by 1 Department     ║
╚══════════════════════════════════════════════╝

Your application has been rejected. Please review 
the rejection reasons below and reapply with the 
necessary corrections.

┌─────────────────────────────────────────────┐
│ Library                          [Date/Time] │
│ Reason: Books not returned                   │
└─────────────────────────────────────────────┘

[🔄 Reapply with Corrections]  <-- BUTTON MUST APPEAR
```

#### 4. **Department Clearances Section**
```
Department Clearances
─────────────────────

Library        [REJECTED]  [Date]
IT Department  [REJECTED]  [Date]
Hostel         [REJECTED]  [Date]
...
```

**Browser Console Debug Output:**
```javascript
📊 Fresh data received from API: {
  formStatus: "rejected",
  isManualEntry: false,
  departmentStatuses: [
    { name: "Library", status: "rejected" },
    { name: "IT Department", status: "rejected" },
    ...
  ]
}

🔍 Reapply Button Debug: {
  hasRejection: true,         // ✅ MUST BE TRUE
  formStatus: "rejected",     // ✅ MUST BE "rejected"
  canReapply: true,           // ✅ MUST BE TRUE
  rejectedCount: 10,          // Number of rejected depts
  rejectedDepartments: [...], // Array of dept names
  isManualEntry: false,       // ✅ MUST BE FALSE
  allApproved: false
}
```

**❌ If Reapply Button Does NOT Appear:**

Check browser console for these issues:
1. `hasRejection: false` → API not returning rejection data
2. `formStatus: "completed"` → Form status incorrectly set
3. `isManualEntry: true` → Form incorrectly marked as manual entry
4. `statusData: []` → API returning empty department array (original bug)

---

### Test Case 3: Student Reapplies ✅

**Prerequisites:**
- Student sees rejection alert and reapply button

**Steps:**
1. Click "Reapply with Corrections" button
2. Modal should open showing:
   - Rejection reasons
   - Editable form fields
   - Reply message textarea
3. Edit the necessary fields (e.g., add "Books returned on [date]")
4. Enter reply message: "I have returned all books. Please verify."
5. Click "Submit Reapplication"

**Expected Behavior:**
- ✅ Success message appears: "Reapplication Submitted!"
- ✅ Modal closes automatically after 1.5 seconds
- ✅ Status page auto-refreshes
- ✅ Progress bar shows "0/10 Approved" (reset)
- ✅ All rejected departments now show "PENDING"
- ✅ Reply message stored in database
- ✅ Email notifications sent to rejected department staff

**Database Verification:**
```sql
-- Check form was updated
SELECT 
    registration_no,
    status,
    reapplication_count,
    last_reapplied_at,
    student_reply_message
FROM no_dues_forms 
WHERE registration_no = 'TEST_REG_NO';

-- Check department statuses were reset
SELECT 
    department_name,
    status,
    rejection_reason,
    action_at
FROM no_dues_status 
WHERE form_id = (SELECT id FROM no_dues_forms WHERE registration_no = 'TEST_REG_NO')
ORDER BY department_name;

-- Check history was logged
SELECT 
    reapplication_number,
    student_message,
    edited_fields,
    rejected_departments,
    created_at
FROM no_dues_reapplication_history 
WHERE form_id = (SELECT id FROM no_dues_forms WHERE registration_no = 'TEST_REG_NO')
ORDER BY reapplication_number DESC;
```

Should show:
- Form status: `pending`
- Reapplication count: `1`
- Last reapplied at: `[timestamp]`
- Reply message: "I have returned all books..."
- All rejected departments: Now `pending` status
- History: One record created

---

### Test Case 4: Staff Reviews Reapplication ✅

**Prerequisites:**
- Student has reapplied (from Test Case 3)

**Steps:**
1. Login as staff member who rejected originally
2. Go to dashboard
3. Find the student's form (should be back in "Pending" list)
4. Review the student's reply message
5. Check if corrections were made
6. Either approve or reject again

**Expected Display:**
- ✅ Form shows in "Pending Applications" tab
- ✅ "Reapplication #1" badge visible
- ✅ Student's reply message displayed
- ✅ Edited fields highlighted (if any)
- ✅ Previous rejection reason shown for reference

---

## Vercel Server Log Checks

After deploying, check Vercel logs for:

**When student checks status:**
```
📊 Check Status Debug for TEST_REG_NO: {
  isManualEntry: false,
  formStatus: 'rejected',
  departmentCount: 10,
  statusRecordCount: 10,    // ✅ Should match
  statusDataCount: 10,       // ✅ Should match
  rejectedDepts: 1           // ✅ Number that rejected
}
```

**When student reapplies:**
```
✅ Reapplication #1 processed for TEST_REG_NO
📧 Reapplication notifications sent to 1 staff member(s)
🔄 Triggering email queue processor...
```

---

## Common Issues & Solutions

### Issue 1: Reapply Button Not Showing

**Symptoms:**
- Rejection alert shows
- Rejection reasons visible
- But reapply button missing

**Debug Steps:**
1. Open browser console
2. Look for `🔍 Reapply Button Debug` log
3. Check values:
   - `hasRejection` should be `true`
   - `formStatus` should be `"rejected"` NOT `"completed"`
   - `canReapply` should be `true`

**Solution:**
If `formStatus` is `"completed"`, update database:
```sql
UPDATE no_dues_forms 
SET status = 'rejected' 
WHERE registration_no = 'TEST_REG_NO' 
AND status = 'completed';
```

### Issue 2: Rejection Reasons Not Displayed

**Symptoms:**
- Alert box shows "X departments rejected"
- But no department names or reasons

**Debug Steps:**
1. Check browser console for API response
2. Look for `departmentStatuses` array
3. Verify each status has `rejection_reason` field

**Solution:**
If `rejection_reason` is `null`, add it:
```sql
UPDATE no_dues_status 
SET rejection_reason = 'Please provide reason'
WHERE status = 'rejected' 
AND rejection_reason IS NULL;
```

### Issue 3: All Departments Not Cascading to Rejected

**Symptoms:**
- One department rejects
- But others still show "pending"

**Debug Steps:**
Check if trigger function exists:
```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'update_form_status_on_department_action';
```

**Solution:**
Re-run the trigger creation from [`FINAL_COMPLETE_DATABASE_SETUP.sql`](FINAL_COMPLETE_DATABASE_SETUP.sql) lines 476-538.

---

## Success Criteria Checklist

After running all tests, confirm:

- [ ] Staff can reject forms
- [ ] Rejection cascade works (all departments marked rejected)
- [ ] Student sees red rejection alert box
- [ ] Student sees rejection reasons
- [ ] Student sees reapply button
- [ ] Student can submit reapplication
- [ ] Form resets to pending after reapply
- [ ] Rejected departments reset to pending
- [ ] Staff receives email notifications
- [ ] History is logged in database
- [ ] Manual entries still work separately

---

## Performance Benchmarks

**API Response Times (should be under):**
- Check Status: < 500ms
- Submit Reapplication: < 1000ms
- Staff Dashboard Load: < 800ms

**Real-time Updates:**
- Status change propagation: < 2 seconds
- Browser auto-refresh: Every 60 seconds

---

## Deployment Checklist

Before going live:

1. [ ] Run [`REPAIR_BROKEN_ONLINE_FORMS.sql`](REPAIR_BROKEN_ONLINE_FORMS.sql)
2. [ ] Deploy API fix to Vercel
3. [ ] Clear Vercel cache (if any)
4. [ ] Test with real rejected student account
5. [ ] Verify email notifications work
6. [ ] Monitor Vercel logs for errors
7. [ ] Have students clear browser cache (Ctrl+Shift+R)

---

## Support Documentation

**For Students:**
- If you can't see your rejection status, clear your browser cache (Ctrl+Shift+R)
- If reapply button doesn't appear, contact admin with your registration number
- Check your email for rejection notifications

**For Staff:**
- All rejections now cascade automatically to all departments
- Students can reapply unlimited times (system default: max 5)
- Previous rejection reasons are preserved in history

**For Admins:**
- Monitor [`/api/check-status`](src/app/api/check-status/route.js) logs for issues
- Run [`REPAIR_BROKEN_ONLINE_FORMS.sql`](REPAIR_BROKEN_ONLINE_FORMS.sql) if corruption detected
- Database trigger handles cascade automatically

---

**Testing Complete:** System is operational when all Test Cases pass ✅