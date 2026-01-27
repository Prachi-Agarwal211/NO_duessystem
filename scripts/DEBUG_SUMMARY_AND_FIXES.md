# No Dues System - Debug Summary and Fixes

## 🔍 ISSUES IDENTIFIED

### 1. Chat System Issues

**Problem:** Error about relationship between 'no_dues_messages' and 'sender_id'

**Root Causes:**
- The `no_dues_messages` table uses polymorphic `sender_id` (TEXT type) that can be UUID, string, or null
- Some API routes tried to join with `profiles` table using this column, causing relationship errors
- The `unread` API route was using `no_dues_forms!inner()` join which requires proper FK relationships

**Files Affected:**
- `src/app/api/chat/[formId]/[department]/route.js` - Already fixed (removed sender join)
- `src/app/api/chat/unread/route.js` - Fixed (removed problematic join, fetch separately)

### 2. Reapplication System Issues

**Problem:** "Internal server error" when submitting reapplication

**Root Causes:**
- Missing session authentication on `/api/student/reapply/department` endpoint
- Missing database columns: `rejection_count`, `action_by_user_id` in `no_dues_status` table
- Missing `student_otp_logs` table for OTP verification
- Missing `last_active_at` column in `profiles` table

**Files Affected:**
- `src/app/api/student/reapply/department/route.js` - Fixed (added session verification)
- Database schema - Needs fixes (see SQL script)

### 3. Database Schema Issues

**Missing Tables:**
- `student_otp_logs` - Required for OTP login system

**Missing Columns:**
- `no_dues_status.rejection_count` - INTEGER, DEFAULT 0
- `no_dues_status.action_by_user_id` - TEXT
- `profiles.last_active_at` - TIMESTAMPTZ
- `profiles.assigned_department_ids` - UUID[]

---

## ✅ FIXES PROVIDED

### 1. Database Fix Script
**File:** `scripts/complete-database-fix.sql`

Run this in Supabase SQL Editor to:
- Create/fix `no_dues_messages` table with all required columns
- Create `student_otp_logs` table
- Add missing columns to `no_dues_status` table
- Add missing columns to `profiles` table
- Enable RLS and create policies
- Create view for chat messages

### 2. Chat API Fixes
**File:** `src/app/api/chat/unread/route.js`

- Removed problematic join with `no_dues_forms`
- Now fetches form details separately to avoid relationship errors
- Maintains same functionality while being more robust

### 3. Reapplication API Fixes
**File:** `src/app/api/student/reapply/department/route.js`

- Added session verification using `student_session` cookie
- Added JWT token validation
- Added authorization check to ensure students can only reapply for their own forms
- Both POST and GET handlers now properly authenticated

### 4. Diagnostic Scripts
**Files:**
- `scripts/fix-chat-api.js` - Test chat system functionality
- `scripts/fix-reapplication-api.js` - Test reapplication system

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Apply Database Fixes
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `scripts/complete-database-fix.sql`
3. Run the SQL script
4. Verify no errors occurred

### Step 2: Enable Realtime (if not already enabled)
1. Go to Supabase Dashboard → Database → Replication
2. Enable Realtime for `no_dues_messages` table
3. This is required for live chat updates

### Step 3: Deploy API Changes
1. The API route files have been updated:
   - `src/app/api/chat/unread/route.js`
   - `src/app/api/student/reapply/department/route.js`
2. Commit and push changes
3. Deploy to Vercel/production

### Step 4: Test the Fixes
1. Run diagnostic scripts:
   ```bash
   node scripts/fix-chat-api.js
   node scripts/fix-reapplication-api.js
   ```

2. Test chat functionality:
   - Login as student
   - Navigate to a rejected department
   - Open chat
   - Try sending a message

3. Test reapplication functionality:
   - Login as student with rejected form
   - Click "Reapply" button
   - Submit reapplication
   - Verify success message

---

## 🔧 ADDITIONAL TROUBLESHOOTING

### If Chat Still Doesn't Work:
1. Check browser console for errors
2. Verify `student_session` cookie is set
3. Check Network tab for API response errors
4. Verify Supabase Realtime is enabled for `no_dues_messages`
5. Check RLS policies are correct

### If Reapplication Still Doesn't Work:
1. Verify student is logged in (has `student_session` cookie)
2. Check that form status is "rejected"
3. Verify department status is "rejected"
4. Check browser Network tab for specific error messages
5. Review Vercel logs for server-side errors

### Common Error Messages:

**"Session expired or required"**
- Student needs to login again
- OTP verification required

**"Could not find a relationship"**
- Database schema issue
- Run the SQL fix script

**"Internal server error"**
- Check Vercel logs for details
- Likely missing database column or table

---

## 📋 VERIFICATION CHECKLIST

- [ ] Database SQL script executed successfully
- [ ] Realtime enabled for no_dues_messages
- [ ] API routes deployed
- [ ] Chat loads messages without errors
- [ ] Chat sends messages successfully
- [ ] Reapplication modal opens
- [ ] Reapplication submits successfully
- [ ] Reapplication history is saved
- [ ] Department status resets to "pending" after reapplication

---

## 📞 SUPPORT

If issues persist after applying these fixes:

1. Check Vercel deployment logs
2. Check Supabase logs (Database → Logs)
3. Run diagnostic scripts to identify specific issues
4. Verify environment variables are set correctly:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET` or `NEXTAUTH_SECRET`

---

**Fixes prepared by:** Debug Mode Analysis
**Date:** 2026-01-27
**Status:** Ready for deployment