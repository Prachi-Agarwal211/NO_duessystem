/**
 * Create Updated Department Staff Accounts for JECRC No Dues System
 * 
 * Updated emails for department staff (non-HOD - see ALL students)
 * All accounts use password: Test@1234
 * 
 * Usage: node scripts/create-updated-department-staff.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

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

// Updated Department Staff (See ALL students)
const DEPARTMENT_STAFF = [
  {
    email: 'seniormanager.it@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'IT Senior Manager',
    role: 'department',
    department_name: 'it_department',
    description: 'IT Department Staff'
  },
  {
    email: 'nirmal.jain@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Nirmal Jain',
    role: 'department',
    department_name: 'hostel',
    description: 'Hostel Department Staff'
  },
  {
    email: 'librarian@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Librarian',
    role: 'department',
    department_name: 'library',
    description: 'Library Department Staff'
  },
  {
    email: 'ashokh.singh@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Ashokh Singh',
    role: 'department',
    department_name: 'registrar',
    description: 'Registrar Department Staff'
  },
  {
    email: 'mohit.badgujar@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Mohit Badgujar',
    role: 'department',
    department_name: 'alumni_association',
    description: 'Alumni Cell Staff'
  },
  {
    email: 'yogesh.jhoshi@jecrcu.edu.in',
    password: 'Test@1234',
    full_name: 'Yogesh Jhoshi',
    role: 'department',
    department_name: 'accounts_department',
    description: 'Accounts Department Staff'
  }
];

async function createDepartmentStaff() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   Creating Updated Department Staff Accounts          ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables. Check .env.local file.');
    }

    console.log('🔍 Checking for existing accounts...\n');

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingEmails = new Set(existingUsers.users.map(u => u.email));

    const results = {
      created: [],
      skipped: [],
      errors: []
    };

    for (const staff of DEPARTMENT_STAFF) {
      console.log(`\n📧 Processing: ${staff.email}`);
      console.log(`   Name: ${staff.full_name}`);
      console.log(`   Department: ${staff.department_name}`);
      console.log(`   Description: ${staff.description}`);

      if (existingEmails.has(staff.email)) {
        console.log(`   ⚠️  Account already exists - SKIPPING`);
        results.skipped.push(staff.email);
        continue;
      }

      try {
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

        if (authError) throw authError;

        console.log(`   ✅ Auth user created (ID: ${authData.user.id.substring(0, 8)}...)`);

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            email: staff.email,
            full_name: staff.full_name,
            role: staff.role,
            department_name: staff.department_name,
            school_id: null,
            school_ids: null,
            course_ids: null,
            branch_ids: null,
            is_active: true
          }]);

        if (profileError) {
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

    console.log('\n\n╔═══════════════════════════════════════════════════════╗');
    console.log('║           ACCOUNT CREATION SUMMARY                     ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

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

    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║         UPDATED DEPARTMENT STAFF CREDENTIALS              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('All accounts use password: Test@1234\n');
    console.log('1. IT:       seniormanager.it@jecrcu.edu.in');
    console.log('2. Hostel:   nirmal.jain@jecrcu.edu.in');
    console.log('3. Library:  librarian@jecrcu.edu.in');
    console.log('4. Registrar: ashokh.singh@jecrcu.edu.in');
    console.log('5. Alumni:   mohit.badgujar@jecrcu.edu.in');
    console.log('6. Accounts: yogesh.jhoshi@jecrcu.edu.in\n');

    console.log('⚠️  IMPORTANT:');
    console.log('─'.repeat(70));
    console.log('• All accounts see ALL students (no filtering)');
    console.log('• Each can only approve/reject for their department');
    console.log('• Login: https://no-duessystem.vercel.app/staff/login');
    console.log('─'.repeat(70));

    console.log('\n📊 Statistics:');
    console.log(`   Created: ${results.created.length}`);
    console.log(`   Skipped: ${results.skipped.length}`);
    console.log(`   Errors:  ${results.errors.length}\n`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

createDepartmentStaff()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });