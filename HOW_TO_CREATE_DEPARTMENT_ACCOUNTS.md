# How to Create Department Staff Accounts

## Overview
Department staff accounts are created through the Admin Settings panel. These accounts allow staff members to approve/reject student no-dues requests for their specific department.

## Steps to Create Department Accounts

### 1. Access Admin Settings
- Log in as admin
- Navigate to Admin Dashboard
- Click on "Settings" or "Admin Settings" tab
- Select "Department Staff" section

### 2. Add New Staff Member
- Click the "+ Add Staff Member" button
- Fill in the required information:

#### Required Fields:
- **Full Name**: Staff member's full name (e.g., "Dr. John Doe")
- **Email Address**: Any valid email (Gmail, Outlook, college email, etc.)
- **Password**: Minimum 6 characters (staff will use this to login)
- **Department**: Select from dropdown (HOD, Library, Hostel, etc.)

#### Optional Scope Fields (Leave empty for full access):
- **School Access**: Select specific schools or leave empty for ALL schools
- **Course Access**: Select specific courses or leave empty for ALL courses
- **Branch Access**: Select specific branches or leave empty for ALL branches

### 3. Examples

#### Example 1: Library Staff (Global Access)
```
Full Name: Library Manager
Email: library@jecrcu.edu.in
Password: library123
Department: Library
School Access: [Empty] → All Schools
Course Access: [Empty] → All Courses
Branch Access: [Empty] → All Branches
```
**Result**: Can see ALL students from all schools/courses/branches

#### Example 2: CSE HOD (Branch-Specific)
```
Full Name: Dr. CS Professor
Email: hod.cse@jecrcu.edu.in
Password: cse@hod123
Department: HOD
School Access: ☑ Engineering
Course Access: ☑ B.Tech
Branch Access: ☑ Computer Science
```
**Result**: Can ONLY see Engineering B.Tech CSE students

#### Example 3: Dean (School-Specific)
```
Full Name: Dean Engineering
Email: dean.engg@jecrcu.edu.in
Password: dean@engg123
Department: HOD
School Access: ☑ Engineering
Course Access: [Empty] → All Courses
Branch Access: [Empty] → All Branches
```
**Result**: Can see ALL students from Engineering school (all courses/branches)

### 4. Staff Login
Once created, staff members can:
- Visit `/staff/login` page
- Enter their email and password
- Access their dashboard to approve/reject requests

### 5. Managing Existing Staff
- **Edit**: Click "Edit" button to update name, department, or scope
- **Delete**: Click "Delete" button to permanently remove account
- **Search**: Use search bar to find staff by name or email
- **Filter**: Use department dropdown to filter by specific department

## Important Notes

✅ **Email cannot be changed** after account creation
✅ **Password is set only during creation** (no password change feature yet)
✅ Staff can only see requests for their assigned department
✅ Scope restrictions work as AND conditions (all selected filters must match)
✅ Empty scope = Full access to that dimension
✅ Deleting account immediately revokes access

## Troubleshooting

### Staff Cannot Login
- Verify email and password are correct
- Check if account is active in admin panel
- Ensure department is active in system

### Staff Cannot See Students
- Check scope restrictions (school, course, branch)
- Verify department is active
- Ensure students match the scope filters

### Cannot Create Account
- Check if email already exists
- Verify all required fields are filled
- Ensure valid email format
- Password must be at least 6 characters

## Current System Departments

The system has these pre-configured departments:
1. **HOD** (School-Specific) - Head of Department
2. **Library** (Global) - Library clearance
3. **Hostel** (Global) - Hostel clearance
4. **Accounts** (Global) - Financial clearance
5. **Exam Cell** (Global) - Examination clearance
6. **Admin** (Global) - Administrative clearance

*School-Specific departments only see students from their assigned school*
*Global departments see all students regardless of school*