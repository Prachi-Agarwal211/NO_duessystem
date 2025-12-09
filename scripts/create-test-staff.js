/**
 * Create Test Staff Account for Library
 * 
 * Creates a staff account for testing email notifications:
 * Email: 15anuragsingh2003@gmail.com
 * Password: Test@1234
 * Department: Library
 * 
 * Usage: node scripts/create-test-staff.js
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

// Test staff credentials
const STAFF_EMAIL = '15anuragsingh2003@gmail.com';
const STAFF_PASSWORD = 'Test@1234';
const STAFF_NAME = 'Library Test Staff';
const DEPARTMENT = 'library'; // Use the exact department name from database

async function createTestStaff() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║         Creating Test Library Staff Account            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Check if staff already exists
    console.log('🔍 Checking for existing staff account...\n');
    
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const staffExists = existingUsers.users.some(u => u.email === STAFF_EMAIL);

    if (staffExists) {
      console.log('⚠️  Staff account already exists with email:', STAFF_EMAIL);
      console.log('\nTo recreate:');
      console.log('1. Delete existing account from Supabase Dashboard → Authentication → Users');
      console.log('2. Run this script again\n');
      return;
    }

    // Verify department exists
    console.log('🔍 Verifying Library department exists...\n');
    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('name, display_name')
      .eq('name', DEPARTMENT)
      .single();

    if (deptError || !department) {
      console.error('❌ Library department not found in database!');
      console.log('\nAvailable departments:');
      const { data: allDepts } = await supabase
        .from('departments')
        .select('name, display_name')
        .order('display_order');
      
      if (allDepts) {
        allDepts.forEach(d => console.log(`   - ${d.name} (${d.display_name})`));
      }
      throw new Error('Department validation failed');
    }

    console.log(`✅ Department verified: ${department.display_name}\n`);
    console.log('✅ No existing staff found. Creating new account...\n');

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: STAFF_EMAIL,
      password: STAFF_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: STAFF_NAME,
        role: 'department',
        department_name: DEPARTMENT
      }
    });

    if (authError) {
      console.error('❌ Auth Error:', authError.message);
      throw authError;
    }

    console.log('✅ Authentication record created');

    // Create profile record
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        full_name: STAFF_NAME,
        email: STAFF_EMAIL,
        role: 'department',
        department_name: DEPARTMENT,
        school_ids: null, // No scope restrictions for testing
        course_ids: null,
        branch_ids: null
      }])
      .select()
      .single();

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      console.error('❌ Profile Error:', profileError.message);
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error('Failed to create profile. Auth user rolled back.');
    }

    console.log('✅ Profile record created\n');
    
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║        Test Library Staff Account Created!             ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 Account Details:');
    console.log('─'.repeat(60));
    console.log(`   Name:         ${STAFF_NAME}`);
    console.log(`   Email:        ${STAFF_EMAIL}`);
    console.log(`   Password:     ${STAFF_PASSWORD}`);
    console.log(`   Department:   ${department.display_name}`);
    console.log(`   Role:         department staff`);
    console.log(`   User ID:      ${profile.id}`);
    console.log(`   Created:      ${new Date().toISOString()}`);
    console.log('─'.repeat(60));
    
    console.log('\n🌐 Login Information:');
    console.log('─'.repeat(60));
    console.log(`   URL:          ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/staff/login`);
    console.log(`   Email:        ${STAFF_EMAIL}`);
    console.log(`   Password:     ${STAFF_PASSWORD}`);
    console.log('─'.repeat(60));
    
    console.log('\n📧 Email Testing:');
    console.log('─'.repeat(60));
    console.log('   1. Submit a test student form');
    console.log(`   2. Check ${STAFF_EMAIL} for notification`);
    console.log('   3. Login to staff dashboard to review form');
    console.log('   4. Approve/Reject to test staff actions');
    console.log('─'.repeat(60));
    
    console.log('\n✅ Run test again to verify:');
    console.log('   node scripts/test-unified-notifications.js\n');

  } catch (error) {
    console.error('\n❌ Error creating staff account:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check environment variables in .env.local');
    console.error('  2. Verify Supabase connection');
    console.error('  3. Ensure department "library" exists in database');
    console.error('  4. Check if email already exists\n');
    process.exit(1);
  }
}

// Main execution
createTestStaff()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });