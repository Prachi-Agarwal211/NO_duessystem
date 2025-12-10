/**
 * Create All Staff Accounts with Specific Assignments
 * 
 * Creates:
 * 1. Admin: razorrag.official@gmail.com (Admin role)
 * 2. Library Staff: 15anuragsingh2003@gmail.com (Library department)
 * 3. Accounts Staff: prachiagarwal211@gmail.com (Accounts department)
 * 4. School HOD/CS: anurag.22bcom1367@jecrcu.edu.in (Computer Science department)
 * 
 * Password for all: Test@1234
 * 
 * Usage: node scripts/create-all-staff-accounts.js
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

// Staff accounts configuration
const STAFF_ACCOUNTS = [
  {
    email: 'razorrag.official@gmail.com',
    password: 'Test@1234',
    full_name: 'Admin User',
    role: 'admin',
    department_name: null,
    description: 'System Administrator'
  },
  {
    email: '15anuragsingh2003@gmail.com',
    password: 'Test@1234',
    full_name: 'Anurag Singh',
    role: 'department',
    department_name: 'library',
    description: 'Library Department Staff'
  },
  {
    email: 'prachiagarwal211@gmail.com',
    password: 'Test@1234',
    full_name: 'Prachi Agarwal',
    role: 'department',
    department_name: 'accounts_department',
    description: 'Accounts Department Staff'
  },
  {
    email: 'anurag.22bcom1367@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Anurag Kumar',
    role: 'department',
    department_name: 'school_hod',
    description: 'School HOD/Computer Science Department'
  }
];

async function createStaffAccounts() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║       Creating All Staff Accounts                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables in .env.local');
    }

    const results = {
      created: [],
      existing: [],
      errors: []
    };

    for (const account of STAFF_ACCOUNTS) {
      console.log(`\n📋 Processing: ${account.email} (${account.description})`);
      console.log('─'.repeat(60));

      try {
        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const userExists = existingUsers.users.some(u => u.email === account.email);

        if (userExists) {
          console.log(`⚠️  User already exists: ${account.email}`);
          results.existing.push(account.email);
          continue;
        }

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: account.full_name,
            role: account.role,
            department_name: account.department_name
          }
        });

        if (authError) {
          console.error(`❌ Auth Error for ${account.email}:`, authError.message);
          results.errors.push({ email: account.email, error: authError.message });
          continue;
        }

        console.log(`✅ Authentication record created for ${account.email}`);

        // Create profile record
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            full_name: account.full_name,
            email: account.email,
            role: account.role,
            department_name: account.department_name,
            is_active: true
          }])
          .select()
          .single();

        if (profileError) {
          console.error(`❌ Profile Error for ${account.email}:`, profileError.message);
          // Rollback: delete the auth user if profile creation fails
          await supabase.auth.admin.deleteUser(authData.user.id);
          results.errors.push({ email: account.email, error: profileError.message });
          continue;
        }

        console.log(`✅ Profile record created for ${account.email}`);
        console.log(`   Role: ${account.role}`);
        if (account.department_name) {
          console.log(`   Department: ${account.department_name}`);
        }
        
        results.created.push({
          email: account.email,
          role: account.role,
          department: account.department_name,
          description: account.description
        });

      } catch (error) {
        console.error(`❌ Error processing ${account.email}:`, error.message);
        results.errors.push({ email: account.email, error: error.message });
      }
    }

    // Display summary
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║          Account Creation Summary                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    if (results.created.length > 0) {
      console.log('✅ SUCCESSFULLY CREATED ACCOUNTS:');
      console.log('─'.repeat(60));
      results.created.forEach(account => {
        console.log(`   📧 ${account.email}`);
        console.log(`      Role: ${account.role}`);
        if (account.department) {
          console.log(`      Department: ${account.department}`);
        }
        console.log(`      Description: ${account.description}`);
        console.log('');
      });
    }

    if (results.existing.length > 0) {
      console.log('⚠️  ALREADY EXISTING ACCOUNTS:');
      console.log('─'.repeat(60));
      results.existing.forEach(email => {
        console.log(`   📧 ${email}`);
      });
      console.log('');
    }

    if (results.errors.length > 0) {
      console.log('❌ FAILED TO CREATE:');
      console.log('─'.repeat(60));
      results.errors.forEach(error => {
        console.log(`   📧 ${error.email}: ${error.error}`);
      });
      console.log('');
    }

    // Display login credentials
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║          LOGIN CREDENTIALS                              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('🔐 ALL ACCOUNTS USE THE SAME PASSWORD: Test@1234\n');
    
    console.log('1️⃣  ADMIN ACCOUNT:');
    console.log('    Email: razorrag.official@gmail.com');
    console.log('    Password: Test@1234');
    console.log('    Role: Administrator (full access)');
    console.log('    URL: /staff/login → redirects to /staff/dashboard\n');
    
    console.log('2️⃣  LIBRARY DEPARTMENT:');
    console.log('    Email: 15anuragsingh2003@gmail.com');
    console.log('    Password: Test@1234');
    console.log('    Role: Library Staff');
    console.log('    URL: /staff/login → shows only Library forms\n');
    
    console.log('3️⃣  ACCOUNTS DEPARTMENT:');
    console.log('    Email: prachiagarwal211@gmail.com');
    console.log('    Password: Test@1234');
    console.log('    Role: Accounts Staff');
    console.log('    URL: /staff/login → shows only Accounts forms\n');
    
    console.log('4️⃣  SCHOOL HOD (Computer Science):');
    console.log('    Email: anurag.22bcom1367@jecrcu.edu.in');
    console.log('    Password: Test@1234');
    console.log('    Role: School HOD/Department Staff');
    console.log('    URL: /staff/login → shows School/CS forms\n');

    console.log('─'.repeat(60));
    console.log('⚠️  SECURITY NOTICE:');
    console.log('   1. Change passwords after first login');
    console.log('   2. Do not share credentials');
    console.log('   3. Enable 2FA if available');
    console.log('─'.repeat(60));

    // Department mapping info
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║          EMAIL NOTIFICATION SETUP                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('📧 Email notifications will be sent to:');
    console.log('─'.repeat(60));
    console.log('   Library forms → 15anuragsingh2003@gmail.com');
    console.log('   Accounts forms → prachiagarwal211@gmail.com');
    console.log('   School/CS forms → anurag.22bcom1367@jecrcu.edu.in');
    console.log('   Admin notifications → razorrag.official@gmail.com');
    console.log('─'.repeat(60));
    console.log('\n💡 To enable email notifications:');
    console.log('   1. Configure SMTP settings in Supabase Dashboard');
    console.log('   2. Set up email templates');
    console.log('   3. Update department emails in database');
    console.log('   4. Test notification system\n');

    console.log('✅ Staff account creation complete!\n');

  } catch (error) {
    console.error('\n❌ Critical Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check .env.local file exists with correct credentials');
    console.error('  2. Verify Supabase connection');
    console.error('  3. Ensure you have admin privileges');
    console.error('  4. Check if profiles table exists with correct structure\n');
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