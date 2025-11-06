# Issue: Hardcoded Email Configurations and Inconsistencies

## Problem Description
Email addresses and configurations are hardcoded in the notification route instead of using environment variables consistently, creating maintenance and deployment issues.

## Current Implementation

### Hardcoded Email Addresses in `src/app/api/notify/route.js`
```javascript
const departmentEmails = {
  "School (HOD/Dean)": process.env.SCHOOL_EMAIL || "hod@jecrc.edu.in",
  "Library": process.env.LIBRARY_EMAIL || "15anuragsingh2003@gmail.com", // Test email
  "Hostel": process.env.HOSTEL_EMAIL || "hostel.warden@jecrc.edu.in",
  "Mess": process.env.MESS_EMAIL || "mess.manager@jecrc.edu.in",
  "Canteen": process.env.CANTEEN_EMAIL || "canteen@jecrc.edu.in",
  "TPO": process.env.TPO_EMAIL || "tpo@jecrc.edu.in",
  "Alumni Association": process.env.ALUMNI_EMAIL || "alumni@jecrc.edu.in",
  "Accounts Department": process.env.ACCOUNTS_EMAIL || "accounts@jecrc.edu.in",
  "DY. Registrar Office": process.env.REGISTRAR_EMAIL || "dyregistrar@jecrc.edu.in",
  "Examination Cell": process.env.EXAM_CELL_EMAIL || "examcell@jecrc.edu.in",
  "Sports Department": process.env.SPORTS_EMAIL || "sports@jecrc.edu.in",
};
```

## Issues Identified

1. **Mixed Configuration Approaches**:
   - Some emails use environment variables as fallback
   - Library email is hardcoded to a Gmail address (appears to be for testing)
   - Inconsistent fallback patterns

2. **Environment Variable Documentation Gap**:
   - Required environment variables not clearly documented
   - Mix of optional and required configurations

3. **Testing vs Production Confusion**:
   - Test email address mixed with production addresses
   - No clear separation between test and production configurations

4. **Department Name Mapping Issues**:
   - Keys use display names but database uses internal names
   - Potential mismatch between UI labels and email keys

## Impact Assessment

- **Deployability**: High - Missing environment variables break email functionality
- **Maintainability**: Medium - Hard to update email addresses across environments
- **Security**: Low - Test email in production code
- **Documentation**: High - Missing clear configuration requirements

## Environment Variables Analysis

### Currently Used in Notify Route:
- `SCHOOL_EMAIL`
- `LIBRARY_EMAIL`
- `HOSTEL_EMAIL`
- `MESS_EMAIL`
- `CANTEEN_EMAIL`
- `TPO_EMAIL`
- `ALUMNI_EMAIL`
- `ACCOUNTS_EMAIL`
- `REGISTRAR_EMAIL`
- `EXAM_CELL_EMAIL`
- `SPORTS_EMAIL`

### Documented in Schema (but not used):
The database schema includes all department names:
```sql
INSERT INTO public.departments (name, display_name, display_order) VALUES 
('SCHOOL_HOD', 'School (HOD/Dean)', 1),
('LIBRARY', 'Library', 2),
('IT_DEPARTMENT', 'IT Department', 3),
-- ... etc
```

### Missing Environment Variables:
Several departments don't have corresponding environment variables:
- `IT_DEPARTMENT_EMAIL`
- Other departments may be missing

## Recommended Solution

### Option 1: Comprehensive Environment Variable Configuration (Recommended)

#### Step 1: Create Complete Environment Variable Mapping
Update the department email mapping to use consistent environment variables:

```javascript
const departmentEmails = {
  "School (HOD/Dean)": process.env.SCHOOL_HOD_EMAIL || process.env.SCHOOL_EMAIL || "hod@jecrc.edu.in",
  "Library": process.env.LIBRARY_EMAIL || "library@jecrc.edu.in",
  "IT Department": process.env.IT_DEPARTMENT_EMAIL || "it@jecrc.edu.in",
  "Hostel": process.env.HOSTEL_EMAIL || "hostel@jecrc.edu.in",
  // ... map all departments
};
```

#### Step 2: Create Configuration Validation
Add startup validation for required email configurations:

```javascript
// lib/configValidation.js
export const validateEmailConfiguration = () => {
  const requiredEmails = [
    'SCHOOL_HOD_EMAIL',
    'LIBRARY_EMAIL',
    'IT_DEPARTMENT_EMAIL',
    // ... all required department emails
  ];

  const missing = requiredEmails.filter(envVar => !process.env[envVar]);

  if (missing.length > 0) {
    console.error('Missing required email environment variables:', missing);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required email configuration: ${missing.join(', ')}`);
    }
  }
};
```

#### Step 3: Update Documentation
Create comprehensive environment variable documentation:

```markdown
# Email Configuration

## Required Environment Variables

### Department Email Addresses
- `SCHOOL_HOD_EMAIL` - Email for School HOD/Dean
- `LIBRARY_EMAIL` - Email for Library department
- `IT_DEPARTMENT_EMAIL` - Email for IT department
- `HOSTEL_EMAIL` - Email for Hostel department
- `MESS_EMAIL` - Email for Mess department
- `CANTEEN_EMAIL` - Email for Canteen department
- `TPO_EMAIL` - Email for Training & Placement department
- `ALUMNI_EMAIL` - Email for Alumni Association department
- `ACCOUNTS_EMAIL` - Email for Accounts department
- `REGISTRAR_EMAIL` - Email for Registrar office
- `EXAM_CELL_EMAIL` - Email for Examination Cell department
- `SPORTS_EMAIL` - Email for Sports department

## Example Configuration

```env
# Department Emails
SCHOOL_HOD_EMAIL=hod@jecrc.edu.in
LIBRARY_EMAIL=library@jecrc.edu.in
IT_DEPARTMENT_EMAIL=it@jecrc.edu.in
HOSTEL_EMAIL=hostel@jecrc.edu.in
# ... etc
```
```

### Option 2: Database-Driven Configuration
Store department email addresses in the database:

1. **Add email field** to departments table
2. **Create admin interface** to manage department emails
3. **Remove hardcoded mapping** from notification route

### Option 3: Configuration Service
Create a centralized configuration service:

```javascript
// lib/departmentConfig.js
export const getDepartmentEmail = (departmentName) => {
  const emailMap = {
    'School (HOD/Dean)': process.env.SCHOOL_HOD_EMAIL,
    'Library': process.env.LIBRARY_EMAIL,
    // ... etc
  };

  return emailMap[departmentName] || 'noreply@jecrc.edu.in';
};
```

## Implementation Priority

### High Priority Fixes:
1. **Remove test email** from production code
2. **Add missing department emails** to environment variables
3. **Create configuration validation**

### Medium Priority Improvements:
1. **Create comprehensive documentation**
2. **Add startup validation**
3. **Implement graceful fallbacks**

## Files to Modify

### Primary Files:
- `src/app/api/notify/route.js` - Update email mapping
- `README.md` - Add environment variable documentation
- `src/lib/configValidation.js` - Add validation (new file)

### Environment Files:
- `.env.example` - Add all required email variables
- `.env.local` - Update with proper email addresses

## Testing Considerations

### Configuration Testing:
1. **Validate all environment variables** are present
2. **Test email delivery** for each department
3. **Verify error handling** when emails fail

### Deployment Checklist:
1. **Ensure all department emails** are configured
2. **Test email functionality** in staging environment
3. **Verify no hardcoded test emails** in production

## Priority
**High** - Email functionality is critical for the application workflow. Missing or incorrect email configurations will break the core functionality.