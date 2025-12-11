/**
 * JECRC No Dues System - Verify Staff Migration
 * 
 * This script verifies that all staff accounts were migrated correctly
 * and displays detailed information about each account's scoping
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const EXPECTED_STAFF = [
  { email: 'surbhi.jetavat@jecrcu.edu.in', dept: 'accounts_department', type: 'department' },
  { email: 'vishal.tiwari@jecrcu.edu.in', dept: 'library', type: 'department' },
  { email: 'seniormanager.it@jecrcu.edu.in', dept: 'it_department', type: 'department' },
  { email: 'sailendra.trivedi@jecrcu.edu.in', dept: 'mess', type: 'department' },
  { email: 'akshar.bhardwaj@jecrcu.edu.in', dept: 'hostel', type: 'department' },
  { email: 'anurag.sharma@jecrcu.edu.in', dept: 'alumni_association', type: 'department' },
  { email: 'ganesh.jat@jecrcu.edu.in', dept: 'registrar', type: 'department' },
  { email: 'umesh.sharma@jecrcu.edu.in', dept: 'canteen', type: 'department' },
  { email: 'arjit.jain@jecrcu.edu.in', dept: 'tpo', type: 'department' },
  { email: 'prachiagarwal211@gmail.com', dept: 'school_hod', type: 'hod', schools: 1, courses: 2 },
  { email: '15anuragsingh2003@gmail.com', dept: 'school_hod', type: 'hod', schools: 1, courses: 2, branches: 16 },
  { email: 'anurag.22bcom1367@jecrcu.edu.in', dept: 'school_hod', type: 'hod', schools: 1, courses: 3 },
  { email: 'razorrag.official@gmail.com', dept: 'school_hod', type: 'hod', schools: 6 }
];

async function getSchoolName(schoolId) {
  const { data } = await supabase
    .from('config_schools')
    .select('name')
    .eq('id', schoolId)
    .single();
  return data?.name || 'Unknown';
}

async function getCourseNames(courseIds) {
  if (!courseIds || courseIds.length === 0) return [];
  const { data } = await supabase
    .from('config_courses')
    .select('name')
    .in('id', courseIds);
  return data?.map(c => c.name) || [];
}

async function verifyStaffAccounts() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  STAFF ACCOUNT MIGRATION VERIFICATION                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Fetch all department staff
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, department_name, school_ids, course_ids, branch_ids, is_active')
    .eq('role', 'department')
    .order('department_name');

  if (error) {
    console.error('❌ Error fetching profiles:', error.message);
    return false;
  }

  console.log(`📊 Found ${profiles.length} staff accounts\n`);

  let allCorrect = true;
  const foundEmails = new Set();

  // Check each expected account
  for (const expected of EXPECTED_STAFF) {
    const profile = profiles.find(p => p.email === expected.email);
    
    if (!profile) {
      console.log(`❌ MISSING: ${expected.email}`);
      allCorrect = false;
      continue;
    }

    foundEmails.add(expected.email);
    
    console.log(`✅ ${profile.email}`);
    console.log(`   Name: ${profile.full_name}`);
    console.log(`   Department: ${profile.department_name}`);
    console.log(`   Active: ${profile.is_active ? 'Yes' : 'No'}`);

    // Verify department assignment
    if (profile.department_name !== expected.dept) {
      console.log(`   ⚠️  Wrong department! Expected: ${expected.dept}, Got: ${profile.department_name}`);
      allCorrect = false;
    }

    // Check scoping
    const schoolCount = profile.school_ids?.length || 0;
    const courseCount = profile.course_ids?.length || 0;
    const branchCount = profile.branch_ids?.length || 0;

    if (expected.type === 'department') {
      // Non-HOD should see all students
      if (schoolCount > 0 || courseCount > 0 || branchCount > 0) {
        console.log(`   ⚠️  Should see ALL students but has scoping!`);
        allCorrect = false;
      } else {
        console.log(`   ✓ Scope: All students`);
      }
    } else if (expected.type === 'hod') {
      // HOD should have proper scoping
      console.log(`   ✓ Schools: ${schoolCount}`);
      
      if (expected.schools && schoolCount !== expected.schools) {
        console.log(`   ⚠️  Expected ${expected.schools} school(s), got ${schoolCount}`);
        allCorrect = false;
      }

      if (expected.courses) {
        console.log(`   ✓ Courses: ${courseCount}`);
        if (courseCount !== expected.courses) {
          console.log(`   ⚠️  Expected ${expected.courses} course(s), got ${courseCount}`);
          allCorrect = false;
        }
        
        // Show course names
        if (profile.course_ids && profile.course_ids.length > 0) {
          const courseNames = await getCourseNames(profile.course_ids);
          console.log(`   ✓ Course names: ${courseNames.join(', ')}`);
        }
      } else {
        console.log(`   ✓ Courses: All in selected schools`);
      }

      if (expected.branches) {
        console.log(`   ✓ Branches: ${branchCount}`);
        if (branchCount !== expected.branches) {
          console.log(`   ⚠️  Expected ${expected.branches} branch(es), got ${branchCount}`);
          allCorrect = false;
        }
      } else {
        console.log(`   ✓ Branches: All in selected courses`);
      }

      // Show school names
      if (profile.school_ids && profile.school_ids.length > 0) {
        const schoolNames = [];
        for (const schoolId of profile.school_ids) {
          schoolNames.push(await getSchoolName(schoolId));
        }
        console.log(`   ✓ School names: ${schoolNames.join(', ')}`);
      }
    }

    console.log('');
  }

  // Check for unexpected accounts
  const unexpectedAccounts = profiles.filter(p => !foundEmails.has(p.email));
  if (unexpectedAccounts.length > 0) {
    console.log(`⚠️  Found ${unexpectedAccounts.length} unexpected account(s):`);
    unexpectedAccounts.forEach(account => {
      console.log(`   - ${account.email} (${account.department_name})`);
    });
    console.log('');
  }

  return allCorrect;
}

async function verifyDepartmentEmails() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  DEPARTMENT EMAIL ADDRESSES                           ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const { data: departments, error } = await supabase
    .from('departments')
    .select('name, display_name, email, display_order')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('❌ Error fetching departments:', error.message);
    return false;
  }

  const EXPECTED_EMAILS = {
    'accounts_department': 'surbhi.jetavat@jecrcu.edu.in',
    'library': 'vishal.tiwari@jecrcu.edu.in',
    'it_department': 'seniormanager.it@jecrcu.edu.in',
    'mess': 'sailendra.trivedi@jecrcu.edu.in',
    'hostel': 'akshar.bhardwaj@jecrcu.edu.in',
    'alumni_association': 'anurag.sharma@jecrcu.edu.in',
    'registrar': 'ganesh.jat@jecrcu.edu.in',
    'canteen': 'umesh.sharma@jecrcu.edu.in',
    'tpo': 'arjit.jain@jecrcu.edu.in',
    'school_hod': 'hod@jecrcu.edu.in'
  };

  let allCorrect = true;

  for (const dept of departments) {
    const expectedEmail = EXPECTED_EMAILS[dept.name];
    const status = dept.email === expectedEmail ? '✅' : '❌';
    
    console.log(`${status} ${dept.display_name.padEnd(30)} ${dept.email}`);
    
    if (dept.email !== expectedEmail) {
      console.log(`   Expected: ${expectedEmail}`);
      allCorrect = false;
    }
  }

  console.log('');
  return allCorrect;
}

async function checkAdminAccount() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  ADMIN ACCOUNT                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const { data: admin, error } = await supabase
    .from('profiles')
    .select('email, full_name, role, is_active')
    .eq('role', 'admin')
    .single();

  if (error || !admin) {
    console.log('❌ Admin account not found!');
    return false;
  }

  console.log(`✅ ${admin.email}`);
  console.log(`   Name: ${admin.full_name}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   Active: ${admin.is_active ? 'Yes' : 'No'}\n`);

  return admin.email === 'admin@jecrcu.edu.in';
}

async function main() {
  try {
    const staffOk = await verifyStaffAccounts();
    const emailsOk = await verifyDepartmentEmails();
    const adminOk = await checkAdminAccount();

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  VERIFICATION SUMMARY                                 ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log(`Staff Accounts: ${staffOk ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Department Emails: ${emailsOk ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Admin Account: ${adminOk ? '✅ PASSED' : '❌ FAILED'}`);

    if (staffOk && emailsOk && adminOk) {
      console.log('\n✅ ALL VERIFICATIONS PASSED!\n');
      console.log('Next steps:');
      console.log('1. Test login for each staff account');
      console.log('2. Submit a test form and verify email notifications');
      console.log('3. Check HOD dashboard filtering');
      console.log('4. Test approve/reject workflow\n');
    } else {
      console.log('\n❌ SOME VERIFICATIONS FAILED!\n');
      console.log('Please review the issues above and:');
      console.log('1. Re-run UPDATE_DEPARTMENT_EMAILS.sql if emails are wrong');
      console.log('2. Re-run migrate-staff-accounts.js if accounts are missing');
      console.log('3. Check Supabase logs for errors\n');
    }

  } catch (error) {
    console.error('\n❌ Verification error:', error);
    process.exit(1);
  }
}

main();