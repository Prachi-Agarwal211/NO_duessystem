/**
 * Create 7 Department Staff Accounts for JECRC No Dues System
 * 
 * This script creates both auth users and profiles for:
 * 1. Library: vishal.tiwari@jecrcu.edu.in
 * 2. IT Department: seniormanager.it@jecrcu.edu.in
 * 3. Mess: sailendra.trivedi@jecrcu.edu.in
 * 4. Hostel: akshar.bhardwaj@jecrcu.edu.in
 * 5. Alumni: anurag.sharma@jecrcu.edu.in
 * 6. Registrar: coe@jecrcu.edu.in
 * 7. Canteen: umesh.sharma@jecrcu.edu.in
 * 
 * All with password: Test@1234
 * 
 * Usage: node scripts/create-department-staff.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Create Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Department staff accounts to create
const DEPARTMENT_STAFF = [
  {
    email: 'vishal.tiwari@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Vishal Tiwari',
    role: 'department',
    department_name: 'library',
    description: 'Library Department Staff'
  },
  {
    email: 'seniormanager.it@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'IT Department Manager',
    role: 'department',
    department_name: 'it_department',
    description: 'IT Department Staff'
  },
  {
    email: 'sailendra.trivedi@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Sailendra Trivedi',
    role: 'department',
    department_name: 'mess',
    description: 'Mess Department Staff'
  },
  {
    email: 'akshar.bhardwaj@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Akshar Bhardwaj',
    role: 'department',
    department_name: 'hostel',
    description: 'Hostel Department Staff'
  },
  {
    email: 'anurag.sharma@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Anurag Sharma',
    role: 'department',
    department_name: 'alumni_association',
    description: 'Alumni Association Staff'
  },
  {
    email: 'coe@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Controller of Examinations',
    role: 'department',
    department_name: 'registrar',
    description: 'Registrar (COE)'
  },
  {
    email: 'umesh.sharma@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Umesh Sharma',
    role: 'department',
    department_name: 'canteen',
    description: 'Canteen Department Staff'
  }
];

async function createDepartmentStaff() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     Creating 7 Department Staff Accounts               ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables. Check .env.local file.');
    }

    console.log('🔍 Checking for existing accounts...\n');

    // Get all existing users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingEmails = new Set(existingUsers.users.map(u => u.email));

    const results = {
      created: [],
      skipped: [],
      errors: []
    };

    // Create each department staff account
    for (const staff of DEPARTMENT_STAFF) {
      console.log(`\n📧 Processing: ${staff.email}`);
      console.log(`   Name: ${staff.full_name}`);
      console.log(`   Department: ${staff.department_name}`);
      console.log(`   Description: ${staff.description}`);

      // Check if user already exists
      if (existingEmails.has(staff.email)) {
        console.log(`   ⚠️  Account already exists - SKIPPING`);
        results.skipped.push(staff.email);
        continue;
      }

      try {
        // Step 1: Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: staff.email,
          password: staff.password,
          email_confirm: true,
          user_metadata: {
            full_name: staff.full_name,
            role: staff.role,
            department_name: staff.department_name
          }
        });

        if (authError) {
          throw authError;
        }

        console.log(`   ✅ Auth user created (ID: ${authData.user.id.substring(0, 8)}...)`);

        // Step 2: Create profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            email: staff.email,
            full_name: staff.full_name,
            role: staff.role,
            department_name: staff.department_name,
            school_id: null,  // NULL = sees all students (non-HOD departments)
            school_ids: null,
            course_ids: null,
            branch_ids: null,
            is_active: true
          }]);

        if (profileError) {
          // Rollback: delete the auth user if profile creation fails
          console.log(`   ⚠️  Profile creation failed, rolling back...`);
          await supabase.auth.admin.deleteUser(authData.user.id);
          throw profileError;
        }

        console.log(`   ✅ Profile created`);
        console.log(`   ✅ Account fully configured`);
        
        results.created.push(staff.email);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.errors.push({ email: staff.email, error: error.message });
      }
    }

    // Print summary
    console.log('\n\n╔════════════════════════════════════════════════════════╗');
    console.log('║              ACCOUNT CREATION SUMMARY                   ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    if (results.created.length > 0) {
      console.log('✅ Successfully Created:');
      console.log('─'.repeat(70));
      results.created.forEach(email => console.log(`   ✓ ${email}`));
      console.log('─'.repeat(70));
    }

    if (results.skipped.length > 0) {
      console.log('\n⚠️  Already Exist (Skipped):');
      console.log('─'.repeat(70));
      results.skipped.forEach(email => console.log(`   ⊘ ${email}`));
      console.log('─'.repeat(70));
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      console.log('─'.repeat(70));
      results.errors.forEach(err => console.log(`   ✗ ${err.email}: ${err.error}`));
      console.log('─'.repeat(70));
    }

    // Print login credentials table
    console.log('\n\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║              ALL DEPARTMENT STAFF CREDENTIALS                      ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    console.log('┌────────────────────────────────────────────────────────────────────┐');
    console.log('│ 1. LIBRARY STAFF                                                   │');
    console.log('├────────────────────────────────────────────────────────────────────┤');
    console.log('│ Email:      vishal.tiwari@jecrcu.edu.in                            │');
    console.log('│ Password:   Test@1234                                              │');
    console.log('│ Department: Library                                                │');
    console.log('│ Access:     All library-related student requests                   │');
    console.log('└────────────────────────────────────────────────────────────────────┘');

    console.log('\n┌────────────────────────────────────────────────────────────────────┐');
    console.log('│ 2. IT DEPARTMENT STAFF                                             │');
    console.log('├────────────────────────────────────────────────────────────────────┤');
    console.log('│ Email:      seniormanager.it@jecrcu.edu.in                         │');
    console.log('│ Password:   Test@1234                                              │');
    console.log('│ Department: IT Department                                          │');
    console.log('│ Access:     All IT-related student requests                        │');
    console.log('└────────────────────────────────────────────────────────────────────┘');

    console.log('\n┌────────────────────────────────────────────────────────────────────┐');
    console.log('│ 3. MESS STAFF                                                      │');
    console.log('├────────────────────────────────────────────────────────────────────┤');
    console.log('│ Email:      sailendra.trivedi@jecrcu.edu.in                        │');
    console.log('│ Password:   Test@1234                                              │');
    console.log('│ Department: Mess                                                   │');
    console.log('│ Access:     All mess-related student requests                      │');
    console.log('└────────────────────────────────────────────────────────────────────┘');

    console.log('\n┌────────────────────────────────────────────────────────────────────┐');
    console.log('│ 4. HOSTEL STAFF                                                    │');
    console.log('├────────────────────────────────────────────────────────────────────┤');
    console.log('│ Email:      akshar.bhardwaj@jecrcu.edu.in                          │');
    console.log('│ Password:   Test@1234                                              │');
    console.log('│ Department: Hostel                                                 │');
    console.log('│ Access:     All hostel-related student requests                    │');
    console.log('└────────────────────────────────────────────────────────────────────┘');

    console.log('\n┌────────────────────────────────────────────────────────────────────┐');
    console.log('│ 5. ALUMNI ASSOCIATION STAFF                                        │');
    console.log('├────────────────────────────────────────────────────────────────────┤');
    console.log('│ Email:      anurag.sharma@jecrcu.edu.in                            │');
    console.log('│ Password:   Test@1234                                              │');
    console.log('│ Department: Alumni Association                                     │');
    console.log('│ Access:     All alumni-related student requests                    │');
    console.log('└────────────────────────────────────────────────────────────────────┘');

    console.log('\n┌────────────────────────────────────────────────────────────────────┐');
    console.log('│ 6. REGISTRAR (COE)                                                 │');
    console.log('├────────────────────────────────────────────────────────────────────┤');
    console.log('│ Email:      coe@jecrcu.edu.in                                      │');
    console.log('│ Password:   Test@1234                                              │');
    console.log('│ Department: Registrar                                              │');
    console.log('│ Access:     All registrar-related student requests                 │');
    console.log('└────────────────────────────────────────────────────────────────────┘');

    console.log('\n┌────────────────────────────────────────────────────────────────────┐');
    console.log('│ 7. CANTEEN STAFF                                                   │');
    console.log('├────────────────────────────────────────────────────────────────────┤');
    console.log('│ Email:      umesh.sharma@jecrcu.edu.in                             │');
    console.log('│ Password:   Test@1234                                              │');
    console.log('│ Department: Canteen                                                │');
    console.log('│ Access:     All canteen-related student requests                   │');
    console.log('└────────────────────────────────────────────────────────────────────┘');

    console.log('\n\n⚠️  IMPORTANT NOTES:');
    console.log('─'.repeat(70));
    console.log('1. All accounts use password: Test@1234');
    console.log('2. Users should change password after first login');
    console.log('3. All staff can see ALL students (no school/course filtering)');
    console.log('4. Each staff member can only approve/reject for their department');
    console.log('5. Login URL: https://nodues.jecrcuniversity.edu.in/staff/login');
    console.log('6. Staff dashboard: /staff/dashboard (after login)');
    console.log('─'.repeat(70));

    console.log('\n✅ Department staff account setup complete!\n');

    // Print summary statistics
    console.log('📊 Statistics:');
    console.log(`   Created: ${results.created.length}`);
    console.log(`   Skipped: ${results.skipped.length}`);
    console.log(`   Errors:  ${results.errors.length}`);
    console.log(`   Total:   ${DEPARTMENT_STAFF.length}\n`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check .env.local file exists in project root');
    console.error('  2. Verify NEXT_PUBLIC_SUPABASE_URL is set');
    console.error('  3. Verify SUPABASE_SERVICE_ROLE_KEY is set (not anon key!)');
    console.error('  4. Ensure database tables exist (run migration scripts first)');
    console.error('  5. Check Supabase project is active and accessible');
    console.error('  6. Verify you have admin/service role permissions\n');
    process.exit(1);
  }
}

// Main execution
createDepartmentStaff()
  .then(() => {
    console.log('✅ Script completed successfully');
    console.log('🚀 Staff can now login at: https://nodues.jecrcuniversity.edu.in/staff/login\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });