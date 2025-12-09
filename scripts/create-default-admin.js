/**
 * Create Default Admin Account
 * 
 * Creates admin account with predefined credentials:
 * Email: admin@jecrcu.edu.in
 * Password: Admin@2025
 * 
 * Usage: node scripts/create-default-admin.js
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

// Default admin credentials
const ADMIN_EMAIL = 'admin@jecrcu.edu.in';
const ADMIN_PASSWORD = 'Admin@2025';
const ADMIN_NAME = 'System Administrator';

async function createDefaultAdmin() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║       Creating Default Admin Account                   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Check if admin already exists
    console.log('🔍 Checking for existing admin account...\n');
    
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers.users.some(u => u.email === ADMIN_EMAIL);

    if (adminExists) {
      console.log('⚠️  Admin account already exists with email:', ADMIN_EMAIL);
      console.log('\nOptions:');
      console.log('1. Delete existing account from Supabase Dashboard → Authentication → Users');
      console.log('2. Use different email by modifying this script');
      console.log('3. Reset password via Supabase Dashboard\n');
      return;
    }

    console.log('✅ No existing admin found. Creating new account...\n');

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: ADMIN_NAME,
        role: 'admin'
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
        full_name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        role: 'admin',
        department_name: null
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
    console.log('║          Default Admin Account Created!                ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 Account Details:');
    console.log('─'.repeat(60));
    console.log(`   Email:        ${ADMIN_EMAIL}`);
    console.log(`   Password:     ${ADMIN_PASSWORD}`);
    console.log(`   Name:         ${ADMIN_NAME}`);
    console.log(`   Role:         admin`);
    console.log(`   User ID:      ${profile.id}`);
    console.log(`   Created:      ${new Date().toISOString()}`);
    console.log('─'.repeat(60));
    
    console.log('\n🌐 Login Information:');
    console.log('─'.repeat(60));
    console.log(`   URL:          ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin`);
    console.log(`   Email:        ${ADMIN_EMAIL}`);
    console.log(`   Password:     ${ADMIN_PASSWORD}`);
    console.log('─'.repeat(60));
    
    console.log('\n⚠️  SECURITY NOTICE:');
    console.log('─'.repeat(60));
    console.log('   1. Save these credentials securely');
    console.log('   2. Change the password after first login');
    console.log('   3. Enable 2FA if available');
    console.log('   4. Do not share credentials');
    console.log('─'.repeat(60));
    
    console.log('\n✅ Admin account is ready to use!\n');

  } catch (error) {
    console.error('\n❌ Error creating admin account:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check environment variables in .env.local');
    console.error('  2. Verify Supabase connection');
    console.error('  3. Ensure you have admin privileges');
    console.error('  4. Check if email already exists\n');
    process.exit(1);
  }
}

// Main execution
createDefaultAdmin()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });