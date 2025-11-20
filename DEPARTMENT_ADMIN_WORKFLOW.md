# 👥 Department & Admin Workflow - Complete Guide

## 📋 Overview

This document explains in detail how Department Staff and Admin users interact with the JECRC No Dues System, including account creation, login, email notifications, and their dashboard interface.

---

## 🎯 User Roles Explained

### **Role 1: Department Staff**
**Who**: Library staff, Hostel warden, IT admin, Mess manager, etc.
**Access**: Limited to their own department
**Permissions**:
- ✅ View requests for THEIR department only
- ✅ Approve requests for THEIR department
- ✅ Reject requests with reason
- ❌ Cannot see other departments' requests
- ❌ Cannot see overall system statistics

**Example**: Library staff can ONLY see and process library clearances

---

### **Role 2: Admin**
**Who**: System administrator, Registrar office
**Access**: Full system access
**Permissions**:
- ✅ View ALL requests from ALL departments
- ✅ Approve/Reject for ANY department
- ✅ View system-wide statistics
- ✅ Generate reports
- ✅ Manage all operations

**Example**: Admin can see and process clearances for Library, Hostel, IT, etc.

---

## 🔐 Account Creation & Login

### **Method 1: Manual Account Creation by Super Admin**

**Step 1: Super Admin creates accounts via Supabase Dashboard**
```sql
-- Super admin runs this in Supabase SQL Editor

-- Create Department Staff Account
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('library@jecrc.edu.in', crypt('password123', gen_salt('bf')), NOW());

-- Get the user ID
SELECT id FROM auth.users WHERE email = 'library@jecrc.edu.in';

-- Create profile
INSERT INTO profiles (id, full_name, role, department_name, email)
VALUES (
    'user-id-from-above',
    'Ramesh Kumar',
    'department',
    'LIBRARY',
    'library@jecrc.edu.in'
);

-- Create Admin Account
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('admin@jecrc.edu.in', crypt('admin123', gen_salt('bf')), NOW());

INSERT INTO profiles (id, full_name, role, department_name, email)
VALUES (
    'admin-user-id',
    'Dr. Sharma',
    'admin',
    NULL,  -- Admin has no department
    'admin@jecrc.edu.in'
);
```

**Credentials shared with staff:**
- Email: `library@jecrc.edu.in`
- Password: `password123`
- Role: Department Staff (Library)

---

### **Method 2: Admin Panel for User Management (Future Enhancement)**

**Admin can create accounts via UI:**
```
Admin Dashboard → User Management → Add New User
├── Full Name: [Input]
├── Email: [Input]
├── Role: [Dropdown: Department / Admin]
├── Department: [Dropdown: only if Department role]
└── [Create Account] → Sends email with credentials
```

---

## 🚪 Login Process

### **URL**: `https://yourdomain.com/staff/login` (Direct URL only)

**Important**: No link visible on student landing page - staff must know the URL

### **Login Page UI:**

```
┌─────────────────────────────────────────┐
│                                         │
│       JECRC NO DUES SYSTEM              │
│       Staff & Admin Portal              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │                                   │ │
│  │  Email Address                    │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │ library@jecrc.edu.in        │ │ │
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │  Password                         │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │ ••••••••                    │ │ │
│  │  └─────────────────────────────┘ │ │
│  │                                   │ │
│  │  Role                             │ │
│  │  ⦿ Department Staff               │ │
│  │  ○ Admin                          │ │
│  │                                   │ │
│  │        [LOGIN]                    │ │
│  │                                   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Forgot Password? Contact Admin        │
└─────────────────────────────────────────┘
```

### **Login API Flow:**

```javascript
// POST /api/staff/login
{
  "email": "library@jecrc.edu.in",
  "password": "password123",
  "role": "department"  // or "admin"
}

// Backend Process:
1. Authenticate with Supabase Auth
2. Verify user exists in profiles table
3. Verify role matches (department or admin)
4. If department staff, verify department_name exists
5. Create session token
6. Return user data

// Response:
{
  "success": true,
  "user": {
    "id": "uuid",
    "full_name": "Ramesh Kumar",
    "role": "department",
    "department_name": "LIBRARY",
    "email": "library@jecrc.edu.in"
  },
  "redirect": "/staff/dashboard"
}
```

### **After Login Redirect:**
- **Department Staff** → `/staff/dashboard` (filtered to their department)
- **Admin** → `/staff/dashboard` (all departments visible)
- Same dashboard UI, different data based on role

---

## 📧 Email Notification System

### **When Students Submit Forms:**

**Trigger**: Student submits no-dues form → Email sent to all department staff

### **Email Flow:**

```
1. Student submits form with Reg No: 2021A1234
   ↓
2. Backend creates form in database
   ↓
3. Trigger creates 12 department status records
   ↓
4. Email service sends notification to ALL departments
   ↓
5. Query all department staff emails:
   SELECT email FROM profiles 
   WHERE role = 'department'
   ↓
6. Send email to each department staff
```

### **Email Template (HTML):**

```
Subject: New No Dues Request - 2021A1234

Dear LIBRARY Department,

A new no-dues clearance request has been submitted:

Student Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: John Doe
Registration No: 2021A1234
Course: B.Tech Computer Science
Session: 2021-2025
Contact: 9876543210
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please review and process this request.

[VIEW REQUEST]
https://yourdomain.com/staff/login

Note: You need to login to view and process this request.

JECRC No Dues System
Automated Email - Please do not reply
```

### **Email Implementation:**

```javascript
// src/lib/emailService.js

export async function sendNewFormNotification(form) {
  // Get all department staff emails
  const { data: staff } = await supabase
    .from('profiles')
    .select('email, full_name, department_name')
    .eq('role', 'department');

  // Group by department and send emails
  for (const staffMember of staff) {
    await sendEmail({
      to: staffMember.email,
      subject: `New No Dues Request - ${form.registration_no}`,
      html: generateEmailTemplate({
        staffName: staffMember.full_name,
        department: staffMember.department_name,
        student: form.student_name,
        registrationNo: form.registration_no,
        course: form.course,
        loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/staff/login`
      })
    });
  }

  // Also notify admin
  const { data: admin } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('role', 'admin');

  for (const adminUser of admin) {
    await sendEmail({
      to: adminUser.email,
      subject: `New No Dues Request - ${form.registration_no}`,
      html: generateAdminEmailTemplate({
        adminName: adminUser.full_name,
        student: form.student_name,
        registrationNo: form.registration_no
      })
    });
  }
}
```

---

## 📊 Department Staff Dashboard

**URL**: `/staff/dashboard` (after login)

### **Dashboard UI for Department Staff:**

```
┌─────────────────────────────────────────────────────────────┐
│  JECRC No Dues System           Welcome, Ramesh Kumar       │
│  Library Department                              [Logout]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Your Department Statistics                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Total: 45    │ │ Pending: 12  │ │ Approved: 30 │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                             │
│  🔍 Search: [________________]  Filter: [All Status ▼]     │
│                                                             │
│  📋 Pending Requests for Library Department                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Reg No    │ Student Name  │ Course    │ Date      │ │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ 2021A1234 │ John Doe      │ B.Tech CS │ Jan 15    │→│ │
│  │ 2021A5678 │ Jane Smith    │ B.Tech EC │ Jan 16    │→│ │
│  │ 2021A9012 │ Ram Kumar     │ BBA       │ Jan 17    │→│ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Showing 3 of 12 pending requests                          │
│  [Previous] Page 1 of 4 [Next]                             │
└─────────────────────────────────────────────────────────────┘
```

### **When Staff Clicks on a Request:**

**URL**: `/staff/student/[id]` (e.g., `/staff/student/form-uuid`)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                               [Logout] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 No Dues Request Details                                 │
│                                                             │
│  Student Information                                        │
│  ├─ Name: John Doe                                         │
│  ├─ Registration No: 2021A1234                             │
│  ├─ Course: B.Tech Computer Science                        │
│  ├─ Branch: Computer Science                               │
│  ├─ Session: 2021-2025                                     │
│  ├─ Contact: 9876543210                                    │
│  └─ Submitted: Jan 15, 2024 10:30 AM                       │
│                                                             │
│  Department Status (Your Department: Library)              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Current Status: ⏳ PENDING                            │ │
│  │                                                       │ │
│  │ Action Options:                                       │ │
│  │                                                       │ │
│  │ ⦿ Approve (No dues pending)                          │ │
│  │ ○ Reject (Has outstanding dues)                      │ │
│  │                                                       │ │
│  │ Comments (Optional):                                  │ │
│  │ ┌─────────────────────────────────────────────────┐ │ │
│  │ │ All books returned, no fines                    │ │ │
│  │ └─────────────────────────────────────────────────┘ │ │
│  │                                                       │ │
│  │ If Rejecting, Reason (Required):                      │ │
│  │ ┌─────────────────────────────────────────────────┐ │ │
│  │ │ Outstanding fine of Rs. 500 for lost book      │ │ │
│  │ └─────────────────────────────────────────────────┘ │ │
│  │                                                       │ │
│  │         [SUBMIT DECISION]                             │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  All Department Statuses (View Only)                       │
│  ├─ ✅ IT Department - Approved (Jan 16)                  │
│  ├─ ⏳ Library - Pending (Your department)                │
│  ├─ ⏳ Hostel - Pending                                    │
│  ├─ ⏳ Mess - Pending                                      │
│  └─ ... (8 more departments)                               │
└─────────────────────────────────────────────────────────────┘
```

### **API Call When Staff Takes Action:**

```javascript
// POST /api/staff/action
{
  "form_id": "form-uuid",
  "department_name": "LIBRARY",
  "action": "approve",  // or "reject"
  "comments": "All books returned, no fines",
  "rejection_reason": null  // or reason if rejecting
}

// Backend Process:
1. Verify user is logged in
2. Verify user is staff of this department OR admin
3. Verify status is currently 'pending'
4. Update no_dues_status table:
   - Set status to 'approved' or 'rejected'
   - Set action_by_user_id
   - Set action_at timestamp
   - Save comments/rejection_reason
5. Trigger updates form status automatically
6. Create audit log entry
7. Send email to student (status update)

// Response:
{
  "success": true,
  "message": "Request approved successfully",
  "form_status": "in_progress"  // overall form status
}
```

---

## 👨‍💼 Admin Dashboard

**URL**: `/staff/dashboard` (same as department staff)

### **Dashboard UI for Admin:**

```
┌─────────────────────────────────────────────────────────────┐
│  JECRC No Dues System           Welcome, Dr. Sharma (Admin) │
│  System Administrator                            [Logout]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 System-Wide Statistics                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Total: 245   │ │ Pending: 87  │ │ Approved: 145│       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│  ┌──────────────┐ ┌──────────────┐                        │
│  │ Progress: 32 │ │ Rejected: 13 │                        │
│  └──────────────┘ └──────────────┘                        │
│                                                             │
│  🔍 Search: [________________]                              │
│  Filter: [All Departments ▼] [All Status ▼] [Date Range]  │
│                                                             │
│  📋 All Requests (All Departments)                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Reg No    │ Name    │ Course │ Pending │ Approved │→│ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ 2021A1234 │ John    │ BTech  │ 8/12    │ 4/12     │→│ │
│  │ 2021A5678 │ Jane    │ BTech  │ 2/12    │ 10/12    │→│ │
│  │ 2021A9012 │ Ram     │ BBA    │ 12/12   │ 0/12     │→│ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Department Performance                                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Library:     90% processed | Avg: 2.3 days            │ │
│  │ IT Dept:     95% processed | Avg: 1.8 days            │ │
│  │ Hostel:      75% processed | Avg: 4.1 days            │ │
│  │ Mess:        85% processed | Avg: 2.9 days            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [Export Report] [Download Excel]                          │
└─────────────────────────────────────────────────────────────┘
```

### **Admin Can View/Process Any Department:**

When admin clicks on a request:
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                               [Logout] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 No Dues Request Details (Admin View)                    │
│                                                             │
│  [Same student information as department view]             │
│                                                             │
│  All Department Statuses (Admin Can Modify Any)            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 1. School (HOD)      ✅ Approved  (Jan 15, 10:30 AM)  │ │
│  │ 2. Library           ⏳ Pending   [Approve] [Reject]  │ │
│  │ 3. IT Department     ✅ Approved  (Jan 16, 02:15 PM)  │ │
│  │ 4. Hostel            ⏳ Pending   [Approve] [Reject]  │ │
│  │ 5. Mess              ⏳ Pending   [Approve] [Reject]  │ │
│  │ 6. Canteen           ⏳ Pending   [Approve] [Reject]  │ │
│  │ 7. TPO               ✅ Approved  (Jan 16, 03:45 PM)  │ │
│  │ 8. Alumni            ⏳ Pending   [Approve] [Reject]  │ │
│  │ 9. Accounts          ⏳ Pending   [Approve] [Reject]  │ │
│  │ 10. Exam Cell        ⏳ Pending   [Approve] [Reject]  │ │
│  │ 11. Sports           ✅ Approved  (Jan 17, 11:20 AM)  │ │
│  │ 12. Transport        ⏳ Pending   [Approve] [Reject]  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Audit Trail                                                │
│  ├─ Jan 15, 10:30 AM - Form submitted by student          │
│  ├─ Jan 15, 10:31 AM - School approved by Dr. Singh       │
│  ├─ Jan 16, 02:15 PM - IT Dept approved by Tech Admin     │
│  └─ Jan 16, 03:45 PM - TPO approved by Placement Officer  │
└─────────────────────────────────────────────────────────────┘
```

**Admin Privileges:**
- Can approve/reject for ANY department
- Can override department decisions (if needed)
- Can see complete audit trail
- Can export reports
- Can see system-wide statistics

---

## 🔄 Complete Workflow Example

### **Scenario**: Student submits form → All departments process → Certificate generated

```
┌─────────────────────────────────────────────────────────────┐
│                    TIMELINE                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Day 1, 10:00 AM - Student submits form (Reg: 2021A1234)    │
│   ↓                                                         │
│   ├─ Form created in database                              │
│   ├─ 12 department statuses created (all pending)          │
│   ├─ Emails sent to all 12 department staff                │
│   └─ Email sent to admin                                   │
│                                                             │
│ Day 1, 11:00 AM - Library staff logs in                    │
│   ↓                                                         │
│   ├─ Sees notification: 1 pending request                  │
│   ├─ Clicks to view request                                │
│   ├─ Checks records: No dues                               │
│   ├─ Clicks "Approve"                                      │
│   └─ Form status: pending → in_progress                   │
│   └─ Email sent to student: Library approved               │
│                                                             │
│ Day 1, 02:00 PM - IT Department staff logs in              │
│   ↓                                                         │
│   ├─ Approves request                                      │
│   └─ Email sent to student: IT Dept approved               │
│                                                             │
│ Day 2, 09:00 AM - Hostel staff logs in                     │
│   ↓                                                         │
│   ├─ Checks records: Outstanding dues Rs. 500             │
│   ├─ Clicks "Reject"                                       │
│   ├─ Reason: "Outstanding hostel dues of Rs. 500"         │
│   └─ Form status: in_progress → rejected                  │
│   └─ Email sent to student: Request rejected by Hostel    │
│                                                             │
│ Day 2, 10:00 AM - Student sees rejection                   │
│   ↓                                                         │
│   ├─ Checks status on website                              │
│   ├─ Sees: Hostel rejected with reason                    │
│   ├─ Pays hostel dues                                      │
│   └─ Contacts hostel to reconsider                        │
│                                                             │
│ Day 2, 03:00 PM - Admin intervenes                         │
│   ↓                                                         │
│   ├─ Logs in, sees rejected request                        │
│   ├─ Contacts hostel, confirms payment                    │
│   ├─ Manually approves hostel status (admin override)     │
│   └─ Form status: rejected → in_progress                  │
│                                                             │
│ Day 3 - Remaining 9 departments approve                    │
│   ↓                                                         │
│   ├─ Each department processes and approves                │
│   └─ Emails sent to student for each approval              │
│                                                             │
│ Day 3, 5:00 PM - All 12 departments approved               │
│   ↓                                                         │
│   ├─ Trigger detects: all approved                         │
│   ├─ Form status: in_progress → completed                 │
│   ├─ Certificate auto-generated (PDF)                     │
│   └─ Final email to student with certificate link         │
│                                                             │
│ Student downloads certificate - Process complete! ✅        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Mobile Responsiveness

### **Department Dashboard on Mobile:**

```
┌─────────────────────┐
│ ☰  Library Dept    │
│    Ramesh Kumar    │
├─────────────────────┤
│ 📊 Statistics       │
│ ┌─────┐ ┌─────┐   │
│ │Total│ │Pend │   │
│ │ 45  │ │ 12  │   │
│ └─────┘ └─────┘   │
│                    │
│ 🔍 [Search...]     │
│                    │
│ 📋 Pending (12)    │
│ ┌────────────────┐ │
│ │ 2021A1234     │ │
│ │ John Doe      │ │
│ │ B.Tech CS     │ │
│ │ Jan 15        │ │
│ │    [View →]   │ │
│ ├────────────────┤ │
│ │ 2021A5678     │ │
│ │ Jane Smith    │ │
│ │ B.Tech EC     │ │
│ │ Jan 16        │ │
│ │    [View →]   │ │
│ └────────────────┘ │
│                    │
│ [Logout]           │
└─────────────────────┘
```

---

## 🔔 Notification System

### **Email Notifications Sent:**

1. **To Department Staff**:
   - ✉️ New form submitted
   - ✉️ Daily digest of pending requests
   - ✉️ Reminder for overdue requests (3 days)

2. **To Admin**:
   - ✉️ New form submitted
   - ✉️ Daily summary report
   - ✉️ Alerts for rejected requests
   - ✉️ Weekly performance report

3. **To Students**:
   - ✉️ Form submitted confirmation
   - ✉️ Department approved notification
   - ✉️ Department rejected notification (with reason)
   - ✉️ All approved - certificate ready
   - ✉️ Overall rejection notification

### **Sample Email Frequencies:**

```
Immediate:
- Form submission → All departments
- Status change → Student + Admin

Daily (8:00 AM):
- Pending requests digest → Each department staff
- System summary → Admin

Weekly (Monday 9:00 AM):
- Performance report → Admin
- Overdue requests → Department staff

Monthly:
- Complete system report → Admin + Management
```

---

## 🛠️ Technical Implementation

### **Frontend Components Needed:**

```
src/app/staff/
├── login/page.js              # Staff login page
└── dashboard/page.js          # Unified dashboard (dept + admin)
    └── student/[id]/page.js   # Request detail page

src/components/staff/
├── StaffDashboard.jsx         # Main dashboard component
├── RequestList.jsx            # List of requests
├── RequestDetail.jsx          # Single request view
├── ApproveRejectForm.jsx      # Action form
├── StatsCards.jsx             # Statistics display
└── DepartmentStatusList.jsx   # All dept statuses
```

### **API Endpoints:**

```
POST /api/staff/login
GET  /api/staff/dashboard?userId={id}
GET  /api/staff/request/{formId}
POST /api/staff/action
GET  /api/staff/stats
POST /api/staff/logout
```

---

## ✅ Implementation Checklist

### **Account Management:**
- [ ] Super admin SQL scripts for account creation
- [ ] Password reset functionality (admin-initiated)
- [ ] Email validation
- [ ] Role verification

### **Login System:**
- [ ] Staff login page at `/staff/login`
- [ ] Role-based authentication
- [ ] Session management
- [ ] Remember me functionality
- [ ] Logout functionality

### **Email Notifications:**
- [ ] Form submission emails
- [ ] Status update emails
- [ ] Daily digest emails
- [ ] Reminder emails
- [ ] Email templates designed
- [ ] Email sending configured (Resend)

### **Department Dashboard:**
- [ ] Statistics cards
- [ ] Request list with pagination
- [ ] Search functionality
- [ ] Filter by status
- [ ] Mobile responsive design

### **Request Processing:**
- [ ] View request details
- [ ] Approve/Reject form
- [ ] Comments field
- [ ] Rejection reason field
- [ ] Real-time status updates

### **Admin Features:**
- [ ] View all departments
- [ ] System-wide statistics
- [ ] Performance metrics
- [ ] Department override capability
- [ ] Report generation
- [ ] User management (future)

---

## 📊 Dashboard Wireframes Summary

**Department Staff Dashboard:**
- Limited to their department
- Shows: Total, Pending, Approved counts
- List of pending requests
- Can only approve/reject their dept

**Admin Dashboard:**
- Full system access
- Shows: All stats, all departments
- List of all requests
- Can approve/reject any dept
- Extra features: Reports, Analytics

**Same UI, Different Data!**
- Both use `/staff/dashboard`
- Backend filters data by role
- Clean, consistent experience

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-19  
**Status**: Ready for Implementation  

---

**END OF DEPARTMENT & ADMIN WORKFLOW GUIDE**