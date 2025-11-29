# Department Login Setup Guide

## Overview

The JECRC No Dues System now includes a complete Department Staff Management feature that allows administrators to create and manage department staff login accounts through an intuitive admin panel interface.

## Features

✅ **Complete CRUD Operations**
- Create new department staff accounts
- Edit existing staff members
- Delete staff accounts
- View all staff with filtering and search

✅ **Secure Authentication**
- Password-based login via Supabase Auth
- Role-based access control
- Email verification
- Secure password requirements (minimum 6 characters)

✅ **Department Assignment**
- Staff members are assigned to specific departments
- Only see requests for their assigned department
- Dropdown selection from active departments

✅ **Admin Management Interface**
- Easy-to-use tabbed interface in Admin Settings
- Search and filter capabilities
- Real-time updates
- Responsive design for mobile and desktop

## How to Access

### For Administrators

1. **Login to Admin Panel**
   - Navigate to `/staff/login`
   - Use your admin credentials

2. **Access Settings**
   - Click on "Settings" in the admin navigation
   - Or navigate to `/admin` and look for Settings

3. **Open Staff Management**
   - Click on the "👥 Staff Accounts" tab
   - You'll see a list of all department staff members

## Creating a Department Staff Account

### Step-by-Step Instructions

1. **Click "Add Staff Member" Button**
   - Located in the top-right corner of the Staff Accounts tab

2. **Fill in Required Information**
   - **Full Name**: Staff member's complete name (e.g., "John Doe")
   - **Email Address**: Official college email (e.g., "john.doe@jecrc.ac.in")
   - **Password**: Secure password (minimum 6 characters)
   - **Department**: Select from dropdown (e.g., "Library", "Accounts", "Hostel")

3. **Save the Account**
   - Click "Save" button
   - Account is created immediately
   - Staff member can now login

### Important Notes

- ✅ Email addresses must be unique
- ✅ Passwords are securely hashed and stored
- ✅ Email cannot be changed after account creation
- ✅ Only active departments appear in the dropdown

## Staff Login Process

### For Department Staff Members

1. **Navigate to Login Page**
   - Go to: `/staff/login`
   - Or click "Staff Login" from homepage

2. **Enter Credentials**
   - Email: Your assigned email address
   - Password: Password provided by admin

3. **Access Dashboard**
   - After successful login, redirected to `/staff/dashboard`
   - View pending requests for your department
   - Approve or reject requests

## Managing Existing Staff

### Edit Staff Member

1. Click **"Edit"** button next to staff member
2. Modify:
   - Full Name
   - Department Assignment
   - ⚠️ Email cannot be changed
3. Click **"Save"** to update

### Delete Staff Member

1. Click **"Delete"** button next to staff member
2. Confirm deletion in popup dialog
3. ⚠️ This action is **permanent** and immediately revokes access

### Search and Filter

- **Search**: Type name or email in search box
- **Filter by Department**: Select department from dropdown
- **View All**: Select "All Departments" to see everyone

## System Architecture

### Components Created

1. **API Endpoint**: `/api/admin/staff/route.js`
   - GET: Fetch all staff members
   - POST: Create new staff account
   - PUT: Update existing staff
   - DELETE: Remove staff account

2. **Custom Hook**: `useDepartmentStaff.js`
   - Manages staff state and operations
   - Handles API communication
   - Provides loading and error states

3. **UI Component**: `DepartmentStaffManager.jsx`
   - Complete staff management interface
   - Search and filter functionality
   - Add/Edit/Delete operations

4. **Integration**: Updated `AdminSettings.jsx`
   - Added "Staff Accounts" tab
   - Integrated with existing settings UI

### Database Schema

Staff accounts are stored in two tables:

**Supabase Auth (auth.users)**
```
- id (UUID)
- email (unique)
- encrypted_password
- email_confirmed_at
- user_metadata (role, full_name, department_name)
```

**Profiles Table (public.profiles)**
```
- id (UUID, FK to auth.users.id)
- full_name (text)
- email (text)
- role ('department')
- department_name (text, FK to config_departments.name)
- created_at (timestamp)
```

## Security Features

### Authentication
- ✅ Secure password hashing via Supabase
- ✅ JWT token-based sessions
- ✅ Automatic session management
- ✅ Protected API routes (admin-only)

### Authorization
- ✅ Role-based access control (RBAC)
- ✅ Middleware protection for routes
- ✅ Department-scoped data access
- ✅ Admin verification for all operations

### Data Protection
- ✅ Row-level security (RLS) policies
- ✅ Service role for admin operations
- ✅ Input validation and sanitization
- ✅ SQL injection prevention

## Workflow Integration

### How Staff Interact with the System

1. **Receive Email Notification**
   - When new request submitted
   - Contains approval/rejection links

2. **Click Email Link**
   - Redirected to `/department/action?token=xxx`
   - If not logged in → redirected to `/staff/login`

3. **Login and Approve/Reject**
   - Enter credentials
   - Returned to action page
   - Process approval or rejection

4. **Or Use Dashboard**
   - Navigate to `/staff/dashboard`
   - View all pending requests
   - Take action on any request

## Troubleshooting

### Common Issues

**Issue**: "Email already exists"
- **Solution**: Email is already registered. Use different email or delete existing account.

**Issue**: "Invalid department selected"
- **Solution**: Make sure department is active in Departments settings.

**Issue**: Staff member can't login
- **Solution**: 
  1. Verify email and password are correct
  2. Check account exists in Staff Accounts tab
  3. Ensure department is still active

**Issue**: Staff member sees no requests
- **Solution**:
  1. Check if department has any pending requests
  2. Verify staff member is assigned to correct department
  3. Check department is active in system

### API Errors

**401 Unauthorized**
- Not logged in or session expired
- Login again as admin

**403 Forbidden**
- Not an admin user
- Contact system administrator

**409 Conflict**
- Email already exists
- Use different email address

## Best Practices

### Password Management
- ✅ Use strong passwords (8+ characters recommended)
- ✅ Include mix of letters, numbers, symbols
- ✅ Don't share passwords
- ✅ Change passwords periodically

### Account Management
- ✅ Remove accounts for staff who leave
- ✅ Update department assignments promptly
- ✅ Regular audit of active accounts
- ✅ Keep contact information current

### Security
- ✅ Only create accounts for authorized staff
- ✅ Use official college email addresses
- ✅ Monitor account activity
- ✅ Report suspicious activity immediately

## Technical Details

### File Structure
```
src/
├── app/
│   ├── api/
│   │   └── admin/
│   │       └── staff/
│   │           └── route.js          # API endpoints
│   ├── staff/
│   │   └── login/
│   │       └── page.js                # Login page
│   └── department/
│       └── action/
│           └── page.js                # Email action handler
├── components/
│   └── admin/
│       └── settings/
│           ├── AdminSettings.jsx      # Main settings (updated)
│           └── DepartmentStaffManager.jsx  # Staff management UI
└── hooks/
    └── useDepartmentStaff.js          # Staff management hook
```

### API Endpoints

**GET /api/admin/staff**
- Fetches all department staff
- Optional query: `?department=LibraryName`
- Returns: Array of staff objects

**POST /api/admin/staff**
- Creates new staff account
- Body: `{ email, password, full_name, department_name }`
- Returns: Created staff object

**PUT /api/admin/staff**
- Updates existing staff
- Body: `{ id, full_name?, department_name? }`
- Returns: Updated staff object

**DELETE /api/admin/staff?id=xxx**
- Deletes staff account
- Query: `id` (staff member ID)
- Returns: Success message

## Support

For technical support or questions:
1. Check this documentation first
2. Review system logs for errors
3. Contact system administrator
4. Check Supabase dashboard for database issues

## Version History

- **v1.0.0** (2025-01-29): Initial release
  - Complete staff management system
  - Admin UI integration
  - Secure authentication
  - Department assignment

---

**Last Updated**: January 29, 2025
**System**: JECRC No Dues Management System
**Component**: Department Staff Login & Management