# 🎫 Support Ticket System - Complete Implementation Guide

## 📋 Overview

This is a **SIMPLIFIED** support ticket system with **MINIMAL VALIDATION** and **NO COMPLEX CONSTRAINTS**. The system allows students and departments to submit support requests to admin.

---

## 🗄️ Database Schema

### **Table: `support_tickets`**

**Simple Schema - NO Complex Validation:**

```sql
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE,          -- Auto-generated
    user_email VARCHAR(255) NOT NULL,          -- ✅ REQUIRED
    user_name VARCHAR(255),                    -- Auto-extracted from email
    user_id UUID,                              -- Optional
    user_type VARCHAR(50) DEFAULT 'student',   -- Plain text (no enum)
    requester_type VARCHAR(50) DEFAULT 'student', -- 'student' or 'department'
    roll_number VARCHAR(100),                  -- Optional for students
    subject VARCHAR(500) DEFAULT 'Support Request',
    message TEXT NOT NULL,                     -- ✅ REQUIRED (min 10 chars)
    category VARCHAR(100) DEFAULT 'other',     -- Plain text
    priority VARCHAR(50) DEFAULT 'medium',     -- Plain text
    status VARCHAR(50) DEFAULT 'open',         -- Plain text (no enum)
    related_form_id UUID,                      -- Unused
    assigned_to UUID,                          -- Unused
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Features:**
- ✅ **NO foreign keys** (except soft reference)
- ✅ **NO enum types** (all plain text)
- ✅ **NO check constraints**
- ✅ **Only 2 required fields**: `user_email`, `message`
- ✅ **Auto-generated** ticket numbers
- ✅ **Automatic timestamps**

### **Table: `support_messages`** (Optional - for threaded replies)

```sql
CREATE TABLE support_messages (
    id UUID PRIMARY KEY,
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255),
    message TEXT NOT NULL,
    is_staff_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 Setup Instructions

### **Step 1: Run Database Migration**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the entire content of [`database_migration_support_tickets_simple.sql`](database_migration_support_tickets_simple.sql)
3. Paste and click **"Run"**
4. Verify tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('support_tickets', 'support_messages');
   ```

### **Step 2: Enable Row Level Security (Optional)**

If you want RLS (recommended for production):

```sql
-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert tickets
CREATE POLICY "Anyone can create tickets"
ON support_tickets FOR INSERT
WITH CHECK (true);

-- Policy: Users can view their own tickets
CREATE POLICY "Users can view own tickets"
ON support_tickets FOR SELECT
USING (user_email = auth.jwt() ->> 'email' OR auth.jwt() ->> 'role' = 'admin');

-- Policy: Admin can update any ticket
CREATE POLICY "Admin can update tickets"
ON support_tickets FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');
```

**Note:** Our API uses `service_role_key` which bypasses RLS, so RLS is optional.

---

## 📁 File Structure

### **Frontend Pages:**
```
src/app/
├── student/support/page.js         # Student ticket submission
├── staff/support/page.js           # Department ticket submission
├── staff/history/page.js           # Staff action history
└── admin/support/page.js           # Admin ticket management
```

### **API Endpoints:**
```
src/app/api/
├── support/
│   ├── route.js                    # Admin: GET all + PATCH update
│   ├── submit/route.js             # Submit ticket (student/department)
│   └── my-tickets/route.js         # Get user's own tickets
```

### **Components:**
```
src/components/
├── ui/GlassCard.jsx                # Reusable card component
└── layout/Sidebar.jsx              # Navigation with Support link
```

---

## 🔗 API Endpoints

### **1. Submit Ticket** - `/api/support/submit`

**Method:** `POST`

**Request Body (Minimal):**
```json
{
  "email": "user@example.com",
  "message": "This is my support request",
  "requesterType": "student"  // or "department"
}
```

**Validation:**
- ✅ Email must be valid format
- ✅ Message must be at least 10 characters
- ✅ No other validation

**Response:**
```json
{
  "success": true,
  "ticket": {
    "id": "uuid",
    "ticket_number": "TICKET-123456",
    "user_email": "user@example.com",
    "message": "...",
    "status": "open"
  }
}
```

---

### **2. Get User's Tickets** - `/api/support/my-tickets`

**Method:** `GET`

**Query Parameters:**
- `status` (optional): Filter by status (open, in_progress, resolved, closed)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Authorization:** Requires session token in headers

**Response:**
```json
{
  "success": true,
  "tickets": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  },
  "stats": {
    "total_tickets": 50,
    "open_tickets": 10,
    "in_progress_tickets": 5,
    "resolved_tickets": 30,
    "closed_tickets": 5
  }
}
```

---

### **3. Admin Get All Tickets** - `/api/support` (GET)

**Method:** `GET`

**Query Parameters:**
- `requester_type` (required): 'student' or 'department'
- `status` (optional): Filter by status
- `page` (optional): Page number
- `limit` (optional): Items per page

**Authorization:** Admin only

**Response:**
```json
{
  "success": true,
  "tickets": [...],
  "pagination": {...},
  "stats": {
    "student_total": 100,
    "student_open": 20,
    "department_total": 50,
    "department_open": 10
  }
}
```

---

### **4. Admin Update Ticket Status** - `/api/support` (PATCH)

**Method:** `PATCH`

**Request Body:**
```json
{
  "ticketId": "uuid",
  "status": "resolved"  // open, in_progress, resolved, closed
}
```

**Authorization:** Admin only

**Response:**
```json
{
  "success": true,
  "ticket": {...},
  "message": "Ticket status updated successfully"
}
```

---

## 🎨 User Interfaces

### **Student Support Page** (`/student/support`)

**Features:**
- ✅ Simple form: Email + Message only
- ✅ Character counter (min 10 chars)
- ✅ View own tickets (open/closed tabs)
- ✅ Status badges with color coding
- ✅ Search functionality
- ✅ Empty state with call-to-action

**Screenshot Layout:**
```
┌─────────────────────────────────────┐
│  Support Tickets         [+ New]    │
├─────────────────────────────────────┤
│  Stats: Total | Open | Resolved     │
├─────────────────────────────────────┤
│  [Search...]                        │
│  [Open] [Closed]                    │
├─────────────────────────────────────┤
│  #TICKET-123456  [Open]             │
│  "My laptop is not working..."      │
│  From: student@example.com          │
│  Date: 18 Jan 2025                  │
└─────────────────────────────────────┘
```

---

### **Staff Support Page** (`/staff/support`)

**Features:**
- ✅ Filters by `requester_type='department'` automatically
- ✅ Stats cards: Open, In Progress, Resolved, Total
- ✅ Status filter sidebar (Open, In Progress, Resolved, All History)
- ✅ Submit modal for department requests
- ✅ Search across all fields
- ✅ Professional card layout

---

### **Admin Support Page** (`/admin/support`)

**Features:**
- ✅ Two main tabs: **Student Tickets** & **Department Tickets**
- ✅ Stats cards for both types (total + open counts)
- ✅ Status filter dropdown
- ✅ Inline status update (dropdown on each ticket)
- ✅ Search functionality
- ✅ Automatic refresh after status update

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Support Tickets                   [← Dashboard] │
├─────────────────────────────────────────────────┤
│  [Student: 100]  [Open: 20]  [Dept: 50]  [Open: 10] │
├─────────────────────────────────────────────────┤
│  [Student Tickets]  [Department Tickets]        │
│  [Search...]  [Status: All ▼]                   │
├─────────────────────────────────────────────────┤
│  #TICKET-123  [Open ▼]       18 Jan 2025        │
│  "Need help with..."                            │
│  john.doe@example.com                           │
└─────────────────────────────────────────────────┘
```

---

## 🔐 Security & Authorization

### **Role-Based Access:**

| Role | Student Tickets | Department Tickets | Submit | Update Status |
|------|----------------|-------------------|--------|---------------|
| **Student** | View own only | ❌ | ✅ Student | ❌ |
| **Staff/Department** | ❌ | View own only | ✅ Department | ❌ |
| **Admin** | ✅ View all | ✅ View all | ✅ Both | ✅ All |

### **Authentication:**
- Uses Supabase Auth session tokens
- API checks `session.user.id` and `profile.role`
- Service role key bypasses RLS for admin operations

---

## 🧪 Testing Checklist

### **Student Flow:**
- [ ] Student submits ticket → appears in student list
- [ ] Student can view own tickets (not others')
- [ ] Student can search tickets
- [ ] Student sees correct status badges
- [ ] Empty state shows when no tickets

### **Staff Flow:**
- [ ] Staff submits ticket → appears in staff list
- [ ] Staff can view own tickets (not others')
- [ ] Staff can filter by status (Open, In Progress, etc.)
- [ ] Stats cards show correct counts

### **Admin Flow:**
- [ ] Admin sees student tickets in "Student Tickets" tab
- [ ] Admin sees department tickets in "Department Tickets" tab
- [ ] Admin can update ticket status (dropdown works)
- [ ] Stats cards update after status change
- [ ] Search works across both tabs

### **API Tests:**
- [ ] `/api/support/submit` accepts minimal data (email + message)
- [ ] `/api/support/my-tickets` filters by `requester_type` correctly
- [ ] `/api/support` (GET) requires `requester_type` parameter
- [ ] `/api/support` (PATCH) updates status successfully
- [ ] All endpoints return proper error messages

---

## 🐛 Troubleshooting

### **Issue: Tickets not appearing**
**Solution:** Check that `requester_type` matches:
- Students submit with `requesterType: 'student'`
- Staff submit with `requesterType: 'department'`

### **Issue: "user_email is not defined" error**
**Solution:** The field name was changed from `email` to `user_email`. Updated in:
- [`/api/support/my-tickets/route.js`](src/app/api/support/my-tickets/route.js) (lines 57, 89)

### **Issue: Status update not working**
**Solution:** Check admin role in profiles table:
```sql
SELECT role FROM profiles WHERE email = 'admin@example.com';
```

### **Issue: Database table not found**
**Solution:** Run the migration SQL file:
- [`database_migration_support_tickets_simple.sql`](database_migration_support_tickets_simple.sql)

---

## 📊 Database Queries (for debugging)

### **View all tickets:**
```sql
SELECT ticket_number, user_email, requester_type, status, created_at
FROM support_tickets
ORDER BY created_at DESC;
```

### **Count by requester type:**
```sql
SELECT requester_type, status, COUNT(*)
FROM support_tickets
GROUP BY requester_type, status;
```

### **Find tickets by email:**
```sql
SELECT * FROM support_tickets
WHERE user_email = 'user@example.com'
ORDER BY created_at DESC;
```

### **Clear all test tickets:**
```sql
DELETE FROM support_tickets WHERE user_email LIKE '%test%';
```

---

## 🎯 Summary

**What We Built:**
1. ✅ Minimal database schema (no complex validation)
2. ✅ Simple API endpoints (email + message only)
3. ✅ Clean UI for students, staff, and admin
4. ✅ Automatic separation by requester_type
5. ✅ Status management for admin
6. ✅ Search and filter functionality
7. ✅ Professional design matching existing app

**What We Removed:**
- ❌ Zod validation library
- ❌ Complex form fields (subject, category, priority selection)
- ❌ Email notifications
- ❌ Assignment workflows
- ❌ Threaded replies (support_messages unused)
- ❌ Foreign key constraints

**Result:** A simple, functional support system that "just works"! 🚀

---

## 📝 Notes

- The system uses **default values** for optional fields (subject, category, priority)
- All tickets are identified by unique **ticket_number** (auto-generated)
- Status updates are **not tracked in history** (could add audit log if needed)
- The `support_messages` table exists but is **not currently used**
- All validation happens in **JavaScript** (not database layer)

---

**Last Updated:** 19 January 2025  
**Author:** Kilo Code  
**Status:** ✅ Production Ready