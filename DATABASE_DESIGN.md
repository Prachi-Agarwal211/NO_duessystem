# 🗄️ Database Design - JECRC No Dues System (Redesigned)

## 📋 Overview

This document details the complete database architecture for the redesigned JECRC No Dues System with **only 2 roles** (Department & Admin) and **no student authentication**.

---

## 🎯 Core Design Principles

1. **No Student Authentication**: Registration number is the unique identifier
2. **Only 2 Roles**: Department and Admin (no registrar, no student role)
3. **Simple & Efficient**: Minimal tables, maximum functionality
4. **Data Integrity**: Proper constraints and foreign keys
5. **Performance**: Strategic indexes for fast queries
6. **Audit Trail**: Complete tracking of all actions

---

## 📊 Database Schema

### **Table 1: `profiles`** (Staff/Admin Only)
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('department', 'admin')),
    department_name TEXT, -- Required for 'department' role, NULL for 'admin'
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT department_must_have_dept_name 
        CHECK (
            (role = 'department' AND department_name IS NOT NULL) OR 
            (role = 'admin' AND department_name IS NULL)
        )
);

-- Indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_department ON profiles(department_name) WHERE department_name IS NOT NULL;
```

**Purpose**: Store department staff and admin user data
**Key Points**:
- ❌ No student profiles (students don't need accounts)
- ✅ Only 2 roles: `department` and `admin`
- ✅ Department staff MUST have `department_name`
- ✅ Admin MUST NOT have `department_name` (full access)

---

### **Table 2: `departments`** (Reference Data)
```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- e.g., 'LIBRARY', 'IT_DEPARTMENT'
    display_name TEXT NOT NULL, -- e.g., 'Library', 'IT Department'
    display_order INT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert all departments
INSERT INTO departments (name, display_name, display_order) VALUES 
('SCHOOL_HOD', 'School (HOD/Dean)', 1),
('LIBRARY', 'Library', 2),
('IT_DEPARTMENT', 'IT Department', 3),
('HOSTEL', 'Hostel', 4),
('MESS', 'Mess', 5),
('CANTEEN', 'Canteen', 6),
('TPO', 'Training & Placement', 7),
('ALUMNI', 'Alumni Association', 8),
('ACCOUNTS', 'Accounts', 9),
('EXAM_CELL', 'Examination Cell', 10),
('SPORTS', 'Sports Department', 11),
('TRANSPORT', 'Transport', 12);
```

**Purpose**: Master list of all departments
**Key Points**:
- Fixed list of departments
- Used for validation and display
- `display_order` for consistent UI ordering

---

### **Table 3: `no_dues_forms`** (Student Applications)
```sql
CREATE TABLE no_dues_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Student Information (NO user_id - no authentication)
    student_name TEXT NOT NULL,
    registration_no TEXT NOT NULL, -- UNIQUE identifier for students
    session_from TEXT,
    session_to TEXT,
    parent_name TEXT,
    school TEXT DEFAULT 'Engineering',
    course TEXT,
    branch TEXT,
    contact_no TEXT,
    
    -- Form Details
    alumni_screenshot_url TEXT,
    certificate_url TEXT,
    
    -- Status Tracking
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'in_progress', 'completed', 'rejected')
    ),
    final_certificate_generated BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: One active form per registration number
    CONSTRAINT unique_active_registration UNIQUE (registration_no)
);

-- Indexes for performance
CREATE INDEX idx_forms_registration ON no_dues_forms(registration_no);
CREATE INDEX idx_forms_status ON no_dues_forms(status);
CREATE INDEX idx_forms_created_at ON no_dues_forms(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_forms_timestamp
    BEFORE UPDATE ON no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Purpose**: Store student no-dues applications
**Key Points**:
- ❌ No `user_id` (students don't have accounts)
- ✅ `registration_no` is the unique identifier
- ✅ Only ONE active form per registration number
- ✅ Can submit new form after previous is completed/rejected

**Status Flow**:
```
pending → in_progress → completed (all approved)
pending → in_progress → rejected (any department rejects)
```

---

### **Table 4: `no_dues_status`** (Department Approvals)
```sql
CREATE TABLE no_dues_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES no_dues_forms(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL REFERENCES departments(name),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected')
    ),
    
    -- Action Details
    action_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action_at TIMESTAMPTZ,
    rejection_reason TEXT,
    comments TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One status per department per form
    CONSTRAINT unique_form_department UNIQUE (form_id, department_name)
);

-- Indexes
CREATE INDEX idx_status_form_id ON no_dues_status(form_id);
CREATE INDEX idx_status_department ON no_dues_status(department_name);
CREATE INDEX idx_status_status ON no_dues_status(status);
CREATE INDEX idx_status_pending ON no_dues_status(form_id, status) WHERE status = 'pending';
```

**Purpose**: Track approval/rejection by each department
**Key Points**:
- One status record per department per form
- Automatically created when form is submitted (via trigger)
- Tracks who approved/rejected and when

---

### **Table 5: `audit_log`** (Complete Audit Trail)
```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Actor
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_role TEXT,
    user_name TEXT,
    
    -- Action Details
    action_type TEXT NOT NULL, -- 'form_submit', 'status_update', 'form_view', etc.
    action_details JSONB,
    
    -- Target
    table_name TEXT,
    record_id UUID,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_action_type ON audit_log(action_type);
CREATE INDEX idx_audit_record_id ON audit_log(record_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at DESC);
```

**Purpose**: Complete audit trail for compliance
**Key Points**:
- Records ALL actions (form submissions, approvals, rejections)
- Stores user context and IP address
- JSON field for flexible data storage

---

### **Table 6: `notifications`** (Email Tracking)
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES no_dues_forms(id) ON DELETE CASCADE,
    
    -- Recipient
    department_name TEXT,
    email_to TEXT NOT NULL,
    
    -- Email Details
    notification_type TEXT NOT NULL, -- 'form_submission', 'status_update', 'reminder'
    subject TEXT,
    
    -- Status
    email_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_form_id ON notifications(form_id);
CREATE INDEX idx_notifications_sent ON notifications(email_sent);
```

**Purpose**: Track email notifications
**Key Points**:
- Records all email attempts
- Tracks success/failure for debugging
- Can be used for retry logic

---

## 🔄 Database Triggers & Functions

### **Trigger 1: Auto-create Department Status Records**
```sql
CREATE OR REPLACE FUNCTION initialize_form_status_records()
RETURNS TRIGGER AS $$
BEGIN
    -- Create status record for each department when form is created
    INSERT INTO no_dues_status (form_id, department_name, status)
    SELECT NEW.id, name, 'pending'
    FROM departments
    WHERE is_active = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_form_status
    AFTER INSERT ON no_dues_forms
    FOR EACH ROW
    EXECUTE FUNCTION initialize_form_status_records();
```

**Purpose**: Automatically create status records for all departments when a form is submitted

---

### **Trigger 2: Update Form Status**
```sql
CREATE OR REPLACE FUNCTION update_form_status()
RETURNS TRIGGER AS $$
DECLARE
    total_depts INT;
    approved_count INT;
    rejected_count INT;
BEGIN
    -- Count total departments
    SELECT COUNT(*) INTO total_depts
    FROM no_dues_status
    WHERE form_id = NEW.form_id;
    
    -- Count approved departments
    SELECT COUNT(*) INTO approved_count
    FROM no_dues_status
    WHERE form_id = NEW.form_id AND status = 'approved';
    
    -- Count rejected departments
    SELECT COUNT(*) INTO rejected_count
    FROM no_dues_status
    WHERE form_id = NEW.form_id AND status = 'rejected';
    
    -- Update form status based on department statuses
    IF rejected_count > 0 THEN
        -- If any department rejects, form is rejected
        UPDATE no_dues_forms
        SET status = 'rejected', updated_at = NOW()
        WHERE id = NEW.form_id;
    ELSIF approved_count = total_depts THEN
        -- If all departments approve, form is completed
        UPDATE no_dues_forms
        SET status = 'completed', updated_at = NOW()
        WHERE id = NEW.form_id;
    ELSIF approved_count > 0 THEN
        -- If some approvals but not all, form is in progress
        UPDATE no_dues_forms
        SET status = 'in_progress', updated_at = NOW()
        WHERE id = NEW.form_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_form_status
    AFTER UPDATE ON no_dues_status
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_form_status();
```

**Purpose**: Automatically update form status when department statuses change

---

### **Function: Get Dashboard Stats**
```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats(user_role TEXT, dept_name TEXT DEFAULT NULL)
RETURNS TABLE (
    total_requests BIGINT,
    pending_requests BIGINT,
    approved_requests BIGINT,
    rejected_requests BIGINT,
    in_progress_requests BIGINT
) AS $$
BEGIN
    IF user_role = 'admin' THEN
        -- Admin sees all forms
        RETURN QUERY
        SELECT 
            COUNT(*)::BIGINT as total_requests,
            COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_requests,
            COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as approved_requests,
            COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_requests,
            COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT as in_progress_requests
        FROM no_dues_forms;
    ELSE
        -- Department sees only their department's requests
        RETURN QUERY
        SELECT 
            COUNT(DISTINCT s.form_id)::BIGINT as total_requests,
            COUNT(DISTINCT s.form_id) FILTER (WHERE s.status = 'pending')::BIGINT as pending_requests,
            COUNT(DISTINCT s.form_id) FILTER (WHERE s.status = 'approved')::BIGINT as approved_requests,
            COUNT(DISTINCT s.form_id) FILTER (WHERE s.status = 'rejected')::BIGINT as rejected_requests,
            0::BIGINT as in_progress_requests
        FROM no_dues_status s
        WHERE s.department_name = dept_name;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

**Purpose**: Get dashboard statistics based on user role

---

## 🔐 Row Level Security (RLS) Policies

### **Profiles Table**
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admin can view all profiles
CREATE POLICY "Admin can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );
```

---

### **No Dues Forms Table**
```sql
ALTER TABLE no_dues_forms ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (no authentication for students)
CREATE POLICY "Anyone can insert forms" ON no_dues_forms
    FOR INSERT WITH CHECK (true);

-- Anyone can view forms (for status checking)
CREATE POLICY "Anyone can view forms" ON no_dues_forms
    FOR SELECT USING (true);

-- Department staff can view all forms (for their work)
CREATE POLICY "Staff can view all forms" ON no_dues_forms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('department', 'admin')
        )
    );
```

---

### **No Dues Status Table**
```sql
ALTER TABLE no_dues_status ENABLE ROW LEVEL SECURITY;

-- Anyone can view status (for checking)
CREATE POLICY "Anyone can view status" ON no_dues_status
    FOR SELECT USING (true);

-- Department staff can update their department's status
CREATE POLICY "Department can update own status" ON no_dues_status
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.role = 'department'
            AND p.department_name = no_dues_status.department_name
        )
    );

-- Admin can update any status
CREATE POLICY "Admin can update any status" ON no_dues_status
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );
```

---

## 📈 Common Queries

### **Query 1: Check Form Status (Student)**
```sql
-- Student checks status using registration number
SELECT 
    f.id,
    f.student_name,
    f.registration_no,
    f.status as overall_status,
    f.created_at,
    json_agg(
        json_build_object(
            'department', d.display_name,
            'status', s.status,
            'action_at', s.action_at,
            'rejection_reason', s.rejection_reason
        ) ORDER BY d.display_order
    ) as department_statuses
FROM no_dues_forms f
JOIN no_dues_status s ON f.id = s.form_id
JOIN departments d ON s.department_name = d.name
WHERE f.registration_no = '2021A1234'
GROUP BY f.id;
```

---

### **Query 2: Department Dashboard**
```sql
-- Get all pending requests for a department
SELECT 
    f.id,
    f.student_name,
    f.registration_no,
    f.course,
    f.branch,
    f.created_at,
    s.status as dept_status
FROM no_dues_forms f
JOIN no_dues_status s ON f.id = s.form_id
WHERE s.department_name = 'LIBRARY'
AND s.status = 'pending'
ORDER BY f.created_at DESC;
```

---

### **Query 3: Admin Dashboard**
```sql
-- Get all forms with aggregated department status
SELECT 
    f.id,
    f.student_name,
    f.registration_no,
    f.status as overall_status,
    f.created_at,
    COUNT(s.id) as total_departments,
    COUNT(s.id) FILTER (WHERE s.status = 'approved') as approved_count,
    COUNT(s.id) FILTER (WHERE s.status = 'pending') as pending_count,
    COUNT(s.id) FILTER (WHERE s.status = 'rejected') as rejected_count
FROM no_dues_forms f
LEFT JOIN no_dues_status s ON f.id = s.form_id
GROUP BY f.id
ORDER BY f.created_at DESC;
```

---

### **Query 4: Submit New Form**
```sql
-- Insert new form (triggers will create department statuses automatically)
INSERT INTO no_dues_forms (
    student_name,
    registration_no,
    session_from,
    session_to,
    course,
    branch,
    contact_no
) VALUES (
    'John Doe',
    '2021A1234',
    '2021',
    '2025',
    'B.Tech',
    'Computer Science',
    '9876543210'
) RETURNING id;
```

---

### **Query 5: Approve/Reject Request**
```sql
-- Department approves a request
UPDATE no_dues_status
SET 
    status = 'approved',
    action_by_user_id = 'uuid-of-staff-member',
    action_at = NOW(),
    comments = 'All dues cleared'
WHERE form_id = 'form-uuid'
AND department_name = 'LIBRARY';

-- Department rejects a request
UPDATE no_dues_status
SET 
    status = 'rejected',
    action_by_user_id = 'uuid-of-staff-member',
    action_at = NOW(),
    rejection_reason = 'Outstanding library fine of Rs. 500'
WHERE form_id = 'form-uuid'
AND department_name = 'LIBRARY';
```

---

## 🔄 Data Flow Examples

### **Flow 1: Student Submits Form**
```
1. Student fills form on /no-dues-form
   ↓
2. Frontend calls: POST /api/student/submit-form
   {
     student_name: "John Doe",
     registration_no: "2021A1234",
     ...
   }
   ↓
3. Backend validates duplicate check:
   SELECT COUNT(*) FROM no_dues_forms 
   WHERE registration_no = '2021A1234'
   ↓
4. If unique, INSERT into no_dues_forms
   ↓
5. Trigger: initialize_form_status_records() fires
   ↓
6. Automatically creates 12 records in no_dues_status
   (one for each active department)
   ↓
7. Return success + form_id to student
```

---

### **Flow 2: Student Checks Status**
```
1. Student enters registration number on /check-status
   ↓
2. Frontend calls: POST /api/student/check-status
   { registration_no: "2021A1234" }
   ↓
3. Backend queries:
   - Get form details from no_dues_forms
   - Get all department statuses from no_dues_status
   ↓
4. Return aggregated data showing:
   - Overall form status
   - Each department's status
   - Approval/rejection dates
   - Rejection reasons (if any)
```

---

### **Flow 3: Department Approves Request**
```
1. Staff logs in at /staff/login
   ↓
2. System verifies:
   - User exists in profiles
   - Role is 'department' or 'admin'
   ↓
3. Dashboard shows pending requests:
   - Department staff: only their dept
   - Admin: all departments
   ↓
4. Staff clicks "Approve" on a request
   ↓
5. Frontend calls: PUT /api/staff/action
   {
     form_id: "uuid",
     action: "approve",
     department_name: "LIBRARY"
   }
   ↓
6. Backend validates:
   - User is staff of that department OR admin
   - Status is currently 'pending'
   ↓
7. UPDATE no_dues_status
   SET status = 'approved', ...
   ↓
8. Trigger: update_form_status() fires
   ↓
9. Checks if all departments approved:
   - If YES: Update form status to 'completed'
   - If NO: Update form status to 'in_progress'
   ↓
10. Create audit log entry
```

---

### **Flow 4: Admin Views All Requests**
```
1. Admin logs in at /staff/login
   ↓
2. System redirects to /staff/dashboard
   ↓
3. Backend checks: user role = 'admin'
   ↓
4. Dashboard queries:
   SELECT * FROM no_dues_forms
   (Admin sees ALL forms, not filtered by department)
   ↓
5. For each form, show aggregated status:
   - Total departments: 12
   - Approved: X
   - Pending: Y
   - Rejected: Z
   ↓
6. Admin can:
   - View any request details
   - Approve/reject on behalf of any department
   - Generate reports
```

---

## 🎯 Key Design Decisions

### **1. No Student Authentication**
**Decision**: Use `registration_no` as unique identifier instead of user accounts

**Reasoning**:
- ✅ Simpler for students (no signup/login)
- ✅ Faster form submission
- ✅ Less code to maintain
- ✅ Reduced security surface area
- ✅ Students only need to remember registration number

**Implementation**:
- `no_dues_forms` has NO `user_id` foreign key
- `registration_no` is the primary identifier
- Unique constraint on active forms per registration number

---

### **2. Only 2 Roles**
**Decision**: Department and Admin only

**Reasoning**:
- ✅ Simpler role management
- ✅ Clear separation of duties
- ✅ Less code complexity
- ✅ Easier testing

**Implementation**:
- `profiles.role` CHECK constraint: `('department', 'admin')`
- Department staff: Limited to their department
- Admin: Full system access

---

### **3. Automatic Status Creation**
**Decision**: Create all department statuses when form is submitted

**Reasoning**:
- ✅ Ensures all departments are notified
- ✅ No manual status creation needed
- ✅ Prevents missing departments
- ✅ Consistent data structure

**Implementation**:
- Trigger on `no_dues_forms` INSERT
- Creates 12 status records automatically
- All start as 'pending'

---

### **4. Automatic Form Status Updates**
**Decision**: Update form status based on department statuses

**Reasoning**:
- ✅ Single source of truth
- ✅ No manual status management
- ✅ Prevents inconsistencies
- ✅ Real-time status reflection

**Implementation**:
- Trigger on `no_dues_status` UPDATE
- Calculates: pending, in_progress, completed, rejected
- Updates `no_dues_forms.status` automatically

---

## 📊 Performance Considerations

### **Indexes Strategy**
```sql
-- High-frequency lookups
CREATE INDEX idx_forms_registration ON no_dues_forms(registration_no);
CREATE INDEX idx_status_form_id ON no_dues_status(form_id);
CREATE INDEX idx_status_department ON no_dues_status(department_name);

-- Dashboard queries
CREATE INDEX idx_status_pending ON no_dues_status(form_id, status) 
    WHERE status = 'pending';

-- Audit queries
CREATE INDEX idx_audit_created_at ON audit_log(created_at DESC);
```

### **Query Optimization**
- Use JOINs instead of subqueries where possible
- Leverage partial indexes for common filters
- Use JSONB aggregation for nested data
- Implement connection pooling

---

## 🔒 Security Measures

### **1. Row Level Security**
- All tables have RLS enabled
- Proper policies for each role
- Public read for status checking

### **2. Input Validation**
- CHECK constraints on enums
- Foreign key constraints
- Unique constraints where needed

### **3. Audit Trail**
- All actions logged
- IP address tracking
- User agent recording

### **4. Data Protection**
- No sensitive student data stored
- Only registration number + basic info
- Email addresses only for staff

---

## 🧪 Testing Scenarios

### **Scenario 1: Duplicate Form Prevention**
```sql
-- Should succeed
INSERT INTO no_dues_forms (student_name, registration_no) 
VALUES ('John', '2021A1234');

-- Should fail (duplicate registration_no)
INSERT INTO no_dues_forms (student_name, registration_no) 
VALUES ('Jane', '2021A1234');
```

### **Scenario 2: Status Flow**
```sql
-- Initially: status = 'pending'
-- After 1 approval: status = 'in_progress'
-- After all approvals: status = 'completed'
-- After 1 rejection: status = 'rejected'
```

### **Scenario 3: Role-Based Access**
```sql
-- Department staff can only see their department
-- Admin can see all departments
-- Both use same dashboard UI
```

---

## 📝 Migration Script

```sql
-- Complete migration from old to new schema

-- 1. Update role constraints
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_role;
ALTER TABLE profiles ADD CONSTRAINT check_role 
    CHECK (role IN ('department', 'admin'));

-- 2. Migrate registrar users to admin
UPDATE profiles SET role = 'admin', department_name = NULL 
WHERE role = 'registrar';

-- 3. Delete student profiles (not needed)
DELETE FROM profiles WHERE role = 'student';

-- 4. Make user_id nullable in forms
ALTER TABLE no_dues_forms ALTER COLUMN user_id DROP NOT NULL;

-- 5. Add unique constraint for registration numbers
CREATE UNIQUE INDEX idx_unique_active_registration 
ON no_dues_forms(registration_no);

-- 6. Add department constraint for profiles
ALTER TABLE profiles ADD CONSTRAINT department_must_have_dept_name 
    CHECK (
        (role = 'department' AND department_name IS NOT NULL) OR 
        (role = 'admin' AND department_name IS NULL)
    );
```

---

## ✅ Database Checklist

- [ ] All tables created with proper constraints
- [ ] All indexes created for performance
- [ ] All triggers created and tested
- [ ] All functions created and tested
- [ ] RLS policies enabled and tested
- [ ] Audit logging configured
- [ ] Backup strategy implemented
- [ ] Migration script tested
- [ ] Performance benchmarks met
- [ ] Security audit passed

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-19  
**Status**: Ready for Implementation  

---

**END OF DATABASE DESIGN**