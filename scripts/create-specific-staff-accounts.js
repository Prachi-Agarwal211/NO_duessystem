/**
 * Create Specific Staff Accounts for JECRC No Dues System
 * 
 * This script creates:
 * 1. Admin: razorrag.official@gmail.com
 * 2. Library Staff: 15anuragsingh2003@gmail.com
 * 3. Accounts Staff: prachiagarwal211@gmail.com
 * 4. HOD (Computer Science): anurag.22bcom1367@jecrcu.edu.in
 * 
 * All with password: Test@1234
 * 
 * Usage: node scripts/create-specific-staff-accounts.js
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

// Staff accounts to create
const STAFF_ACCOUNTS = [
  {
    email: 'razorrag.official@gmail.com',
    password: 'Test@1234',
    full_name: 'System Administrator',
    role: 'admin',
    department_name: null,
    school_name: null,
    description: 'Main Admin Account'
  },
  {
    email: '15anuragsingh2003@gmail.com',
    password: 'Test@1234',
    full_name: 'Anurag Singh',
    role: 'department',
    department_name: 'library',
    school_name: null,
    description: 'Library Department Staff'
  },
  {
    email: 'prachiagarwal211@gmail.com',
    password: 'Test@1234',
    full_name: 'Prachi Agarwal',
    role: 'department',
    department_name: 'school_hod',
    school_name: 'School of Computer Applications',
    description: 'HOD for School of Computer Applications (BCA/MCA only)'
  },
  {
    email: 'anurag.22bcom1367@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Anurag Kumar',
    role: 'department',
    department_name: 'school_hod',
    school_name: 'School of Engineering & Technology',
    description: 'HOD for School of Engineering & Technology (B.Tech/M.Tech CSE only)'
  }
];

async function createStaffAccounts() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     Creating Specific Staff Accounts                   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
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

    // Create each staff account
    for (const staff of STAFF_ACCOUNTS) {
      console.log(`\n📧 Processing: ${staff.email}`);
      console.log(`   Role: ${staff.role}`);
      console.log(`   Department: ${staff.department_name || 'N/A (Admin)'}`);
      console.log(`   School Filter: ${staff.school_name || 'All Schools'}`);
      console.log(`   Description: ${staff.description}`);

      // Check if user already exists
      if (existingEmails.has(staff.email)) {
        console.log(`   ⚠️  Account already exists - SKIPPING`);
        results.skipped.push(staff.email);
        continue;
      }

      try {
        // Create user in Supabase Auth
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

        console.log(`   ✅ Authentication record created`);

        // Get school_id if school_name is provided
        let school_id = null;
        if (staff.school_name) {
          const { data: schoolData } = await supabase
            .from('config_schools')
            .select('id')
            .eq('name', staff.school_name)
            .single();
          
          if (schoolData) {
            school_id = schoolData.id;
            console.log(`   ✅ School ID retrieved: ${school_id}`);
          }
        }

        // Create profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            email: staff.email,
            full_name: staff.full_name,
            role: staff.role,
            department_name: staff.department_name,
            school_id: school_id,
            is_active: true
          }]);

        if (profileError) {
          // Rollback: delete the auth user if profile creation fails
          await supabase.auth.admin.deleteUser(authData.user.id);
          throw profileError;
        }

        console.log(`   ✅ Profile record created`);
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
      console.log('─'.repeat(60));
      results.created.forEach(email => console.log(`   ✓ ${email}`));
      console.log('─'.repeat(60));
    }

    if (results.skipped.length > 0) {
      console.log('\n⚠️  Already Exist (Skipped):');
      console.log('─'.repeat(60));
      results.skipped.forEach(email => console.log(`   ⊘ ${email}`));
      console.log('─'.repeat(60));
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      console.log('─'.repeat(60));
      results.errors.forEach(err => console.log(`   ✗ ${err.email}: ${err.error}`));
      console.log('─'.repeat(60));
    }

    // Print login credentials table
    console.log('\n\n╔════════════════════════════════════════════════════════╗');
    console.log('║              ALL ACCOUNT CREDENTIALS                    ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ ADMIN ACCOUNT                                                       │');
    console.log('├─────────────────────────────────────────────────────────────────────┤');
    console.log('│ Email:    razorrag.official@gmail.com                               │');
    console.log('│ Password: Test@1234                                                 │');
    console.log('│ Role:     Admin (Full Access)                                       │');
    console.log('│ Login:    /staff/login                                              │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');

    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ LIBRARY STAFF                                                       │');
    console.log('├─────────────────────────────────────────────────────────────────────┤');
    console.log('│ Email:    15anuragsingh2003@gmail.com                               │');
    console.log('│ Password: Test@1234                                                 │');
    console.log('│ Role:     Department Staff (Library)                                │');
    console.log('│ Login:    /staff/login                                              │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');

    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ ACCOUNTS STAFF                                                      │');
    console.log('├─────────────────────────────────────────────────────────────────────┤');
    console.log('│ Email:    prachiagarwal211@gmail.com                                │');
    console.log('│ Password: Test@1234                                                 │');
    console.log('│ Role:     Department Staff (Accounts)                               │');
    console.log('│ Login:    /staff/login                                              │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');

    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ HOD COMPUTER SCIENCE                                                │');
    console.log('├─────────────────────────────────────────────────────────────────────┤');
    console.log('│ Email:    anurag.22bcom1367@jecrcu.edu.in                           │');
    console.log('│ Password: Test@1234                                                 │');
    console.log('│ Role:     Department Staff (School HOD)                             │');
    console.log('│ Manages:  BCA/MCA forms from School of Computer Applications        │');
    console.log('│ Login:    /staff/login                                              │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');

    console.log('\n\n⚠️  IMPORTANT NOTES:');
    console.log('─'.repeat(60));
    console.log('1. All accounts use password: Test@1234');
    console.log('2. Users should change password after first login');
    console.log('3. Admin has full access to all features');
    console.log('4. Department staff can only manage their department forms');
    console.log('5. HOD staff are filtered by school - they only see their school forms');
    console.log('6. Prachi sees: BCA/MCA forms from Computer Applications school');
    console.log('7. Anurag sees: B.Tech/M.Tech CSE forms from Engineering school');
    console.log('─'.repeat(60));

    console.log('\n✅ Staff account setup complete!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check .env.local file exists');
    console.error('  2. Verify NEXT_PUBLIC_SUPABASE_URL is set');
    console.error('  3. Verify SUPABASE_SERVICE_ROLE_KEY is set');
    console.error('  4. Ensure database tables exist (run FINAL_COMPLETE_DATABASE_SETUP.sql)');
    console.error('  5. Check Supabase project is active\n');
    process.exit(1);
  }
}

// Main execution
createStaffAccounts()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });