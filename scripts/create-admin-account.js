/**
 * Create New Admin Account Script
 * 
 * This script creates a fresh admin account with specified credentials.
 * Use this after cleaning the database or for initial setup.
 * 
 * Usage:
 *   node scripts/create-admin-account.js
 * 
 * Or with custom credentials:
 *   EMAIL=admin@jecrc.ac.in PASSWORD=SecurePass123! node scripts/create-admin-account.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

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

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility function to prompt user
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Utility function to hide password input
function questionPassword(query) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    
    stdout.write(query);
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    
    let password = '';
    
    stdin.on('data', (char) => {
      char = char.toString('utf8');
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl-C
          process.exit();
          break;
        case '\u007f': // Backspace
          password = password.slice(0, -1);
          stdout.clearLine();
          stdout.cursorTo(0);
          stdout.write(query + '*'.repeat(password.length));
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    });
  });
}

async function createAdminAccount() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║       JECRC No Dues System - Admin Account Setup      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Check if admin already exists
    const { data: existingAdmins, error: checkError } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin');

    if (checkError) {
      console.error('❌ Error checking existing admins:', checkError.message);
      throw checkError;
    }

    if (existingAdmins && existingAdmins.length > 0) {
      console.log('⚠️  WARNING: Admin accounts already exist:');
      existingAdmins.forEach(admin => console.log(`   - ${admin.email}`));
      console.log('');
      
      const confirm = await question('Do you want to create another admin? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
        console.log('\n✋ Admin creation cancelled.\n');
        rl.close();
        return;
      }
    }

    // Get admin details
    console.log('\n📝 Enter admin account details:\n');
    
    const email = process.env.EMAIL || await question('Email address: ');
    
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    const fullName = await question('Full name: ');
    
    if (!fullName || fullName.trim().length === 0) {
      throw new Error('Full name is required');
    }

    let password = process.env.PASSWORD;
    if (!password) {
      password = await questionPassword('Password (min 6 characters): ');
      
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const confirmPassword = await questionPassword('Confirm password: ');
      
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
    }

    console.log('\n🔄 Creating admin account...\n');

    // Check if email already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers.users.some(u => u.email === email);

    if (emailExists) {
      throw new Error(`Email ${email} already exists. Please use a different email.`);
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName.trim(),
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
        full_name: fullName.trim(),
        email: email,
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

    console.log('✅ Profile record created');
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              Admin Account Created Successfully!       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log('📋 Account Details:');
    console.log(`   Email:     ${profile.email}`);
    console.log(`   Name:      ${profile.full_name}`);
    console.log(`   Role:      ${profile.role}`);
    console.log(`   User ID:   ${profile.id}`);
    console.log(`   Created:   ${new Date().toISOString()}\n`);
    console.log('🔐 Login Credentials:');
    console.log(`   Email:     ${profile.email}`);
    console.log(`   Password:  [provided during creation]\n`);
    console.log('🌐 Login URL:');
    console.log(`   ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin\n`);
    console.log('⚠️  IMPORTANT: Save these credentials securely!\n');

  } catch (error) {
    console.error('\n❌ Error creating admin account:', error.message);
    console.error('\nPlease check:');
    console.error('  1. Environment variables are properly configured');
    console.error('  2. Supabase connection is working');
    console.error('  3. You have admin privileges\n');
    throw error;
  } finally {
    rl.close();
  }
}

// Verify environment variables
function verifyEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease configure these in your .env.local file\n');
    process.exit(1);
  }
}

// Main execution
async function main() {
  verifyEnvironment();
  await createAdminAccount();
}

main()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });