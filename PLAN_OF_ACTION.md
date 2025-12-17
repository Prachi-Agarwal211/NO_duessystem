# Plan of Action - JECRC No Dues System Fixes

## Priority 1: Critical Email System Fix

### 1.1 Update Email Service to Use Resend (Complete Integration)
**Files to modify**: `src/lib/emailService.js`
**Action**: Replace Nodemailer implementation with Resend implementation

```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Replace the sendEmail function with Resend implementation
export async function sendEmail({ to, subject, html, text, metadata = {} }) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject,
      html,
      text
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Email sent successfully - ID: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Email service error:', error);
    return { success: false, error: error.message };
  }
}
```

### 1.2 Update Email Queue System (If Resend is used for queue)
**Files to modify**: `src/lib/emailService.js`
**Action**: Update queue system to store Resend-compatible data

## Priority 2: Create Test Accounts

### 2.1 Create Admin Account
**Command to run**: `node scripts/create-admin-account.js`
**Test Credentials**: 
- Email: `admin@jecrcu.edu.in`
- Password: `Admin@2025`

### 2.2 Create Department Staff Accounts
**Command to run**: `node scripts/create-department-staff.js`
**Or run specific department scripts**:
- `node scripts/create-all-hod-accounts.js`
- `node scripts/update-existing-staff-accounts.js`

### 2.3 Verify Account Creation
**Action**: Check that accounts exist in both:
- `auth.users` table
- `profiles` table

## Priority 3: Database and Configuration Verification

### 3.1 Run Database Setup
**Command**: `node scripts/setup-database.js` (if needed)
**Or manually**: Run `ULTIMATE_DATABASE_SETUP.sql` in Supabase SQL Editor

### 3.2 Verify Department Configuration
**Action**: Check that departments exist in the `departments` table:
- Library
- IT Department  
- Mess
- Hostel
- Alumni
- Registrar
- Canteen
- TPO
- Accounts
- Science Department

## Priority 4: Environment Configuration

### 4.1 Update Environment Variables
**Current `.env.local` should include**:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_secure_secret

# Resend (already configured)
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=JECRC No Dues <onboarding@resend.dev>

# Application URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Priority 5: Testing the System

### 5.1 Test Email Functionality
**Action**: Run `node scripts/test-email-service.js` to verify Resend works

### 5.2 Test Form Submission
**Steps**:
1. Go to `/student/submit-form`
2. Submit a test application
3. Verify form appears in database
4. Check if departments receive notification emails

### 5.3 Test Department Workflow
**Action**:
1. Login as department staff
2. Check if forms appear in dashboard
3. Test approve/reject functionality
4. Verify status updates work correctly

### 5.4 Test Manual Entry
**Action**:
1. Go to `/student/manual-entry`
2. Submit a test manual entry
3. Verify admin receives notification

## Priority 6: Additional System Checks

### 6.1 Verify Configuration Data
**Action**: Run `scripts/check-database-config.js` to ensure:
- Schools exist in `config_schools`
- Courses exist in `config_courses`  
- Branches exist in `config_branches`
- Validation rules exist in `config_validation_rules`

### 6.2 Run Complete System Test
**Command**: `node scripts/test-all-features.js`

### 6.3 Verify Real-time Functionality
**Action**: Test `scripts/verify-realtime-setup.js`

## Implementation Order

1. **Fix email service** (Most critical - prevents form completion)
2. **Create accounts** (Prevents staff from logging in)
3. **Verify database** (Ensures data integrity)
4. **Test complete workflow** (Validates fixes)
5. **Deploy and monitor** (Ensure production stability)

## Expected Outcomes After Fixes

- [ ] Students can successfully submit no-dues forms
- [ ] Department staff receive email notifications about new forms
- [ ] Department staff can login and process forms
- [ ] Students receive status update notifications
- [ ] Manual entry system works properly
- [ ] Certificate generation functions correctly
- [ ] All 10 departments can participate in approval workflow