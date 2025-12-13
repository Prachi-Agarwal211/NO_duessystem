# Password Reset Flow Testing Guide

## Overview

This guide provides step-by-step instructions to test the password reset functionality after implementing the fixes.

## Prerequisites

1. Database schema has been updated using [`FIX_PASSWORD_RESET_SCHEMA_SUPABASE.sql`](FIX_PASSWORD_RESET_SCHEMA_SUPABASE.sql)
2. Backend API changes have been deployed
3. Frontend changes have been deployed

## Test Cases

### Test Case 1: Complete Password Reset Flow

**Steps:**
1. Navigate to the staff login page
2. Click on "Forgot Password" link
3. Enter a valid staff email address (e.g., `staff@jecrc.ac.in`)
4. Click "Send OTP"
5. Check the email inbox for the 6-digit OTP
6. Enter the OTP in the verification form
7. Click "Verify OTP"
8. Enter a new password (must meet requirements)
9. Confirm the new password
10. Click "Reset Password"

**Expected Results:**
- ✅ OTP should be sent successfully
- ✅ OTP verification should work
- ✅ Password reset should complete successfully
- ✅ User should be able to login with new password

### Test Case 2: Token Expiration Test

**Steps:**
1. Complete steps 1-7 from Test Case 1
2. Wait for 30 minutes (token expiration time)
3. Try to reset password using the same token

**Expected Results:**
- ✅ Token should expire after exactly 30 minutes
- ✅ User should get clear "token expired" error message
- ✅ User should be prompted to restart the process

### Test Case 3: Session Persistence Test

**Steps:**
1. Complete steps 1-7 from Test Case 1
2. Refresh the browser page
3. Verify that the password reset form is still accessible
4. Complete the password reset

**Expected Results:**
- ✅ Session should persist across page refreshes
- ✅ User should not lose progress
- ✅ Password reset should complete successfully

### Test Case 4: Invalid OTP Test

**Steps:**
1. Complete steps 1-4 from Test Case 1
2. Enter an invalid 6-digit OTP
3. Click "Verify OTP"

**Expected Results:**
- ✅ System should show "Invalid OTP" error
- ✅ User should be able to try again
- ✅ After 5 failed attempts, system should lock and require new OTP

### Test Case 5: Password Validation Test

**Steps:**
1. Complete steps 1-7 from Test Case 1
2. Try to set a weak password (e.g., "password")
3. Click "Reset Password"

**Expected Results:**
- ✅ System should show password requirements
- ✅ Password must be at least 8 characters
- ✅ Password must contain uppercase, lowercase, and numbers
- ✅ User should not be able to proceed with weak password

## Database Verification

### Check Schema Changes

```sql
-- Verify otp_code column size
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'otp_code';

-- Expected result: VARCHAR(255)

-- Check if new columns exist (optional)
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name IN ('reset_token', 'reset_token_expires_at');
```

### Check Token Storage

```sql
-- After OTP verification, check token storage
SELECT id, email, otp_code, otp_expires_at
FROM profiles
WHERE email = 'staff@jecrc.ac.in';

-- Verify:
-- 1. otp_code contains full token (not truncated)
-- 2. otp_expires_at is set to 30 minutes from now
```

## API Testing

### Test Verify OTP Endpoint

```bash
curl -X POST http://localhost:3000/api/staff/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "staff@jecrc.ac.in", "otp": "123456"}'

-- Expected response:
-- {
--   "success": true,
--   "message": "OTP verified successfully",
--   "resetToken": "full-token-not-truncated",
--   "expiresIn": 1800  # 30 minutes in seconds
-- }
```

### Test Reset Password Endpoint

```bash
curl -X POST http://localhost:3000/api/staff/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@jecrc.ac.in",
    "resetToken": "full-token-from-previous-step",
    "newPassword": "StrongPassword123",
    "confirmPassword": "StrongPassword123"
  }'

-- Expected response:
-- {
--   "success": true,
--   "message": "Password reset successfully. You can now login with your new password."
-- }
```

## Frontend Verification

### Check Session Storage

1. Open browser developer tools (F12)
2. Go to Application > Session Storage
3. After OTP verification, check for:
   - `pwd-reset-token`: Should contain full token
   - `pwd-reset-email`: Should contain email address
   - `pwd-reset-expiry`: Should be 30 minutes from now

### Check Expiration Countdown

1. After OTP verification, note the success message
2. It should mention "30 minutes" for completion
3. The session should persist for exactly 30 minutes

## Troubleshooting

### Common Issues and Solutions

**Issue: Token still getting truncated**
- **Solution:** Verify database schema was updated correctly
- **Check:** Run the schema verification SQL above

**Issue: Token expires too quickly**
- **Solution:** Check frontend/backend expiration mismatch
- **Check:** Verify both use 30 minutes (1800 seconds)

**Issue: Session not persisting**
- **Solution:** Check sessionStorage implementation
- **Check:** Verify sessionStorage values in browser dev tools

**Issue: Password requirements not enforced**
- **Solution:** Check password validation logic
- **Check:** Test with various password combinations

## Success Criteria

The password reset functionality is considered **FULLY FIXED** when:

✅ All test cases pass successfully
✅ Database schema shows VARCHAR(255) for otp_code
✅ Tokens are not truncated
✅ Expiration is consistent at 30 minutes
✅ Session persists across refreshes
✅ Error messages are clear and helpful
✅ Users can successfully reset passwords

## Next Steps

After successful testing:

1. **Deploy to production**
2. **Monitor for any issues**
3. **Gather user feedback**
4. **Iterate on improvements**

The password reset system should now work reliably for all staff accounts!