# 🔄 Real-Time Setup Guide - JECRC No Dues System

This guide will help you enable and troubleshoot real-time updates in your application.

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Enable Realtime in Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/jfqlpyrgkvzbmolvaycz
2. Navigate to **Database → Replication** (left sidebar)
3. Scroll to **Replication** section
4. Find and enable these tables:
   - ✅ `no_dues_forms`
   - ✅ `no_dues_status`
5. Click **Save** or toggle switches to enable

**OR run the SQL script:**

1. Go to **SQL Editor** in Supabase Dashboard
2. Create a new query
3. Copy and paste the content from `scripts/enable-realtime.sql`
4. Click **Run** (or press Ctrl+Enter)
5. Verify you see success message with 2 rows

---

### Step 2: Verify Realtime is Enabled

Run this SQL query in **SQL Editor**:

```sql
SELECT 
  schemaname,
  tablename,
  pubname
FROM 
  pg_publication_tables
WHERE 
  pubname = 'supabase_realtime'
  AND tablename IN ('no_dues_forms', 'no_dues_status');
```

**Expected Output:**
```
schemaname | tablename       | pubname
-----------|-----------------|------------------
public     | no_dues_forms   | supabase_realtime
public     | no_dues_status  | supabase_realtime
```

If you don't see these rows, realtime is NOT enabled.

---

### Step 3: Test Real-Time Updates

1. **Open browser console** (F12 → Console tab)
2. **Open two browser windows:**
   - Window 1: Admin Dashboard (https://no-duessystem.onrender.com/admin)
   - Window 2: Student Form (https://no-duessystem.onrender.com/student/submit-form)

3. **Watch console logs in Window 1** - you should see:
   ```
   ✅ Admin dashboard subscribed to real-time updates
   ```

4. **Submit a form in Window 2**

5. **Check Window 1 console** - you should see:
   ```
   🔔 New form submission detected: 22COM1369
   ```
   And the dashboard should update automatically with a toast notification.

---

## 🔍 Troubleshooting

### Issue 1: No Console Logs Appear

**Problem**: Browser console shows no subscription logs

**Solutions**:
1. Clear browser cache and hard reload (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify you're logged in
4. Try in incognito/private mode

---

### Issue 2: "SUBSCRIBED" but No Updates

**Problem**: Console shows "✅ subscribed" but no updates when data changes

**Solutions**:
1. **Verify Realtime is enabled in Supabase** (see Step 1)
2. **Check RLS policies** - Run this SQL:
   ```sql
   -- Check if anon/authenticated can SELECT
   SELECT * FROM pg_policies 
   WHERE tablename IN ('no_dues_forms', 'no_dues_status');
   ```
3. **Test with SQL Editor**: 
   ```sql
   -- Insert a test row
   INSERT INTO no_dues_forms (student_name, registration_no, ...)
   VALUES ('Test Student', 'TEST123', ...);
   ```
   Watch console - it should log the insert.

---

### Issue 3: "CHANNEL_ERROR" in Console

**Problem**: Console shows subscription error

**Solutions**:
1. **Check Supabase Project Status**: 
   - Go to Supabase Dashboard → Settings → General
   - Ensure project is active and not paused

2. **Verify Environment Variables**:
   ```bash
   # In .env.local, verify:
   NEXT_PUBLIC_SUPABASE_URL=https://jfqlpyrgkvzbmolvaycz.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   ```

3. **Check Network Tab**:
   - Open DevTools → Network tab
   - Look for WebSocket connections to `supabase.co`
   - Status should be 101 (Switching Protocols)

---

### Issue 4: Updates Work Locally but Not in Production

**Problem**: Real-time works on localhost but not on deployed app

**Solutions**:
1. **Verify production environment variables**:
   - Go to Render.com → Your Service → Environment
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

2. **Check if Realtime is enabled for your production Supabase project**

3. **Clear Render's build cache**:
   - Manual Deploy → Clear build cache & deploy

---

## 🧪 Manual Testing Checklist

Use this checklist to verify real-time functionality:

### Admin Dashboard
- [ ] Open admin dashboard in browser
- [ ] Check console for "✅ Admin dashboard subscribed"
- [ ] Submit a new form from another window
- [ ] Verify toast notification appears: "New application received!"
- [ ] Verify new entry appears in table without refresh
- [ ] Click "Refresh" button - should show spinning icon

### Department Staff Dashboard
- [ ] Open staff dashboard as department user
- [ ] Check console for "✅ Staff dashboard subscribed"
- [ ] Have another staff member approve/reject
- [ ] Verify entry updates automatically
- [ ] Verify toast notification shows

### Student Status Page
- [ ] Open status page for a submitted form
- [ ] Check console for "Successfully subscribed to status updates"
- [ ] Have department approve from staff dashboard
- [ ] Verify status card updates color and text
- [ ] Verify progress bar updates automatically

---

## 📊 Console Log Reference

### Success Logs (What You Want to See):
```
✅ Admin dashboard subscribed to real-time updates
✅ Staff dashboard subscribed to real-time updates
Successfully subscribed to status updates
🔔 New form submission detected: 22COM1369
🔄 Form updated: 22COM1369
📋 Department status changed
```

### Error Logs (Problems to Fix):
```
❌ Real-time subscription error - falling back to polling
⏰ Subscription not active, starting fallback polling
CHANNEL_ERROR: Failed to subscribe
WebSocket connection failed
```

---

## 🔧 Advanced Debugging

### Enable Verbose Logging

Add this to browser console:
```javascript
// Enable Supabase debug logging
localStorage.setItem('supabase.debug', 'true');
// Reload page
location.reload();
```

### Check WebSocket Connection
```javascript
// In browser console
const ws = new WebSocket('wss://jfqlpyrgkvzbmolvaycz.supabase.co/realtime/v1/websocket');
ws.onopen = () => console.log('✅ WebSocket connected');
ws.onerror = (e) => console.error('❌ WebSocket error:', e);
```

### Test Subscription Manually
```javascript
// In browser console (must be logged in)
import { supabase } from '@/lib/supabaseClient';

const channel = supabase
  .channel('test-channel')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'no_dues_forms'
  }, (payload) => {
    console.log('📨 Received:', payload);
  })
  .subscribe((status) => {
    console.log('Status:', status);
  });
```

---

## 🆘 Still Not Working?

If you've tried everything above and it's still not working:

1. **Check Supabase Status**: https://status.supabase.com
2. **Review Supabase Logs**:
   - Dashboard → Logs → select "Realtime"
   - Look for connection errors

3. **Contact Support**:
   - Share console logs
   - Share network tab screenshot
   - Share SQL query results from Step 2

---

## 📝 Configuration Summary

### Current Settings:
- **Realtime events per second**: 10
- **Heartbeat interval**: 30 seconds
- **Reconnect strategy**: Exponential backoff (1s → 10s max)
- **Fallback polling**: 30 seconds (admin/staff), 60 seconds (student)
- **Request timeout**: 15 seconds

### Tables with Realtime:
- `no_dues_forms` - Form submissions
- `no_dues_status` - Department approvals/rejections

### Events Being Monitored:
- `INSERT` on `no_dues_forms` - New form submissions
- `UPDATE` on `no_dues_forms` - Form status changes
- `UPDATE` on `no_dues_status` - Department actions
- `INSERT` on `no_dues_status` - New status records

---

## ✅ Success Criteria

You'll know real-time is working when:
1. ✅ No page refreshes needed to see updates
2. ✅ Toast notifications appear automatically
3. ✅ Console shows "SUBSCRIBED" status
4. ✅ Changes appear within 1-2 seconds
5. ✅ Live indicator shows green pulsing dot

---

**Last Updated**: 2025-12-01  
**Version**: 1.0  
**Support**: Check console logs and follow troubleshooting steps above