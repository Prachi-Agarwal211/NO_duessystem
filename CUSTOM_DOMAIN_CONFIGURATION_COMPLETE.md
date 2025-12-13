# ✅ Custom Domain Configuration Complete

## 🌐 Domain: https://nodues.jecrcuniversity.edu.in

All email links and system URLs have been updated to use the custom domain instead of Vercel's default domain.

---

## 📝 Changes Made

### 1. **URL Helper Update** (`src/lib/urlHelper.js`)
Updated the fallback domain used when no environment variable is set:

**Before:**
```javascript
return 'https://no-duessystem.vercel.app';
```

**After:**
```javascript
return 'https://nodues.jecrcuniversity.edu.in';
```

### 2. **Manual Entry Email Update** (`src/app/api/manual-entry/route.js`)
Updated hardcoded admin dashboard link in email template:

**Before:**
```html
<a href="https://no-duessystem.vercel.app/admin">Review Manual Entry</a>
```

**After:**
```html
<a href="https://nodues.jecrcuniversity.edu.in/admin">Review Manual Entry</a>
```

---

## 🎯 How It Works

### URL Generation Priority (urlHelper.js)
The system uses a **4-tier fallback chain** for generating URLs:

1. **NEXT_PUBLIC_BASE_URL** (Environment Variable - Recommended)
2. **NEXT_PUBLIC_APP_URL** (Legacy Support)
3. **VERCEL_URL** (Auto-populated by Vercel)
4. **Custom Domain Fallback** (New: `https://nodues.jecrcuniversity.edu.in`)

### Email Link Examples

All emails now use the custom domain:

#### Staff/HOD Login
```
https://nodues.jecrcuniversity.edu.in/staff/login
```

#### Staff Dashboard
```
https://nodues.jecrcuniversity.edu.in/staff/dashboard
```

#### Student Status Check
```
https://nodues.jecrcuniversity.edu.in/student/check-status?reg=21BCON750
```

#### Admin Dashboard
```
https://nodues.jecrcuniversity.edu.in/admin
```

#### Staff Student Form
```
https://nodues.jecrcuniversity.edu.in/staff/student/{formId}
```

---

## ⚙️ Environment Configuration

### Vercel Environment Variables (Recommended Setup)

Add this to your Vercel project environment variables:

```bash
NEXT_PUBLIC_BASE_URL=https://nodues.jecrcuniversity.edu.in
```

**How to set:**
1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add new variable:
   - **Name:** `NEXT_PUBLIC_BASE_URL`
   - **Value:** `https://nodues.jecrcuniversity.edu.in`
   - **Environments:** Production, Preview, Development
4. Click "Save"
5. Redeploy your application

### Local Development (.env.local)

For local testing with production URLs:

```bash
NEXT_PUBLIC_BASE_URL=https://nodues.jecrcuniversity.edu.in
```

Or for local development servers:

```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 📧 Email Templates Updated

All email templates now use the centralized URL helper:

### 1. **Department Notifications**
- Dashboard link → `APP_URLS.staffDashboard()`
- Uses custom domain automatically

### 2. **Student Status Updates**
- Status check link → `APP_URLS.studentCheckStatus(registrationNo)`
- Uses custom domain automatically

### 3. **Certificate Ready Notifications**
- Certificate download link → Uses custom domain
- Check status link → Uses custom domain

### 4. **Reapplication Notifications**
- Form review link → `APP_URLS.staffStudentForm(formId)`
- Uses custom domain automatically

### 5. **Manual Entry Emails**
- Admin review link → Now uses custom domain (was hardcoded)
- Student confirmation → Uses custom domain

### 6. **Password Reset Emails**
- Reset link → Uses custom domain automatically
- OTP verification → Uses custom domain

---

## 🔍 Testing Checklist

### ✅ Verify Email Links Work

1. **Test Staff/HOD Email Notifications:**
   ```
   Create a new student form
   → Staff receives email
   → Click "Review Application" button
   → Should redirect to: https://nodues.jecrcuniversity.edu.in/staff/dashboard
   ```

2. **Test Student Status Update Emails:**
   ```
   Approve/Reject a form
   → Student receives email
   → Click "Check Application Status" button
   → Should redirect to: https://nodues.jecrcuniversity.edu.in/student/check-status?reg=XXX
   ```

3. **Test Manual Entry Admin Notifications:**
   ```
   Submit a manual entry
   → Admin receives email
   → Click "Review Manual Entry" button
   → Should redirect to: https://nodues.jecrcuniversity.edu.in/admin
   ```

4. **Test Password Reset:**
   ```
   Request password reset
   → Staff receives email with OTP
   → Click reset link
   → Should redirect to: https://nodues.jecrcuniversity.edu.in/staff/reset-password
   ```

### ✅ Verify Environment Variables

Run this command to check current URL configuration:

```javascript
// In browser console or API route
import { getUrlEnvironmentInfo } from '@/lib/urlHelper';
console.log(getUrlEnvironmentInfo());
```

Expected output:
```json
{
  "baseUrl": "https://nodues.jecrcuniversity.edu.in",
  "source": "NEXT_PUBLIC_BASE_URL",
  "isConfigured": true,
  "environment": "production"
}
```

---

## 🚀 Deployment Steps

### 1. **Set Environment Variable in Vercel**
```bash
NEXT_PUBLIC_BASE_URL=https://nodues.jecrcuniversity.edu.in
```

### 2. **Deploy Changes**
```bash
git add .
git commit -m "Update to custom domain https://nodues.jecrcuniversity.edu.in"
git push origin main
```

### 3. **Verify Deployment**
- Vercel will automatically deploy
- Wait for deployment to complete
- Test email links

### 4. **DNS Configuration (If Not Done)**
Make sure your domain DNS points to Vercel:

**CNAME Record:**
```
nodues.jecrcuniversity.edu.in → cname.vercel-dns.com
```

**Or A Record:**
```
nodues.jecrcuniversity.edu.in → 76.76.21.21
```

---

## 📊 System Integration

### How URLs Are Used Across System

1. **Email Service** (`src/lib/emailService.js`)
   - Uses `APP_URLS` helper functions
   - All email templates get correct domain automatically

2. **API Routes**
   - `/api/student/route.js` → Staff notifications
   - `/api/staff/action/route.js` → Student status updates
   - `/api/manual-entry/route.js` → Admin notifications
   - `/api/student/reapply/route.js` → Reapplication notifications
   - All use centralized URL helper

3. **Frontend Components**
   - Login redirects
   - Dashboard navigation
   - Status check pages
   - All respect the configured base URL

---

## 🔐 Security Note

The custom domain is now the **primary domain** for:
- ✅ All email links (staff, students, admins)
- ✅ Password reset flows
- ✅ OAuth redirects (if implemented)
- ✅ API callbacks
- ✅ Certificate downloads

Make sure SSL/TLS certificate is properly configured on the domain.

---

## 🎓 HOD Email Links

All 34 HOD accounts will receive emails with links to:

**Staff Login Page:**
```
https://nodues.jecrcuniversity.edu.in/staff/login
```

**Staff Dashboard (after login):**
```
https://nodues.jecrcuniversity.edu.in/staff/dashboard
```

**Password Reset:**
```
https://nodues.jecrcuniversity.edu.in/staff/forgot-password
```

---

## ✅ Summary

✅ **URL Helper Updated:** Custom domain fallback configured
✅ **Manual Entry Email Fixed:** Hardcoded URL replaced with custom domain
✅ **All Email Templates:** Use centralized URL generation
✅ **HOD Notifications:** Will use custom domain automatically
✅ **Student Emails:** All links point to custom domain
✅ **Admin Notifications:** Dashboard links use custom domain

---

## 🔄 Rollback (If Needed)

To revert to Vercel domain:

1. **Remove environment variable:**
   ```
   Delete NEXT_PUBLIC_BASE_URL from Vercel
   ```

2. **Or update to Vercel domain:**
   ```bash
   NEXT_PUBLIC_BASE_URL=https://no-duessystem.vercel.app
   ```

3. **Redeploy**

---

## 📞 Support

If email links don't work after deployment:

1. **Check Environment Variable:**
   - Vercel Dashboard → Settings → Environment Variables
   - Verify `NEXT_PUBLIC_BASE_URL` is set correctly

2. **Verify DNS:**
   - Run: `nslookup nodues.jecrcuniversity.edu.in`
   - Should resolve to Vercel's IP

3. **Check SSL Certificate:**
   - Visit: https://nodues.jecrcuniversity.edu.in
   - Should show secure (🔒) icon

4. **Test Email Sending:**
   - Submit a test form
   - Check staff email for notification
   - Click link and verify it works

---

**Last Updated:** December 13, 2025
**Status:** ✅ Complete and Ready for Production