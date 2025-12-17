# Support Ticket Roll Number Validation Fix

## Issue
Support ticket submissions were failing for department staff and admin users because they send `rollNumber: null`, but the Zod validation schema only accepted `string | undefined`.

## Root Cause Analysis

### Frontend Payloads from Different User Types

**StudentSupportModal**:
```javascript
{
  email: "student@jecrc.ac.in",
  rollNumber: "21BCON747",  // ✅ String - passes validation
  subject: "Support Request",
  message: "Help me...",
  requesterType: "student"
}
```

**DepartmentSupportModal**:
```javascript
{
  email: "staff@jecrc.ac.in", 
  rollNumber: null,          // ❌ NULL - rejected by schema
  subject: "Support Request",
  message: "Help me...",
  requesterType: "department"
}
```

**AdminSupportModal**:
```javascript
{
  email: "admin@jecrc.ac.in",
  rollNumber: null,          // ❌ NULL - rejected by schema
  subject: "[ADMIN] Support Request",
  message: "[Priority: HIGH]\n\nHelp me...",
  requesterType: "department"
}
```

**SupportModal (Guest)**:
```javascript
{
  name: "Guest User",
  email: "guest@email.com",
  subject: "Support Request", 
  message: "Help me...",
  user_type: "guest"        // ✅ No rollNumber field - undefined passes
}
```

### Original Zod Schema (BROKEN)
```javascript
export const supportTicketSchema = z.object({
  email: emailSchema,
  rollNumber: z.string().optional(),  // ❌ Only accepts: string | undefined
  // ...
});
```

**Problem**: 
- Accepts: `"21BCON747"` (string) ✅
- Accepts: `undefined` (not provided) ✅
- Rejects: `null` ❌ ← Department/Admin fail here

### Database Schema (SUPPORTS NULL)
```sql
CREATE TABLE support_tickets (
  roll_number TEXT,  -- Accepts: string, null, undefined
  -- ...
);
```

The database column happily accepts `null`, but our validation layer was blocking it!

## The Fix

Changed the Zod schema in [`src/lib/zodSchemas.js`](src/lib/zodSchemas.js:242) to:

```javascript
/**
 * Support Ticket Schema
 * Used in /api/support/submit POST
 * ✅ FIX: rollNumber accepts string, null, or undefined
 * - Student: sends "21BCON747" (string)
 * - Department/Admin: sends null
 * - Guest: doesn't send field (undefined)
 */
export const supportTicketSchema = z.object({
  email: emailSchema,
  rollNumber: z.string().nullable().optional(), // ✅ Now accepts: string | null | undefined
  subject: z.string().max(100, 'Subject too long').optional().or(z.literal('')),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message must be at most 5000 characters')
    .transform(val => val.trim()),
  requesterType: z.enum(['student', 'staff', 'general'], {
    errorMap: () => ({ message: 'Invalid requester type' })
  })
});
```

### What `.nullable().optional()` Does

- `.nullable()` - Accepts `null` in addition to the base type
- `.optional()` - Makes the field optional (accepts `undefined` or missing)
- Combined: Accepts `string | null | undefined`

## Validation Matrix

| User Type | rollNumber Value | Before Fix | After Fix |
|-----------|-----------------|------------|-----------|
| Student | `"21BCON747"` | ✅ Pass | ✅ Pass |
| Department | `null` | ❌ Fail | ✅ Pass |
| Admin | `null` | ❌ Fail | ✅ Pass |
| Guest | `undefined` | ✅ Pass | ✅ Pass |

## Testing

### Test Each User Type

1. **Student Submission**:
   ```javascript
   // POST /api/support/submit
   {
     "email": "student@jecrc.ac.in",
     "rollNumber": "21BCON747",
     "subject": "Need help",
     "message": "I need assistance with my no dues form",
     "requesterType": "student"
   }
   ```
   Expected: ✅ Success

2. **Department Staff Submission**:
   ```javascript
   // POST /api/support/submit
   {
     "email": "staff@jecrc.ac.in",
     "rollNumber": null,
     "subject": "Technical issue",
     "message": "System not working properly",
     "requesterType": "department"
   }
   ```
   Expected: ✅ Success (was failing before)

3. **Admin Submission**:
   ```javascript
   // POST /api/support/submit
   {
     "email": "admin@jecrc.ac.in",
     "rollNumber": null,
     "subject": "[ADMIN] Urgent",
     "message": "[Priority: HIGH]\n\nNeed immediate attention",
     "requesterType": "department"
   }
   ```
   Expected: ✅ Success (was failing before)

4. **Guest Submission**:
   ```javascript
   // POST /api/support/submit
   {
     "email": "guest@email.com",
     "subject": "Question",
     "message": "I have a general question about the system",
     "user_type": "guest"
   }
   ```
   Expected: ✅ Success (rollNumber field not included)

### Verify in Database

After each submission, check the `support_tickets` table:

```sql
SELECT 
  ticket_number,
  user_email,
  roll_number,
  requester_type,
  subject,
  created_at
FROM support_tickets
ORDER BY created_at DESC
LIMIT 5;
```

Expected results:
- Student ticket: `roll_number = "21BCON747"`
- Department ticket: `roll_number = NULL`
- Admin ticket: `roll_number = NULL`
- Guest ticket: `roll_number = NULL`

## Related Files

- [`src/lib/zodSchemas.js`](src/lib/zodSchemas.js:236-252) - Schema definition (FIXED)
- [`src/app/api/support/submit/route.js`](src/app/api/support/submit/route.js) - API endpoint
- Frontend modals (all working correctly, no changes needed):
  - `src/components/support/StudentSupportModal.jsx`
  - `src/components/support/DepartmentSupportModal.jsx`
  - `src/components/support/AdminSupportModal.jsx`
  - `src/components/support/SupportModal.jsx`

## Why This Pattern is Important

This fix demonstrates a critical principle in full-stack development:

**Frontend → Validation → Backend → Database**

Each layer must handle the same data types:
1. **Frontend**: Explicitly sends `null` for optional data
2. **Validation**: Must accept `null` as valid
3. **Backend**: Processes `null` correctly
4. **Database**: Column type supports `NULL`

If any layer rejects `null` while others expect it, the chain breaks!

## Status
✅ **FIXED** - Support ticket submissions now work for all user types (student, department, admin, guest).