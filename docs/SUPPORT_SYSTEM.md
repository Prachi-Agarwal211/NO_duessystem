# 🎯 Support Ticket System - Complete Implementation Guide

## 📋 Overview

A comprehensive support ticket system has been implemented for the JECRC No Dues System. This allows both **students** and **department staff** to submit support requests, which are then managed by administrators through a dedicated admin dashboard.

---

## 🚀 Features Implemented

### ✅ 1. **Database Schema**
- Complete support tickets table with auto-generated ticket numbers
- Separate handling for students (requires roll number) and department staff
- Status tracking (open, in_progress, resolved, closed)
- Priority levels (low, normal, high, urgent)
- Admin notes and resolution tracking
- Row Level Security (RLS) policies for secure access

### ✅ 2. **Public Submission System**
- **Floating Support Button** on the landing page (bottom-right corner)
- Beautiful animated modal for submitting support requests
- Dynamic form that changes based on requester type:
  - **Students**: Email + Roll Number + Message
  - **Department Staff**: Email + Message
- Real-time validation and user feedback
- Success confirmation with ticket number

### ✅ 3. **Admin Management Dashboard**
- New "Support" tab in admin dashboard
- Comprehensive statistics cards (Open, In Progress, Resolved, Total)
- Advanced filtering:
  - By status (open, in_progress, resolved, closed)
  - By requester type (student, department)
  - By priority (low, normal, high, urgent)
  - By search term (ticket number, email, roll number, message)
- Detailed ticket view modal with:
  - Full ticket information
  - Status and priority modification
  - Admin notes field
  - Update functionality
- Pagination for large datasets
- Real-time updates

### ✅ 4. **API Endpoints**
- **POST `/api/support/submit`** - Public endpoint for ticket submission
- **GET `/api/support`** - Admin-only endpoint for fetching tickets
- **PATCH `/api/support`** - Admin-only endpoint for updating tickets

---

## 📦 Installation Steps

### Step 1: Run Database Schema

Execute the SQL schema to create the support tickets system:

```bash
# In Supabase SQL Editor, run:
```

```sql
-- Copy and paste the entire content from SUPPORT_SYSTEM_SCHEMA.sql
```

Or use the Supabase CLI:

```bash
supabase db push
```

### Step 2: Verify Database Tables

Check that the following were created:

1. **Table**: `support_tickets`
2. **View**: `support_tickets_stats`
3. **Functions**: 
   - `generate_ticket_number()`
   - `set_ticket_number()`
   - `update_support_ticket_timestamp()`
4. **Triggers**:
   - `trigger_set_ticket_number`
   - `trigger_update_support_ticket_timestamp`
5. **RLS Policies**: (5 policies for secure access)

### Step 3: Deploy Application

The code is already integrated. Simply deploy:

```bash
# Build and deploy
npm run build
vercel --prod

# Or for local testing
npm run dev
```

---

## 🎨 User Interface

### Landing Page
- **Floating Support Button**: 
  - Located at bottom-right corner
  - Red circular button with headphones icon
  - Animated pulse effect
  - Green status indicator

### Support Modal
- **Beautiful Design**:
  - Glass morphism effect
  - Smooth animations
  - Theme-aware (dark/light mode)
- **Smart Form**:
  - Toggle between Student/Department Staff
  - Dynamic field rendering
  - Real-time validation
  - Character counter for messages
- **Success State**:
  - Displays generated ticket number
  - Auto-closes after 5 seconds
  - Clear confirmation message

### Admin Dashboard
- **New "Support" Tab**:
  - Added next to Manual Entries tab
  - Headphones icon for easy identification
- **Statistics Cards**:
  - Open Tickets (blue)
  - In Progress (yellow)
  - Resolved (green)
  - Total (purple)
- **Filters Bar**:
  - Search by ticket#, email, roll number, or message
  - Status dropdown
  - Requester type dropdown
  - Priority dropdown
- **Tickets Table**:
  - Ticket number
  - Requester type (icon + label)
  - Contact info (email + roll number)
  - Subject
  - Status badge (color-coded)
  - Priority badge (with urgent animation)
  - Created date
  - Actions (view/edit button)
- **Detail Modal**:
  - Full ticket information
  - Edit status and priority
  - Add admin notes
  - Update button
  - Cancel button

---

## 🔒 Security Features

### Row Level Security (RLS)
1. **Public Submission**: Anyone can submit tickets (INSERT)
2. **User Access**: Users can view their own tickets (SELECT with email match)
3. **Admin Full Access**: Admins can view, update, and delete all tickets
4. **Service Role**: Full access for backend operations

### API Security
- Authentication required for admin endpoints
- Role verification (admin-only routes)
- Input validation and sanitization
- SQL injection prevention
- XSS protection

---

## 📊 Database Schema Details

### `support_tickets` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `ticket_number` | TEXT | Auto-generated (SUP-YYYYMMDD-XXXXX) |
| `email` | TEXT | Requester email |
| `roll_number` | TEXT | Student roll number (nullable) |
| `requester_type` | TEXT | 'student' or 'department' |
| `subject` | TEXT | Optional subject |
| `message` | TEXT | Support request message |
| `status` | TEXT | open/in_progress/resolved/closed |
| `priority` | TEXT | low/normal/high/urgent |
| `created_at` | TIMESTAMPTZ | Submission time |
| `updated_at` | TIMESTAMPTZ | Last update time |
| `resolved_at` | TIMESTAMPTZ | Resolution time |
| `resolved_by` | UUID | Admin who resolved |
| `admin_notes` | TEXT | Internal notes |

### `support_tickets_stats` View

Provides real-time statistics:
- Total tickets
- Count by status
- Count by requester type
- Count by priority
- Average resolution time

---

## 🧪 Testing Guide

### Test 1: Student Submission

1. Go to landing page
2. Click floating support button (bottom-right)
3. Select "Student"
4. Fill in:
   - Email: `test.student@jecrc.ac.in`
   - Roll Number: `21BCON123`
   - Subject: `Login Issue`
   - Message: `I cannot log in to the system. Getting error 401.`
5. Click "Submit Support Request"
6. Verify success message and ticket number (e.g., SUP-20251213-12345)

### Test 2: Department Submission

1. Click support button
2. Select "Department Staff"
3. Fill in:
   - Email: `dept.cse@jecrc.ac.in`
   - Message: `Need to update department contact information in the system.`
4. Submit and verify

### Test 3: Admin Dashboard

1. Log in as admin
2. Go to admin dashboard
3. Click "Support" tab
4. Verify statistics cards show correct counts
5. Test filters:
   - Search for ticket number
   - Filter by status
   - Filter by requester type
   - Filter by priority
6. Click "eye" icon on a ticket
7. In modal:
   - View ticket details
   - Change status to "in_progress"
   - Set priority to "high"
   - Add admin notes
   - Click "Update Ticket"
8. Verify ticket is updated

### Test 4: Validation

Try invalid submissions:
- Empty email → Should show error
- Invalid email format → Should show error
- Student without roll number → Should show error
- Message too short (< 10 chars) → Should show error
- Message too long (> 5000 chars) → Should show error

### Test 5: Pagination

1. Submit 25+ tickets
2. Verify pagination appears
3. Test "Next" and "Previous" buttons
4. Verify page numbers update correctly

---

## 🔧 Configuration

### Environment Variables Required

```env
# Already configured - no new variables needed
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Customization Options

#### Ticket Number Format
Edit in `SUPPORT_SYSTEM_SCHEMA.sql`:
```sql
-- Change 'SUP' prefix
new_ticket_number := 'HELP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || ...
```

#### Priority Levels
Add/modify in schema:
```sql
priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'critical'))
```

#### Support Button Position
Edit in `src/app/page.js`:
```jsx
// Change from bottom-right to bottom-left
className="fixed bottom-8 left-8 ..."
```

#### Support Button Style
Customize colors, size, animations in the button component

---

## 📈 Metrics & Analytics

### Available Statistics

From `support_tickets_stats` view:
- `total_tickets` - Total number of tickets
- `open_tickets` - Currently open tickets
- `in_progress_tickets` - Being worked on
- `resolved_tickets` - Resolved tickets
- `closed_tickets` - Closed tickets
- `student_tickets` - From students
- `department_tickets` - From departments
- `urgent_tickets` - Urgent priority
- `high_priority_tickets` - High priority
- `avg_resolution_time_hours` - Average time to resolve

### Query Examples

```sql
-- Get tickets by department email domain
SELECT * FROM support_tickets
WHERE email LIKE '%@dept.jecrc.%'
ORDER BY created_at DESC;

-- Get unresolved urgent tickets
SELECT * FROM support_tickets
WHERE status IN ('open', 'in_progress')
AND priority = 'urgent'
ORDER BY created_at ASC;

-- Get resolution performance
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_hours
FROM support_tickets
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🐛 Troubleshooting

### Issue: Support button not appearing

**Solution**: Clear browser cache and hard reload (Ctrl+Shift+R)

### Issue: "Failed to submit support request"

**Check**:
1. Supabase connection
2. RLS policies are enabled
3. Service role key is correct
4. Run schema again

### Issue: Admin cannot see tickets

**Check**:
1. User has 'admin' role in profiles table
2. Admin is logged in
3. RLS policies for admin are correct

### Issue: Ticket numbers not generating

**Check**:
1. Trigger is created: `trigger_set_ticket_number`
2. Function exists: `generate_ticket_number()`
3. Run schema again

### Issue: Statistics not updating

**Solution**: 
```sql
-- Refresh the view
DROP VIEW IF EXISTS support_tickets_stats;
-- Then recreate from schema
```

---

## 🔄 Future Enhancements

### Potential Features to Add

1. **Email Notifications**
   - Notify admins of new tickets
   - Notify users of status updates
   - Use existing email system

2. **Ticket Comments**
   - Allow back-and-forth conversation
   - Thread-like interface
   - File attachments

3. **Categories/Tags**
   - Categorize tickets (Technical, Account, Forms, etc.)
   - Tag system for better organization

4. **Assignment System**
   - Assign tickets to specific admins
   - Track workload distribution

5. **SLA Tracking**
   - Set response time goals
   - Alert on overdue tickets

6. **Public Status Page**
   - Allow users to check ticket status
   - Without logging in

7. **Analytics Dashboard**
   - Charts and graphs
   - Performance metrics
   - Trend analysis

---

## 📝 API Documentation

### Submit Support Ticket

**Endpoint**: `POST /api/support/submit`

**Access**: Public (no authentication required)

**Request Body**:
```json
{
  "email": "user@example.com",
  "rollNumber": "21BCON123",  // Optional, required for students
  "requesterType": "student",  // "student" or "department"
  "subject": "Issue Title",    // Optional
  "message": "Detailed description of the issue"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Support request submitted successfully",
  "ticket": {
    "ticketNumber": "SUP-20251213-12345",
    "email": "user@example.com",
    "requesterType": "student",
    "status": "open",
    "createdAt": "2025-12-13T10:30:00.000Z"
  }
}
```

### Get Support Tickets (Admin Only)

**Endpoint**: `GET /api/support`

**Access**: Admin only (requires authentication)

**Query Parameters**:
- `status` - Filter by status (open, in_progress, resolved, closed)
- `requester_type` - Filter by type (student, department)
- `priority` - Filter by priority (low, normal, high, urgent)
- `search` - Search in ticket#, email, roll number, message
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

**Response**:
```json
{
  "success": true,
  "tickets": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 123,
    "totalPages": 3
  },
  "stats": {
    "total_tickets": 123,
    "open_tickets": 45,
    ...
  }
}
```

### Update Support Ticket (Admin Only)

**Endpoint**: `PATCH /api/support`

**Access**: Admin only (requires authentication)

**Request Body**:
```json
{
  "ticketId": "uuid-here",
  "status": "in_progress",     // Optional
  "priority": "high",          // Optional
  "adminNotes": "Working on this issue"  // Optional
}
```

**Response**:
```json
{
  "success": true,
  "message": "Ticket updated successfully",
  "ticket": {
    ...updated ticket data...
  }
}
```

---

## ✅ Verification Checklist

Before going live, verify:

- [ ] Database schema executed successfully
- [ ] All tables and views created
- [ ] RLS policies enabled and working
- [ ] Support button visible on landing page
- [ ] Support modal opens and closes properly
- [ ] Student form requires roll number
- [ ] Department form doesn't show roll number field
- [ ] Form validation works correctly
- [ ] Ticket number is auto-generated
- [ ] Success message shows ticket number
- [ ] Admin can access Support tab
- [ ] Statistics cards show correct data
- [ ] All filters work correctly
- [ ] Search functionality works
- [ ] Pagination works (if > 20 tickets)
- [ ] Detail modal opens for each ticket
- [ ] Admin can update ticket status
- [ ] Admin can update priority
- [ ] Admin can add notes
- [ ] Updates are saved correctly
- [ ] No console errors in browser
- [ ] Mobile responsive design works
- [ ] Dark/light theme support works

---

## 🎉 Summary

The support ticket system is now **fully operational** with:

✅ **Public submission** via floating button  
✅ **Smart forms** for students and departments  
✅ **Admin dashboard** with comprehensive management  
✅ **Advanced filtering** and search  
✅ **Real-time statistics**  
✅ **Secure access control**  
✅ **Beautiful UI/UX** with animations  
✅ **Mobile responsive**  
✅ **Theme support** (dark/light)  

Students and department staff can now easily report issues, and administrators have a powerful interface to manage and resolve all support requests efficiently.

---

## 📞 Support

For questions or issues with the support system:
1. Check this documentation
2. Review the troubleshooting section
3. Check Supabase logs
4. Review browser console for errors
5. Contact the development team

---

**Last Updated**: December 13, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready