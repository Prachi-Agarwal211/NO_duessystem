/**
 * Create Library Staff Account
 * 
 * This script creates a single library staff account:
 * Email: 15anuragsingh2003@gmail.com
 * Password: Test@1234
 * Role: department (Library staff)
 * 
 * Usage: node scripts/create-library-staff-account.js
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

// Library staff account configuration
const LIBRARY_STAFF = {
  email: '15anuragsingh2003@gmail.com',
  password: 'Test@1234',
  full_name: 'Anurag Singh',
  role: 'department',
  department_name: 'library',
  description: 'Library Department Staff'
};

async function createLibraryStaffAccount() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║        Creating Library Staff Account                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables. Check .env.local file.');
    }

    console.log('🔍 Checking if account already exists...\n');

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === LIBRARY_STAFF.email);

    if (existingUser) {
      console.log('⚠️  Account already exists!');
      console.log(`   Email: ${LIBRARY_STAFF.email}`);
      console.log(`   User ID: ${existingUser.id}\n`);

      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', existingUser.id)
        .single();

      if (profile) {
        console.log('✅ Profile exists with details:');
        console.log(`   Name: ${profile.full_name}`);
        console.log(`   Role: ${profile.role}`);
        console.log(`   Department: ${profile.department_name || 'N/A'}`);
        console.log(`   Active: ${profile.is_active}`);
        console.log('\n📝 Account is already set up and ready to use!');
      } else {
        console.log('⚠️  Auth user exists but profile is missing.');
        console.log('   Creating profile now...\n');

        // Create missing profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: existingUser.id,
            email: LIBRARY_STAFF.email,
            full_name: LIBRARY_STAFF.full_name,
            role: LIBRARY_STAFF.role,
            department_name: LIBRARY_STAFF.department_name,
            school_id: null,
            school_ids: null,
            course_ids: null,
            branch_ids: null,
            is_active: true
          }]);

        if (profileError) {
          throw profileError;
        }

        console.log('✅ Profile created successfully!');
      }
    } else {
      console.log('📧 Creating new account...');
      console.log(`   Email: ${LIBRARY_STAFF.email}`);
      console.log(`   Name: ${LIBRARY_STAFF.full_name}`);
      console.log(`   Department: ${LIBRARY_STAFF.department_name}`);
      console.log(`   Description: ${LIBRARY_STAFF.description}\n`);

      // Step 1: Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: LIBRARY_STAFF.email,
        password: LIBRARY_STAFF.password,
        email_confirm: true,
        user_metadata: {
          full_name: LIBRARY_STAFF.full_name,
          role: LIBRARY_STAFF.role,
          department_name: LIBRARY_STAFF.department_name
        }
      });

      if (authError) {
        throw authError;
      }

      console.log(`✅ Auth user created (ID: ${authData.user.id.substring(0, 8)}...)`);

      // Step 2: Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email: LIBRARY_STAFF.email,
          full_name: LIBRARY_STAFF.full_name,
          role: LIBRARY_STAFF.role,
          department_name: LIBRARY_STAFF.department_name,
          school_id: null,
          school_ids: null,
          course_ids: null,
          branch_ids: null,
          is_active: true
        }]);

      if (profileError) {
        // Rollback: delete the auth user if profile creation fails
        console.log('⚠️  Profile creation failed, rolling back...');
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      console.log('✅ Profile created');
      console.log('✅ Account fully configured');
    }

    // Print credentials and details
    console.log('\n\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║              LIBRARY STAFF ACCOUNT DETAILS                         ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    console.log('┌────────────────────────────────────────────────────────────────────┐');
    console.log('│ LIBRARY STAFF                                                      │');
    console.log('├────────────────────────────────────────────────────────────────────┤');
    console.log('│ Email:      15anuragsingh2003@gmail.com                            │');
    console.log('│ Password:   Test@1234                                              │');
    console.log('│ Name:       Anurag Singh                                           │');
    console.log('│ Role:       Department Staff                                       │');
    console.log('│ Department: Library                                                │');
    console.log('│ Access:     All library-related student requests                   │');
    console.log('└────────────────────────────────────────────────────────────────────┘');

    console.log('\n📍 Login Information:');
    console.log('─'.repeat(70));
    console.log('   Login URL: /staff/login');
    console.log('   Dashboard: /staff/dashboard (after login)');
    console.log('─'.repeat(70));

    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('─'.repeat(70));
    console.log('1. This account can view ALL students in the system');
    console.log('2. Can only approve/reject library clearance requests');
    console.log('3. Cannot modify other departments\' statuses');
    console.log('4. Recommended to change password after first login');
    console.log('5. Password: Test@1234 (case-sensitive)');
    console.log('─'.repeat(70));

    console.log('\n✅ Library staff account is ready to use!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check .env.local file exists in project root');
    console.error('  2. Verify NEXT_PUBLIC_SUPABASE_URL is set');
    console.error('  3. Verify SUPABASE_SERVICE_ROLE_KEY is set (not anon key!)');
    console.error('  4. Ensure database tables exist (run ULTIMATE_DATABASE_SETUP.sql)');
    console.error('  5. Check Supabase project is active and accessible');
    console.error('  6. Verify you have admin/service role permissions\n');
    process.exit(1);
  }
}

// Main execution
createLibraryStaffAccount()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });