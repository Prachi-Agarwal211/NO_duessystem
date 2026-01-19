# Student OTP Authentication Plan

## Goal
Implement a secure, OTP-based session mechanism for students accessing the 'Check Status' page.
- Students initiate login with Registration Number.
- OTP is sent to their registered email.
- Upon verification, a secure 24-hour session cookie is set.
- 'Check Status' page requires this valid session to load data.

## 1. Database Schema Changes

### New Table: `public.student_otp_logs`
Store OTPs for verification.
```sql
CREATE TABLE public.student_otp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_no TEXT NOT NULL,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
    is_used BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0
);
-- Indexes for fast lookup and rate limiting
CREATE INDEX idx_otp_reg_active ON public.student_otp_logs(registration_no) WHERE is_used = false AND expires_at > NOW();
```

## 2. API Implementation

### 2.1 Request OTP: `POST /api/student/auth/request-otp`
- **Input**: `{ registrationNo }`
- **Logic**:
  1. Validate `registrationNo`.
  2. Lookup student email from `no_dues_forms`.
  3. **Rate Limit Check**: specific limit for OTP requests (e.g. 3 in 15 mins).
  4. Generate 6-digit numeric OTP.
  5. Insert into `student_otp_logs`.
  6. Send Email via `emailService` (Subject: "Your Login OTP for No Dues").
- **Output**: `{ success: true, message: 'OTP sent to e***@domain.com' }`

### 2.2 Verify OTP: `POST /api/student/auth/verify-otp`
- **Input**: `{ registrationNo, otp }`
- **Logic**:
  1. Find latest active OTP for `registrationNo` in `student_otp_logs`.
  2. Check expiry and `is_used` status.
  3. Verify OTP code.
     - If mismatch: Increment `attempts`. If > 3, expire the OTP.
  4. If Valid:
     - Mark `is_used = true`.
     - Generate JWT with payload `{ registrationNo }`.
     - Set **HTTP-Only Cookie** `student_session` (Max-Age: 86400s = 24h).
- **Output**: `{ success: true }`

### 2.3 Check Session: `GET /api/student/auth/session` (or embedded in `/api/check-status`)
- **Logic**:
  - Validates `student_session` cookie. 
  - Returns `authenticated: true` if valid.

## 3. Frontend Implementation

### 3.1 Session Wrapper Component: `StudentAuthGuard.jsx`
A wrapper around the status page content.
- **State**: `checkingSession` | `authenticated` | `unauthenticated`.
- **Effect**:
  - On mount, call `/api/check-status` (or specialized session check).
  - If 401/Unauthorized, show **OTP Login Form**.
  - If 200/OK, show children (Status Tracker).

### 3.2 OTP Login Form Component: `OtpLoginForm.jsx`
- **Step 1**: Enter Registration No. -> "Send OTP".
- **Step 2**: Enter 6-digit OTP -> "Verify".
- **Success**: Reload page or lift state to `authenticated`.

### 3.3 Status Page Update
- Modify `src/app/student/check-status/page.js` to use `StudentAuthGuard`.

## 4. Security Considerations
- **Rate Limiting**: Critical to prevent SMS/Email flooding.
- **Cookie Security**: `HttpOnly`, `Secure`, `SameSite=Strict`.
- **Orphan Prevention**: Only allow OTP for Registration Numbers that exist in `no_dues_forms`.

## 5. Verification Plan

### Automated Tests
- **Test 1**: Request OTP with invalid Reg No -> Should fail.
- **Test 2**: Request OTP with valid Reg No -> Should create DB entry and "send" email.
- **Test 3**: Verify invalid OTP -> Should fail, increment attempts.
- **Test 4**: Verify valid OTP -> Should return success + Set-Cookie header.
- **Test 5**: Access Check Status without cookie -> Should return 401.
- **Test 6**: Access Check Status with valid cookie -> Should return data.

### Manual Verification
1. Open `/student/check-status` in Incognito. -> Should see Login Form.
2. Enter Reg No. -> Check terminal/mock for OTP.
3. Enter correct OTP. -> Should verify and load Status Page.
4. Refresh page. -> Should stay logged in (cookie check).
5. Close browser and reopen (simulated). -> Should persist (if within 24h).
