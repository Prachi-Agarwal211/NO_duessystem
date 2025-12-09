# 🚀 Complete Step-by-Step Deployment Guide
**JECRC No Dues Clearance System - Production Deployment**

*Last Updated: 2025-12-09*  
*System Version: 2.0.0 (Unified Notifications + Manual Entry + Staff CSV Export)*

---

## 📋 Pre-Deployment Checklist

Before starting deployment, ensure you have:

- [ ] Supabase project created ([supabase.com](https://supabase.com))
- [ ] Resend account created ([resend.com](https://resend.com))
- [ ] Vercel account (or other hosting platform)
- [ ] Domain name configured (optional but recommended)
- [ ] Database backup of existing data (if applicable)
- [ ] `.env.local` file with all required credentials

---

## 🔑 Step 1: Environment Setup (15 minutes)

### 1.1 Create `.env.local` File

Create a file named `.env.local` in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Email Configuration (Resend)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=onboarding@resend.dev

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 1.2 Get Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep this secret!**

### 1.3 Get Resend API Key

1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Click **Create API Key**
3. Copy the key → `RESEND_API_KEY`
4. For now, use `onboarding@resend.dev` as sender (verified)
5. **Production**: Verify your custom domain later

### 1.4 Generate JWT Secret

```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy output → `JWT_SECRET`

---

## 💾 Step 2: Database Setup (30 minutes)

### 2.1 Run Database Migrations in Order

Open **Supabase SQL Editor** and execute these scripts **one by one**:

#### Migration 1: Unified Notification System
```bash
# File: scripts/unify-notification-system.sql
# Purpose: Makes department email optional, uses staff emails
```

1. Open Supabase Dashboard → **SQL Editor**
2. Copy contents of [`scripts/unify-notification-system.sql`](scripts/unify-notification-system.sql)
3. Paste and click **Run**
4. Verify: "Department email field made nullable" message

#### Migration 2: Department Order Update
```bash
# File: scripts/update-department-order.sql
# Purpose: Reorders departments, adds Registrar, removes JIC & Student Council
```

1. Copy contents of [`scripts/update-department-order.sql`](scripts/update-department-order.sql)
2. Paste in SQL Editor
3. Click **Run**
4. Verify: 10 active departments remain

**New Department Order**:
1. School (HOD/Department)
2. Library
3. Hostel
4. Mess
5. Canteen
6. TPO
7. Alumni Association
8. IT Department
9. Accounts Department
10. Registrar

#### Migration 3: Manual Entry System
```bash
# File: scripts/add-manual-entry-system.sql
# Purpose: Adds manual certificate registration for offline completions
```

1. Copy contents of [`scripts/add-manual-entry-system.sql`](scripts/add-manual-entry-system.sql)
2. Paste in SQL Editor
3. Click **Run**
4. Verify: `manual_entries` table created

### 2.2 Create Storage Buckets

#### Bucket 1: Student Documents
1. Go to **Storage** in Supabase
2. Click **New bucket**
3. Settings:
   - Name: `student-documents`
   - Public: **No** (private)
   - Allowed MIME types: `image/*`, `application/pdf`
   - File size limit: `10 MB`
4. Click **Create bucket**

#### Bucket 2: Manual Certificates
1. Click **New bucket** again
2. Settings:
   - Name: `manual-certificates`
   - Public: **No** (private)
   - Allowed MIME types: `image/*`, `application/pdf`
   - File size limit: `10 MB`
3. Click **Create bucket**

### 2.3 Configure Storage Policies

For each bucket, add this RLS policy:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'student-documents');

-- Allow public read access to files
CREATE POLICY "Public can view files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'student-documents');
```

Repeat for `manual-certificates` bucket.

### 2.4 Optional: Clean Database (Fresh Start)

⚠️ **WARNING**: This deletes ALL data!

If you want a completely fresh start:

1. **BACKUP FIRST**: Go to Database → Backups → Create backup
2. Open SQL Editor
3. Copy contents of [`scripts/cleanup-database.sql`](scripts/cleanup-database.sql)
4. Review the script carefully
5. Execute the script
6. Type `COMMIT;` to apply changes (or `ROLLBACK;` to cancel)

---

## 👤 Step 3: Create Admin Account (5 minutes)

### 3.1 Install Dependencies

```bash
npm install
```

### 3.2 Run Admin Creation Script

#### Option A: Interactive (Recommended)

```bash
node scripts/create-admin-account.js
```

When prompted, enter:
- **Email**: `admin@jecrcu.edu.in` (or your choice)
- **Full Name**: `System Administrator`
- **Password**: `Admin@2025` (or your secure password)
- **Confirm Password**: (same as above)

#### Option B: Non-Interactive

```bash
EMAIL="admin@jecrcu.edu.in" PASSWORD="Admin@2025" node scripts/create-admin-account.js
```

### 3.3 Verify Admin Creation

Expected output:
```
╔════════════════════════════════════════════════════════╗
║      Admin Account Created Successfully!               ║
╚════════════════════════════════════════════════════════╝

📋 Account Details:
   Email:     admin@jecrcu.edu.in
   Name:      System Administrator
   Role:      admin
   User ID:   [UUID]
```

**⚠️ IMPORTANT**: Save these credentials securely!

---

## 🧪 Step 4: Local Testing (20 minutes)

### 4.1 Start Development Server

```bash
npm run dev
```

Expected output:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in 2.3s
```

### 4.2 Test Admin Login

1. Open browser: `http://localhost:3000/admin`
2. Login with admin credentials
3. ✅ Verify: Dashboard loads successfully

### 4.3 Test Staff Creation

1. In admin dashboard, click **Settings** tab
2. Click **Department Staff** sub-tab
3. Click **Add Staff Member**
4. Fill in details:
   ```
   Full Name: Test Library Staff
   Email: library.staff@test.com
   Department: Library
   Password: Test@123
   ```
5. Click **Create**
6. ✅ Verify: Staff member created

### 4.4 Test Staff Login

1. Open new incognito window: `http://localhost:3000/staff/login`
2. Login with staff credentials
3. ✅ Verify: Staff dashboard loads

### 4.5 Test Student Form Submission

1. Open: `http://localhost:3000/student/submit-form`
2. Fill in ALL required fields:
   - Registration No: `TEST123`
   - Student Name: `Test Student`
   - Parent Name: `Test Parent`
   - Select School, Course, Branch
   - Add both emails
   - Add phone number
   - Admission Year: `2020`
   - Passing Year: `2024`
3. Upload a test document
4. Click **Submit**
5. ✅ Verify:
   - Form submitted successfully
   - Staff member receives email notification
   - Form appears in staff dashboard

### 4.6 Test Staff Actions

1. As staff member, view pending application
2. Click on application
3. Test **Approve** action
4. ✅ Verify: Status changes to approved

### 4.7 Test Certificate Generation

1. Login as different department staff
2. Approve the same application
3. Repeat for all 10 departments
4. Once all approved, test certificate generation
5. ✅ Verify: Certificate generated and downloadable

### 4.8 Test Reapplication

1. Create new application as student
2. As staff, reject the application with reason
3. As student, go to check status
4. Click **Reapply**
5. Add response message
6. Submit reapplication
7. ✅ Verify:
   - Reapplication submitted
   - Staff receives reapplication notification
   - Form status reset to pending for rejected department only

### 4.9 Test Manual Entry

1. Open: `http://localhost:3000/student/manual-entry`
2. Fill in registration details
3. Upload certificate screenshot
4. Submit
5. Login as admin
6. Go to **Manual Entries** tab
7. Review and approve entry
8. ✅ Verify:
   - Entry approved
   - Completed form created with all departments approved
   - Certificate accessible

### 4.10 Test CSV Export

#### Admin CSV:
1. Login as admin
2. Go to **Dashboard** tab
3. Click **Export Applications**
4. ✅ Verify: CSV downloaded with all applications and department statuses

#### Staff CSV:
1. Login as staff
2. In staff dashboard, click **Export** button
3. ✅ Verify: CSV downloaded with staff's visible applications

---

## 🌐 Step 5: Production Deployment (30 minutes)

### 5.1 Prepare for Production

#### Update Environment Variables

1. Change `NEXT_PUBLIC_APP_URL` to your production domain:
   ```env
   NEXT_PUBLIC_APP_URL=https://nodues.jecrc.ac.in
   ```

2. Update email sender (after domain verification):
   ```env
   RESEND_FROM_EMAIL=noreply@jecrc.ac.in
   ```

3. **Generate new JWT secret** for production:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

#### Verify Domain in Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **Add Domain**
3. Enter: `jecrc.ac.in`
4. Follow DNS configuration steps
5. Add required DNS records to your domain provider
6. Wait for verification (usually 5-10 minutes)

### 5.2 Deploy to Vercel

#### Method A: GitHub Deployment (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "feat: Production-ready system with all features"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click **Add New** → **Project**
   - Import your GitHub repository
   - Click **Import**

3. **Configure Environment Variables**:
   - In Vercel project settings
   - Go to **Settings** → **Environment Variables**
   - Add ALL variables from `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY
     SUPABASE_SERVICE_ROLE_KEY
     RESEND_API_KEY
     RESEND_FROM_EMAIL
     NEXT_PUBLIC_APP_URL
     JWT_SECRET
     ```
   - Click **Add** for each

4. **Deploy**:
   - Click **Deploy**
   - Wait 2-3 minutes
   - ✅ Deployment successful!

#### Method B: CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Follow prompts and paste .env.local values when asked
```

### 5.3 Configure Custom Domain

1. In Vercel project → **Settings** → **Domains**
2. Add: `nodues.jecrc.ac.in`
3. Follow DNS configuration steps
4. Add CNAME record to your domain provider
5. Wait for DNS propagation (5-30 minutes)

### 5.4 Run Production Database Setup

Use the same database scripts from Step 2, but on production Supabase instance.

### 5.5 Create Production Admin

```bash
# Set production environment
export NEXT_PUBLIC_SUPABASE_URL="https://your-prod-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-prod-service-role-key"

# Create admin
node scripts/create-admin-account.js
```

### 5.6 Create Production Staff Accounts

1. Login to production admin panel
2. Go to **Settings** → **Department Staff**
3. Create staff accounts for each department:

```
Department: School (HOD/Department)
Email: school.hod@jecrc.ac.in
Name: School HOD

Department: Library
Email: library@jecrc.ac.in
Name: Library Staff

Department: Hostel
Email: hostel@jecrc.ac.in
Name: Hostel Warden

... (repeat for all 10 departments)
```

---

## ✅ Step 6: Post-Deployment Verification (15 minutes)

### 6.1 Production Smoke Tests

Test in production environment:

- [ ] Admin can login
- [ ] Admin can create staff accounts
- [ ] Staff can login
- [ ] Student can submit application
- [ ] Email notifications sent (check staff inbox)
- [ ] Staff can view pending applications
- [ ] Staff can approve/reject applications
- [ ] Reapplication works after rejection
- [ ] Certificate generation works after all approvals
- [ ] Manual entry submission works
- [ ] Admin can approve manual entries
- [ ] CSV export works (admin side)
- [ ] CSV export works (staff side)
- [ ] All pages load without errors
- [ ] Mobile responsive (test on phone)

### 6.2 Check Browser Console

Open developer tools (F12):
- [ ] No error messages in console
- [ ] No network errors
- [ ] All API calls successful (200 status)

### 6.3 Test Email Delivery

1. Submit a test application
2. Check staff email inboxes
3. ✅ Verify: All staff received notification
4. Check email spam folder if not received

### 6.4 Monitor Supabase

1. Go to Supabase Dashboard → **Logs**
2. Check for any errors
3. Monitor real-time database activity

### 6.5 Monitor Vercel

1. Go to Vercel Dashboard → Your Project → **Logs**
2. Check deployment logs
3. Monitor function execution
4. Check for any runtime errors

---

## 📊 Step 7: Initial Configuration (10 minutes)

### 7.1 Configure Active Departments

Admin Dashboard → Settings → Departments:

1. Review 10 active departments
2. Verify display order is correct
3. Update department names if needed
4. Deactivate any unused departments

### 7.2 Configure Schools/Courses/Branches

Admin Dashboard → Settings:

1. **Schools Tab**:
   - Add all schools in your institution
   - Set display order

2. **Courses Tab**:
   - Add all courses
   - Link to appropriate schools

3. **Branches Tab**:
   - Add all branches
   - Link to courses

### 7.3 Assign Staff Scopes (Optional)

For staff who should see limited applications:

1. Admin → Settings → Department Staff
2. Click **Edit** on staff member
3. Configure scopes:
   - **School Scope**: Select specific schools
   - **Course Scope**: Select specific courses
   - **Branch Scope**: Select specific branches
4. Save

Example: Library staff only for Engineering school:
- School Scope: [Engineering]
- Course Scope: (leave empty for all courses)
- Branch Scope: (leave empty for all branches)

---

## 🔒 Step 8: Security Hardening (10 minutes)

### 8.1 Update Supabase RLS Policies

Verify Row Level Security is enabled:

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All tables should show `rowsecurity = true`

### 8.2 Rotate JWT Secret

After initial setup, generate and update JWT secret:

```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update in Vercel environment variables
# Redeploy
```

### 8.3 Review Supabase Auth Settings

Supabase Dashboard → **Authentication** → **Settings**:

- [ ] **Email confirmations**: Enabled
- [ ] **Secure password policy**: Enabled
- [ ] **JWT expiry**: 3600 seconds (1 hour)
- [ ] **Refresh token rotation**: Enabled

### 8.4 Enable Rate Limiting

Already implemented in code:
- ✅ Form submissions: 5 per hour
- ✅ Reapplications: 5 per hour
- ✅ API reads: 100 per minute

Monitor in production and adjust if needed in [`src/lib/rateLimiter.js`](src/lib/rateLimiter.js).

### 8.5 Set Up Backup Schedule

Supabase Dashboard → **Settings** → **Backups**:

1. Enable automatic backups
2. Set backup frequency: **Daily**
3. Retention: **7 days**

---

## 📱 Step 9: User Training (30 minutes)

### 9.1 Admin Training

Train admin on:
1. **Staff Management**: Creating and managing department staff
2. **Configuration**: Managing schools, courses, branches, departments
3. **Manual Entries**: Reviewing and approving offline certificates
4. **Reports**: Generating and exporting CSV reports
5. **Monitoring**: Checking dashboard statistics

### 9.2 Staff Training

Train staff on:
1. **Login**: Accessing staff dashboard
2. **Pending Applications**: Viewing and reviewing applications
3. **Actions**: Approving and rejecting with reasons
4. **Reapplications**: Handling student reapplications
5. **History**: Viewing past actions
6. **CSV Export**: Exporting data for records

### 9.3 Student Communication

Send email/announcement to students:

```
Subject: New No Dues Clearance System Launched

Dear Students,

We are pleased to announce the launch of our new online No Dues Clearance System.

🌐 Access: https://nodues.jecrc.ac.in

📝 How to Apply:
1. Click "Apply for No Dues"
2. Fill in your details
3. Upload required documents
4. Submit application

📊 Check Status:
1. Click "Check Status"
2. Enter your registration number
3. View approval status from all departments

📜 Already Completed Offline?
1. Click "Register Certificate"
2. Upload your existing certificate
3. Admin will verify and approve

For any issues, contact: support@jecrc.ac.in

Thank you!
```

---

## 🔍 Step 10: Monitoring & Maintenance

### 10.1 Set Up Monitoring

#### Vercel Monitoring
- Monitor deployment health
- Check function execution times
- Set up alerts for errors

#### Supabase Monitoring
- Monitor database performance
- Check API usage
- Set up alerts for errors

#### Email Monitoring (Resend)
- Monitor email delivery rates
- Check bounce rates
- Monitor spam reports

### 10.2 Regular Maintenance Tasks

**Daily**:
- [ ] Check Vercel logs for errors
- [ ] Monitor Supabase dashboard for issues
- [ ] Review email delivery status

**Weekly**:
- [ ] Review pending manual entries
- [ ] Check CSV export reports
- [ ] Monitor staff activity

**Monthly**:
- [ ] Database backup verification
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Update dependencies

### 10.3 Update Checklist

When updating the system:

1. **Test Locally**:
   ```bash
   npm install
   npm run dev
   # Test all features
   ```

2. **Create Backup**:
   - Supabase: Create manual backup
   - Export production data

3. **Deploy to Staging** (if available):
   ```bash
   vercel --prod
   ```

4. **Test in Staging**:
   - Run all smoke tests
   - Verify no breaking changes

5. **Deploy to Production**:
   ```bash
   git push origin main
   # Vercel auto-deploys
   ```

6. **Verify Production**:
   - Run smoke tests
   - Monitor for 24 hours

---

## 🆘 Troubleshooting Guide

### Issue: Staff Not Receiving Emails

**Symptoms**: Email notifications not arriving

**Solutions**:
1. Check Resend dashboard for delivery status
2. Verify staff email addresses in database
3. Check spam folders
4. Verify `RESEND_FROM_EMAIL` is verified domain
5. Check Resend API key is valid

**SQL Check**:
```sql
SELECT id, full_name, email, department_name 
FROM profiles 
WHERE role = 'department' AND email IS NULL;
```

### Issue: Certificate Not Generating

**Symptoms**: "Cannot generate certificate" error

**Solutions**:
1. Verify all 10 departments approved
2. Check no departments rejected
3. Check certificate doesn't already exist
4. Review browser console for errors

**SQL Check**:
```sql
SELECT 
  f.registration_no,
  f.status,
  COUNT(*) as total_depts,
  SUM(CASE WHEN s.status = 'approved' THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN s.status = 'rejected' THEN 1 ELSE 0 END) as rejected
FROM no_dues_forms f
JOIN no_dues_status s ON f.id = s.form_id
WHERE f.registration_no = 'REG123'
GROUP BY f.id, f.registration_no, f.status;
```

### Issue: Staff Can't See Applications

**Symptoms**: Staff dashboard shows no pending applications

**Solutions**:
1. Verify staff department matches form departments
2. Check staff scope configuration (school/course/branch)
3. Verify RLS policies are correct
4. Check staff authentication token

**SQL Check**:
```sql
-- Check staff profile
SELECT * FROM profiles WHERE id = 'staff-user-id';

-- Check pending applications for department
SELECT COUNT(*) FROM no_dues_status 
WHERE department_name = 'library' AND status = 'pending';
```

### Issue: CSV Export Not Working

**Symptoms**: "Failed to export CSV" error

**Solutions**:
1. Check browser console for errors
2. Verify data exists for current tab
3. Clear browser cache
4. Try different browser

### Issue: Manual Entry Not Converting

**Symptoms**: Approved manual entry not creating form

**Solutions**:
1. Check `convert_manual_entry_to_form` function exists
2. Verify all required fields in manual entry
3. Check Supabase function logs
4. Manually run conversion function

**SQL Fix**:
```sql
SELECT convert_manual_entry_to_form('entry-id-here');
```

---

## 📚 Additional Resources

### Documentation Files

- [`SYSTEM_VERIFICATION_REPORT.md`](SYSTEM_VERIFICATION_REPORT.md) - Complete system verification
- [`UNIFIED_NOTIFICATION_SYSTEM.md`](UNIFIED_NOTIFICATION_SYSTEM.md) - Notification architecture
- [`MANUAL_ENTRY_SYSTEM.md`](MANUAL_ENTRY_SYSTEM.md) - Manual certificate registration
- [`RESEND_DOMAIN_SETUP.md`](RESEND_DOMAIN_SETUP.md) - Email domain verification
- [`DEPLOYMENT_GUIDE_UNIFIED_SYSTEM.md`](DEPLOYMENT_GUIDE_UNIFIED_SYSTEM.md) - Original deployment guide

### Database Scripts

- [`scripts/unify-notification-system.sql`](scripts/unify-notification-system.sql)
- [`scripts/update-department-order.sql`](scripts/update-department-order.sql)
- [`scripts/add-manual-entry-system.sql`](scripts/add-manual-entry-system.sql)
- [`scripts/cleanup-database.sql`](scripts/cleanup-database.sql)
- [`scripts/create-admin-account.js`](scripts/create-admin-account.js)

### Support Contacts

- **Technical Issues**: Check GitHub issues or documentation
- **Supabase**: support@supabase.com
- **Resend**: support@resend.com
- **Vercel**: support@vercel.com

---

## ✅ Final Checklist

Before going live:

### Technical
- [ ] All database migrations applied
- [ ] Storage buckets created and configured
- [ ] Admin account created
- [ ] All 10 department staff accounts created
- [ ] Environment variables configured in production
- [ ] Custom domain configured
- [ ] Email domain verified in Resend
- [ ] SSL certificate active (auto via Vercel)

### Testing
- [ ] All smoke tests passed in production
- [ ] Email notifications working
- [ ] CSV exports working (admin & staff)
- [ ] Certificate generation working
- [ ] Reapplication system working
- [ ] Manual entry system working
- [ ] Mobile responsive verified

### Security
- [ ] RLS policies enabled
- [ ] JWT secret rotated for production
- [ ] Service role key secured
- [ ] Backups configured
- [ ] Rate limiting verified

### Operations
- [ ] Admin trained
- [ ] Staff trained
- [ ] Students notified
- [ ] Monitoring set up
- [ ] Backup schedule configured
- [ ] Support process established

---

## 🎉 Congratulations!

Your JECRC No Dues Clearance System is now live and production-ready!

**System Features**:
✅ Online no-dues application submission  
✅ Multi-department approval workflow  
✅ Real-time email notifications  
✅ Staff scope filtering (school/course/branch)  
✅ Reapplication system for rejected forms  
✅ Certificate generation (automatic)  
✅ Manual certificate registration (offline completions)  
✅ CSV export (admin & staff)  
✅ Admin dashboard with analytics  
✅ Staff dashboard with actions  
✅ Mobile responsive design  
✅ Dark/Light theme support  

**Next Steps**:
1. Monitor system for first 24 hours
2. Collect user feedback
3. Address any issues
4. Plan for future enhancements

---

**Deployment Date**: ___________  
**Deployed By**: ___________  
**Production URL**: ___________  
**Admin Email**: ___________

*Keep this guide for future reference and system updates.*