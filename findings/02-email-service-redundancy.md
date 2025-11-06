# Issue: Email Service Redundancy

## Problem Description
There are two separate email implementations in the codebase:

1. **Centralized Email Service**: `src/lib/emailService.js` - Well-structured service with React Email components
2. **Direct Email Implementation**: `src/app/api/notify/route.js` - Inline HTML email templates

## Code Duplication Details

### Email Service 1: `src/lib/emailService.js`
```javascript
import { render } from '@react-email/render';
import { NoDuesApprovalEmail } from '../components/emails/NoDuesApprovalEmail';
import { NoDuesSubmissionEmail } from '../components/emails/NoDuesSubmissionEmail';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendStatusUpdateNotification = async ({ email, studentName, action }) => {
  const emailComponent = NoDuesApprovalEmail({
    studentName,
    action,
    status: action === 'approved' ? 'approved' : 'requires changes',
    statusDescription: action === 'approved'
      ? 'has been approved'
      : 'has been returned for corrections'
  });

  const subject = `No Dues Status Update - ${studentName}`;

  return await sendEmail({
    to: email,
    subject,
    react: emailComponent
  });
};
```

### Email Service 2: `src/app/api/notify/route.js` (Lines 75-94)
```javascript
const html = `
  <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.6; background-color: #1a1a1a; color: #f0f0f0; padding: 20px; border-radius: 12px; max-width: 600px; margin: auto; border: 1px solid #333;">
    <h2 style="margin:0 0 12px; color: #fff;">No Dues Request Submitted</h2>
    <p style="margin:0 0 16px; color: #ccc;">A student has requested No Dues clearance. Please review and take action using the button below.</p>
    <table style="border-collapse:collapse; width: 100%; border: 1px solid #444; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <tbody>
        <tr><td style="padding:8px 12px;color:#aaa; border-bottom: 1px solid #444;">Student</td><td style="padding:8px 12px;font-weight:600; color: #fff; border-bottom: 1px solid #444;">${escapeHtml(student_name)}</td></tr>
        <tr><td style="padding:8px 12px;color:#aaa; border-bottom: 1px solid #444;">Registration No</td><td style="padding:8px 12px; color: #fff; border-bottom: 1px solid #444;">${escapeHtml(registration_no)}</td></tr>
        <tr><td style="padding:8px 12px;color:#aaa; border-bottom: 1px solid #444;">Contact No</td><td style="padding:8px 12px; color: #fff; border-bottom: 1px solid #444;">${escapeHtml(contact_no)}</td></tr>
        <tr><td style="padding:8px 12px;color:#aaa;">Department</td><td style="padding:8px 12px;font-weight:600; color: #fff;">${escapeHtml(department)}</td></tr>
      </tbody>
    </table>
    <a href="${actionUrl.toString()}" style="display: inline-block; background: #b22222; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 16px;">Review Request</a>
    <p style="margin-top: 16px; font-size: 12px; color: #888;">If the button doesn't work, copy and paste this URL into your browser:<br>${actionUrl.toString()}</p>
  </div>
`;
```

## Issues Identified

1. **Code Duplication**: Two different email sending mechanisms
2. **Inconsistent Email Templates**: 
   - Professional React Email components vs inline HTML strings
   - Different styling approaches (CSS-in-JS vs inline styles)
3. **Maintenance Overhead**: Email template changes need to be made in multiple places
4. **Feature Inconsistency**: 
   - JWT token generation duplicated
   - Different security implementations
5. **Testing Complexity**: Two different email systems to test

## Impact Assessment

- **Maintainability**: High - Email templates and logic scattered across multiple files
- **Consistency**: High - Different email appearances and functionality
- **Security**: Medium - JWT implementation duplicated with potential inconsistencies
- **Testing**: High - Multiple email systems require separate testing

## Current Usage Analysis

### Files Using `emailService.js`:
- Not currently used by any API routes (potential dead code)

### Files Using Direct Email Implementation:
- `src/app/api/notify/route.js` - Main notification system

## Recommended Solution

### Option 1: Consolidate to Use emailService.js (Recommended)
1. **Refactor `src/app/api/notify/route.js`** to use `emailService.js`
2. **Create React Email component** for department notifications
3. **Remove inline HTML** from notification route
4. **Standardize JWT implementation** in emailService.js

### Option 2: Enhance Direct Implementation
1. **Keep current approach** but improve the inline HTML templates
2. **Extract common email utilities** into shared functions
3. **Standardize styling** across all email templates

## Implementation Steps for Option 1

### Step 1: Create Department Notification Email Component
Create `src/components/emails/DepartmentNotificationEmail.jsx`:
```jsx
export const DepartmentNotificationEmail = ({ studentName, registrationNo, contactNo, department, actionUrl }) => {
  return (
    <div style={{ /* Professional styling */ }}>
      {/* Professional email template */}
    </div>
  );
};
```

### Step 2: Update emailService.js
Add department notification function:
```javascript
export const sendDepartmentNotification = async ({ email, studentName, registrationNo, contactNo, department, formId }) => {
  const token = await createSecureToken({ user_id: null, form_id: formId, department });
  const actionUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/department/action?token=${token}`;

  const emailComponent = DepartmentNotificationEmail({
    studentName,
    registrationNo,
    contactNo,
    department,
    actionUrl
  });

  return await sendEmail({
    to: email,
    subject: `No Dues Request - ${studentName}`,
    react: emailComponent
  });
};
```

### Step 3: Update Notification Route
Replace inline email logic with service call:
```javascript
import { sendDepartmentNotification } from '@/lib/emailService';

// Replace lines 75-94 with:
const result = await sendDepartmentNotification({
  email: toEmail,
  studentName: student_name,
  registrationNo: registration_no,
  contactNo: contact_no,
  department,
  formId
});
```

## Priority
**High** - This affects email functionality and user communication. Should be fixed before deployment to ensure consistent and maintainable email system.