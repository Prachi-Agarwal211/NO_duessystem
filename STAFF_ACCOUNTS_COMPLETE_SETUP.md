# Staff Accounts - Complete Setup Summary

## ✅ What Was Created

### 1. Production Staff Setup Script
**File**: `scripts/setup-production-staff-accounts.js`

A comprehensive Node.js script that automatically creates all 14 staff accounts with proper:
- ✅ Auth user creation in Supabase
- ✅ Profile records with correct roles
- ✅ Department assignments
- ✅ School/Course/Branch scoping for HODs
- ✅ Error handling and rollback on failures
- ✅ Detailed logging and verification

### 2. Complete Documentation
**File**: `PRODUCTION_STAFF_SETUP_GUIDE.md`

Full documentation covering:
- ✅ All 14 staff account configurations
- ✅ Scope explanations (Department Staff vs HODs)
- ✅ Step-by-step setup instructions
- ✅ Verification queries
- ✅ Troubleshooting guide
- ✅ Security notes

## 📋 All 14 Staff Accounts

### Admin (1 account)
```
Email: admin@jecrcu.edu.in
Password: Admin@2025
Access: Full system (all students, all departments)
```

### Department Staff (9 accounts - See ALL students)
```
1. surbhi.jetavat@jecrcu.edu.in        (Accounts)
2. vishaltiwari642@gmail.com           (Library) 
3. seniormanager.it@jecrcu.edu.in      (IT Department)
4. sailendra.trivedi@jecrcu.edu.in     (Mess)
5. akshar.bhardwaj@jecrcu.edu.in       (Hostel)
6. anurag.sharma@jecrcu.edu.in         (Alumni)
7. ganesh.jat@jecrcu.edu.in            (Registrar)
8. umesh.sharma@jecrcu.edu.in          (Canteen)
9. arjit.jain@jecrcu.edu.in            (TPO)

Password: Test@1234 (all)
```

### School HODs (4 accounts - SCOPED access)
```
1. prachiagarwal211@gmail.com
   Scope: BCA/MCA (22 branches)

2. 15anuragsingh2003@gmail.com
   Scope: CSE only (16 branches: 15 B.Tech + 1 M.Tech)

3. anurag.22bcom1367@jecrcu.edu.in
   Scope: MBA, BBA, BCOM (all branches)

4. razorrag.official@gmail.com
   Scope: JMC, Hotel, Design, Law, Science, Humanities
          (all courses and branches in these 6 schools)

Password: Test@1234 (all)
```

## 🎯 Key Features of the Setup

### 1. Intelligent Scoping System
The script automatically:
- Fetches school IDs from database
- Resolves course IDs based on school
- Maps branch IDs based on course and branch names
- Handles both single-school and multi-school HODs
- Sets NULL values for "see all students" access

### 2. Proper CSE Branch Handling
For `15anuragsingh2003@gmail.com`:
- ✅ Only sees CSE branches (16 total)
- ✅ Includes 15 B.Tech CSE specializations
- ✅ Includes 1 M.Tech CSE branch
- ❌ Does NOT see other B.Tech branches (ECE, Civil, Mechanical, etc.)

### 3. Multi-School Support
For `razorrag.official@gmail.com`:
- ✅ Sees students from 6 different schools
- ✅ All courses in those schools
- ✅ All branches in those courses
- Estimated ~40 branches across all schools

### 4. Database Integrity
- Creates auth user first
- Then creates profile record
- Automatic rollback if profile creation fails
- Prevents orphaned auth users

## 🚀 How to Run the Setup

### Step 1: Ensure Environment Variables
```bash
# Check .env.local has:
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### Step 2: Run the Script
```bash
node scripts/setup-production-staff-accounts.js
```

### Step 3: Verify Output
Look for:
```
✅ Successfully Created: 14
⚠️  Already Exist (Skipped): 0
❌ Errors: 0
```

## 🔍 Verification After Setup

### Check All Accounts
```sql
SELECT 
  email,
  full_name,
  role,
  department_name,
  CASE 
    WHEN school_ids IS NULL THEN 'ALL STUDENTS'
    ELSE array_length(school_ids, 1)::text || ' schools'
  END as scope
FROM profiles
WHERE role IN ('admin', 'department')
ORDER BY role, department_name;
```

Expected: 14 rows (1 admin + 13 department staff/HODs)

### Verify HOD Scoping
```sql
SELECT 
  email,
  array_length(school_ids, 1) as schools,
  array_length(course_ids, 1) as courses,
  array_length(branch_ids, 1) as branches
FROM profiles
WHERE department_name = 'school_hod';
```

Expected results:
| Email | Schools | Courses | Branches |
|-------|---------|---------|----------|
| prachiagarwal211@gmail.com | 1 | 2 | 22 |
| 15anuragsingh2003@gmail.com | 1 | 2 | 16 |
| anurag.22bcom1367@jecrcu.edu.in | 1 | 3 | ~15 |
| razorrag.official@gmail.com | 6 | ~20 | ~40 |

## 🧪 Testing Checklist

### Test 1: Admin Login
```
✅ Login: admin@jecrcu.edu.in / Admin@2025
✅ Should see: All forms from all students
✅ Should access: Admin dashboard with full controls
```

### Test 2: Department Staff Login
```
✅ Login: surbhi.jetavat@jecrcu.edu.in / Test@1234
✅ Should see: All pending forms (no filtering)
✅ Should approve/reject: For Accounts department only
```

### Test 3: BCA/MCA HOD Login
```
✅ Login: prachiagarwal211@gmail.com / Test@1234
✅ Should see: Only BCA/MCA students
❌ Should NOT see: CSE, MBA, or other students
✅ Should approve/reject: For School HOD department
```

### Test 4: CSE HOD Login
```
✅ Login: 15anuragsingh2003@gmail.com / Test@1234
✅ Should see: Only 16 CSE branches (15 B.Tech + 1 M.Tech)
❌ Should NOT see: ECE, Mechanical, Civil, or other branches
❌ Should NOT see: BCA, MCA, or non-engineering students
```

### Test 5: Multi-School HOD Login
```
✅ Login: razorrag.official@gmail.com / Test@1234
✅ Should see: Students from JMC, Hotel, Design, Law, Science, Humanities
❌ Should NOT see: Engineering, BCA/MCA, or Business students
```

## 📊 Access Matrix

| Account Type | School Filter | Course Filter | Branch Filter | Sees All Students |
|--------------|---------------|---------------|---------------|-------------------|
| **Admin** | ❌ None | ❌ None | ❌ None | ✅ YES |
| **Dept Staff** | ❌ None | ❌ None | ❌ None | ✅ YES |
| **BCA/MCA HOD** | ✅ 1 school | ✅ 2 courses | ✅ 22 branches | ❌ NO |
| **CSE HOD** | ✅ 1 school | ✅ 2 courses | ✅ 16 branches | ❌ NO |
| **Business HOD** | ✅ 1 school | ✅ 3 courses | ✅ ~15 branches | ❌ NO |
| **Multi HOD** | ✅ 6 schools | ✅ ~20 courses | ✅ ~40 branches | ❌ NO |

## 🔐 Security Considerations

1. **Password Policy**
   - Admin: Custom strong password (Admin@2025)
   - Staff: Default password (Test@1234) - MUST change after first login

2. **Service Role Key**
   - Never commit to git
   - Store in .env.local (gitignored)
   - Use in Vercel environment variables

3. **RLS Policies**
   - Verify profiles table has proper RLS
   - HOD scoping enforced at API level
   - Department staff can only approve/reject for their department

## 🐛 Common Issues and Solutions

### Issue: "Missing Supabase credentials"
**Solution**: Ensure `.env.local` has both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Issue: "Account already exists"
**Solution**: Normal if re-running script. Script will skip existing accounts.

### Issue: "Error fetching school/course/branch"
**Solution**: Check that school/course/branch names in script match database exactly (case-sensitive)

### Issue: "HOD sees wrong students"
**Solution**: 
1. Check their `school_ids`, `course_ids`, `branch_ids` in database
2. Verify filtering logic in `/api/staff/dashboard`
3. Re-run script to reset scoping

### Issue: "Profile creation failed"
**Solution**:
1. Check database constraints
2. Verify RLS policies allow service role to insert
3. Check Supabase logs for detailed error

## 📝 Next Steps

### Immediate (Required)
1. ✅ Run `node scripts/setup-production-staff-accounts.js`
2. ✅ Verify all 14 accounts created successfully
3. ✅ Test login for each account type
4. ✅ Verify HOD scoping works correctly

### Short-term (Recommended)
1. ✅ Submit a test form as a student
2. ✅ Verify correct staff receive email notifications
3. ✅ Test approval/rejection workflow
4. ✅ Verify certificate generation works

### Long-term (Security)
1. ⚠️ Force password change on first login
2. 🔒 Implement password complexity requirements
3. 📧 Set up email verification
4. 🔐 Enable 2FA for admin account

## 📞 Support

If you encounter issues:
1. Check script output for specific error messages
2. Verify Supabase logs: Dashboard → Logs → Postgres Logs
3. Check application logs: Vercel → Deployments → Functions
4. Verify environment variables in Vercel dashboard
5. Review `PRODUCTION_STAFF_SETUP_GUIDE.md` for detailed troubleshooting

## 📚 Related Documentation

- `PRODUCTION_STAFF_SETUP_GUIDE.md` - Detailed setup instructions
- `scripts/setup-production-staff-accounts.js` - The setup script
- `FINAL_COMPLETE_DATABASE_SETUP.sql` - Database schema
- `ALL_FIXES_IMPLEMENTED_COMPLETE.md` - System fixes documentation

---

**Created**: December 12, 2024
**Script Version**: 1.0
**Total Accounts**: 14 (1 Admin + 9 Dept Staff + 4 HODs)
**Status**: ✅ Ready for Production Setup