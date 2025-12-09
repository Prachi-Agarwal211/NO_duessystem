# 📧 NOTIFICATION SYSTEM ARCHITECTURE EXPLAINED

## Your Question: Are Staff Account and Email Two Different Systems?

**Answer: NO - They are ONE UNIFIED SYSTEM** ✅

---

## How It Works

### **Single Source of Truth: `profiles` Table**

```
profiles table
├── id (staff user ID)
├── email (staff email address)
├── role ('staff')
├── department_name (which department)
├── school (scope: specific school or NULL for all)
├── course (scope: specific course or NULL for all)
└── branch (scope: specific branch or NULL for all)
```

### **Email Flow for All Notifications**

```
Student submits form
    ↓
System queries profiles table
    ↓
SELECT email FROM profiles 
WHERE role = 'staff' 
AND department_name = '[department]'
AND (school IS NULL OR school = '[student_school]')
AND (course IS NULL OR course = '[student_course]')
AND (branch IS NULL OR branch = '[student_branch]')
    ↓
Sends email to ALL matching staff members
```

---

## Real Implementation

### **File: [`src/lib/emailService.js`](src/lib/emailService.js:231)**

```javascript
// Lines 231-251: Unified notification function
async function notifyAllDepartments(formData) {
  const departments = [
    'Library', 'Hostel', 'Accounts', 'Exam Cell',
    'Training & Placement', 'Sports', 'Canteen',
    'Transport', 'Administration', 'Department', 'Security'
  ];

  for (const department of departments) {
    // Fetch staff emails by department with scope filtering
    const { data: staffMembers } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'staff')
      .eq('department_name', department)
      .or(`school.is.null,school.eq.${formData.school}`)
      .or(`course.is.null,course.eq.${formData.course}`)
      .or(`branch.is.null,branch.eq.${formData.branch}`);

    // Send email to all staff in this department
    await sendEmail({
      to: staffMembers.map(s => s.email),
      subject: `New No Dues Application - ${formData.registration_no}`,
      // ... email content
    });
  }
}
```

---

## Key Points

### ✅ **What Happens**
1. **Staff logs in** → System checks `profiles` table for their email and role
2. **Student submits form** → System queries `profiles` table for all staff emails in all 11 departments
3. **Email sent** → Goes to staff email from `profiles` table
4. **Staff takes action** → System identifies them by their `profiles.email`

### ✅ **No Separate Email System**
- NO environment variable emails (LIBRARY_EMAIL, HOSTEL_EMAIL, etc.)
- NO separate email configuration table
- NO manual email entry needed
- Everything uses `profiles.email`

### ✅ **Multiple Staff Per Department**
Yes! The system supports multiple staff members per department:
```sql
-- Example: 3 Library staff members
INSERT INTO profiles (email, role, department_name) VALUES
('library1@jecrc.ac.in', 'staff', 'Library'),
('library2@jecrc.ac.in', 'staff', 'Library'),
('library3@jecrc.ac.in', 'staff', 'Library');

-- All 3 will receive emails for Library department
```

### ✅ **Department Scope Filtering**
Staff can be restricted to specific schools/courses:
```sql
-- Hostel staff only for School of Engineering
UPDATE profiles 
SET school = 'School of Engineering'
WHERE email = 'hostel@jecrc.ac.in';

-- They will ONLY receive emails for SOE students
-- MBA students won't go to them
```

---

## Email Notification Triggers

### **1. Form Submission**
**File**: [`src/app/api/student/route.js`](src/app/api/student/route.js:361)
```javascript
// After form saved, notify all departments
await notifyAllDepartments(formData);
// ↓ Fetches staff emails from profiles table
// ↓ Sends to all 11 departments
```

### **2. Department Action (Approve/Reject)**
**File**: [`src/app/api/staff/action/route.js`](src/app/api/staff/action/route.js)
```javascript
// After staff approves/rejects
await sendEmail({
  to: formData.email, // Student's email
  subject: `Department ${action} - ${departmentName}`,
  // ...
});
```

### **3. Reapplication**
**File**: [`src/app/api/student/reapply/route.js`](src/app/api/student/reapply/route.js:285)
```javascript
// After student reapplies
await notifyAllDepartments(newFormData);
// ↓ Again fetches staff emails from profiles table
```

### **4. Completion**
```javascript
// When all departments approve
await sendEmail({
  to: student.email,
  subject: 'No Dues Certificate Ready',
  // ...
});
```

---

## How to Add New Staff

### **Method 1: Via Admin Dashboard**
1. Admin logs in
2. Goes to Settings → Staff Management
3. Adds new staff:
   - Email: `newstaff@jecrc.ac.in`
   - Department: `Library`
   - Scope: `All Schools` or specific school
4. Staff receives invitation email
5. Staff creates password
6. Done! They'll receive notifications automatically

### **Method 2: Via SQL**
```sql
-- 1. Create auth user
INSERT INTO auth.users (email, encrypted_password, ...)
VALUES ('newstaff@jecrc.ac.in', crypt('password', gen_salt('bf')), ...);

-- 2. Create profile (this is what matters for emails!)
INSERT INTO profiles (id, email, role, department_name, school)
VALUES 
  (auth_user_id, 'newstaff@jecrc.ac.in', 'staff', 'Library', NULL);
  -- NULL school means all schools

-- That's it! They'll receive emails now
```

---

## Testing the System

### **Verify Staff Emails**
```sql
-- See all staff and their departments
SELECT 
  email,
  department_name,
  school,
  course,
  branch
FROM profiles
WHERE role = 'staff'
ORDER BY department_name;
```

### **Test Email for Specific Department**
```javascript
// Query what the system will do
const { data } = await supabase
  .from('profiles')
  .select('email')
  .eq('role', 'staff')
  .eq('department_name', 'Library')
  .or('school.is.null,school.eq.School of Engineering');

console.log('These staff will receive email:', data);
// Output: [{ email: 'library@jecrc.ac.in' }, ...]
```

---

## Common Scenarios

### **Scenario 1: All Active Staff Must Receive Emails**
✅ **Automatic!** System sends to ALL staff in a department by default.

**How to ensure**:
```sql
-- Check all active staff
SELECT email, department_name, school, course, branch
FROM profiles
WHERE role = 'staff'
ORDER BY department_name;

-- If any staff is missing, add them:
INSERT INTO profiles (email, role, department_name)
VALUES ('missing@jecrc.ac.in', 'staff', 'Library');
```

### **Scenario 2: Staff Didn't Receive Email**
**Checklist**:
1. ✓ Is staff in `profiles` table?
2. ✓ Is `role` set to `'staff'`?
3. ✓ Is `department_name` correct?
4. ✓ Does staff's `school` scope match student's school?
5. ✓ Is email address valid?
6. ✓ Check spam folder

### **Scenario 3: Multiple Staff Per Department**
✅ **Supported!** All staff with same department receive emails.

**Example**:
```sql
-- 3 Library staff
INSERT INTO profiles (email, role, department_name) VALUES
('library.head@jecrc.ac.in', 'staff', 'Library'),
('library.assistant1@jecrc.ac.in', 'staff', 'Library'),
('library.assistant2@jecrc.ac.in', 'staff', 'Library');

-- When student submits form, ALL 3 receive email
-- Any one of them can approve/reject
```

### **Scenario 4: Temporary Deactivate Staff**
```sql
-- Option 1: Remove from profiles (lose history)
DELETE FROM profiles WHERE email = 'temp@jecrc.ac.in';

-- Option 2: Change role (keep history, stop emails)
UPDATE profiles 
SET role = 'inactive' 
WHERE email = 'temp@jecrc.ac.in';

-- Option 3: Change email to invalid (keep record)
UPDATE profiles 
SET email = 'DEACTIVATED_temp@jecrc.ac.in'
WHERE email = 'temp@jecrc.ac.in';
```

---

## Architecture Benefits

### ✅ **Advantages of Unified System**
1. **Single source of truth** - No email duplication or mismatch
2. **Easy management** - Add/remove staff in one place
3. **Scope filtering** - Restrict staff to specific schools/courses
4. **Multiple staff** - Support multiple people per department
5. **Audit trail** - All actions linked to staff email
6. **No configuration** - No need to set department emails separately

### ✅ **Scalability**
- Add 100 staff members? No problem!
- Add new departments? Just add staff with new department name
- Change staff assignments? Update one record
- Staff leaves? Deactivate one record

---

## Summary

### **ONE SYSTEM = Staff Account + Email**

```
Staff Account (profiles table)
    ↓
Contains Email Address
    ↓
Used for ALL Notifications
    ↓
No Separate Email System Needed
```

### **Flow Diagram**
```
Student Submits Form
    ↓
System Queries: SELECT email FROM profiles 
                WHERE role = 'staff' 
                AND department_name = 'Library'
    ↓
Gets: ['library1@jecrc.ac.in', 'library2@jecrc.ac.in']
    ↓
Sends Email to All Found Emails
    ↓
Staff Receives Email & Can Login with Same Email
    ↓
ONE UNIFIED SYSTEM ✅
```

---

## Quick Reference

| What | Where | How |
|------|-------|-----|
| **Staff Email Storage** | `profiles` table, `email` column | Single source |
| **Email Query** | `emailService.js` line 231 | Scope-filtered |
| **Send Notification** | `student/route.js` line 361 | All 11 departments |
| **Add Staff** | Admin dashboard or SQL | Auto-included in emails |
| **Multiple Staff** | Same `department_name` | All receive emails |
| **Scope Filter** | `school`, `course`, `branch` columns | Optional restriction |

---

**Conclusion**: There is **ONE unified system** where staff accounts in the `profiles` table automatically receive emails based on their department assignment and scope. No separate email configuration needed! 🎯