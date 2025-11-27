# SYSTEM AUDIT & CRITICAL ISSUES REPORT

**Date**: November 25, 2025
**Status**: ⚠️ CRITICAL ISSUES FOUND

---

## 🚨 CRITICAL SECURITY VULNERABILITIES

### 1. Staff Dashboard Access Control Bypass (High Severity)
**File**: `src/app/api/staff/dashboard/route.js`
**Issue**: The API endpoint trusts the `userId` passed in query parameters without verifying the session of the requester.
**Vulnerability**: Any authenticated user (or potentially unauthenticated if middleware doesn't catch it) can access another staff member's dashboard by simply changing the `userId` query parameter.
**Fix Required**:
- Remove reliance on `searchParams.get('userId')`.
- Retrieve the user ID directly from `supabase.auth.getSession()` or `supabase.auth.getUser()` on the server side.
- Verify that the session user has the correct role (`department` or `admin`).

### 2. Inconsistent Authentication in Hooks (Reliability Risk)
**Files**: `src/hooks/useCoursesConfig.js`, `src/hooks/useBranchesConfig.js`
**Issue**: These hooks use `localStorage.getItem('token')` manually to attach Authorization headers.
**Risk**: This is fragile and inconsistent with `useSchoolsConfig.js` which correctly uses `supabase.auth.getSession()`. If Supabase changes its internal storage key or token format, these hooks will break immediately.
**Fix Required**: Refactor all config hooks to use `supabase.auth.getSession()` to retrieve the access token.

---

## 🔍 LOGIC & DATA FLOW AUDIT

### 1. Student Submission Flow (Verified ✅)
**Status**: **Safe** (Database Trigger Handling)
**Observation**: The `POST /api/student` endpoint inserts into `no_dues_forms` but does not explicitly create status records for departments.
**Verification**: Verified that `supabase/COMPLETE_DATABASE_SETUP.sql` creates a trigger `trigger_create_department_statuses` which automatically populates `no_dues_status`.
**Action**: No code change needed, but awareness is key. The system relies on this database trigger.

### 2. Redundant Hook Logic (Maintenance Debt)
**Files**: `useSchoolsConfig.js`, `useCoursesConfig.js`, `useBranchesConfig.js`, `useDepartmentsConfig.js`
**Issue**: High duplication of CRUD logic.
**Recommendation**: In the future, refactor into a single `useConfigTable(tableName)` hook to reduce maintenance burden, but this is lower priority than the security fixes.

---

## 📝 DUPLICATE & REDUNDANT FILES

### 1. Potential Unused/Legacy Components
- **Search Components**: While `findings/` folder was deleted, verify if `src/components/ui/Search.jsx` (if exists) duplicates logic in `src/components/admin/Search.jsx`.

### 2. Redundant API Patterns
- **Admin Config APIs**: `src/app/api/admin/config/` contains multiple similar route handlers. Ensure they all use the same authentication middleware/logic (currently they might not, given the hook findings).

---

## 🛠️ ACTION PLAN

### Step 1: Fix Critical Security Hole (Priority: Immediate)
- Modify `src/app/api/staff/dashboard/route.js` to get User ID from session.

### Step 2: Standardize Authentication in Hooks (Priority: High)
- Update `useCoursesConfig.js` and `useBranchesConfig.js` to match `useSchoolsConfig.js` pattern.

### Step 3: Verify Admin Config APIs
- Ensure server-side validation matches the client-side fixes.

---
