/**
 * JECRC No Dues System - Update Existing Staff Accounts
 * 
 * This script updates existing auth users that don't have profiles
 * and ensures all staff have proper department assignments and scoping
 * 
 * Usage: node scripts/update-existing-staff-accounts.js
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

// Department staff that need profiles created
const DEPARTMENT_STAFF = [
  {
    email: 'surbhi.jetavat@jecrcu.edu.in',
    full_name: 'Surbhi Jetavat',
    role: 'department',
    department_name: 'accounts_department'
  },
  {
    email: 'vishaltiwari642@gmail.com',
    full_name: 'Vishal Tiwari',
    role: 'department',
    department_name: 'library'
  },
  {
    email: 'seniormanager.it@jecrcu.edu.in',
    full_name: 'IT Senior Manager',
    role: 'department',
    department_name: 'it_department'
  },
  {
    email: 'sailendra.trivedi@jecrcu.edu.in',
    full_name: 'Sailendra Trivedi',
    role: 'department',
    department_name: 'mess'
  },
  {
    email: 'akshar.bhardwaj@jecrcu.edu.in',
    full_name: 'Akshar Bhardwaj',
    role: 'department',
    department_name: 'hostel'
  },
  {
    email: 'anurag.sharma@jecrcu.edu.in',
    full_name: 'Anurag Sharma',
    role: 'department',
    department_name: 'alumni_association'
  },
  {
    email: 'ganesh.jat@jecrcu.edu.in',
    full_name: 'Ganesh Jat',
    role: 'department',
    department_name: 'registrar'
  },
  {
    email: 'umesh.sharma@jecrcu.edu.in',
    full_name: 'Umesh Sharma',
    role: 'department',
    department_name: 'canteen'
  },
  {
    email: 'arjit.jain@jecrcu.edu.in',
    full_name: 'Arjit Jain',
    role: 'department',
    department_name: 'tpo'
  }
];

async function updateStaffAccount(staff) {
  try {
    console.log(`\n📧 Processing: ${staff.email}`);
    
    // Get user from auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error(`   ❌ Error listing users: ${listError.message}`);
      return { status: 'error', email: staff.email, error: listError.message };
    }
    
    const authUser = users.find(u => u.email === staff.email);
    
    if (!authUser) {
      console.log(`   ⚠️  Auth user not found - skipping`);
      return { status: 'skipped', email: staff.email, reason: 'No auth user' };
    }
    
    console.log(`   ✅ Found auth user: ${authUser.id.substring(0, 8)}...`);
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authUser.id)
      .single();
    
    if (existingProfile) {
      console.log(`   ⚠️  Profile already exists - skipping`);
      return { status: 'skipped', email: staff.email, reason: 'Profile exists' };
    }
    
    // Create profile
    const profileData = {
      id: authUser.id,
      email: staff.email,
      full_name: staff.full_name,
      role: staff.role,
      department_name: staff.department_name,
      school_ids: null,  // See all students
      course_ids: null,
      branch_ids: null,
      is_active: true
    };
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData);
    
    if (profileError) {
      console.error(`   ❌ Profile creation failed: ${profileError.message}`);
      return { status: 'error', email: staff.email, error: profileError.message };
    }
    
    console.log(`   ✅ Profile created successfully`);
    console.log(`   ✅ Department: ${staff.department_name}`);
    console.log(`   ✅ Access: All students (no filtering)`);
    
    return { status: 'created', email: staff.email };
    
  } catch (error) {
    console.error(`   ❌ Unexpected error: ${error.message}`);
    return { status: 'error', email: staff.email, error: error.message };
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  UPDATE EXISTING STAFF ACCOUNTS - CREATE PROFILES        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`📋 Staff accounts to update: ${DEPARTMENT_STAFF.length}\n`);
  
  const results = {
    created: [],
    skipped: [],
    errors: []
  };
  
  for (const staff of DEPARTMENT_STAFF) {
    const result = await updateStaffAccount(staff);
    
    if (result.status === 'created') {
      results.created.push(result.email);
    } else if (result.status === 'skipped') {
      results.skipped.push({ email: result.email, reason: result.reason });
    } else {
      results.errors.push({ email: result.email, error: result.error });
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Print summary
  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║              UPDATE SUMMARY                                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  if (results.created.length > 0) {
    console.log('✅ Profiles Created:');
    console.log('─'.repeat(70));
    results.created.forEach(email => console.log(`   ✓ ${email}`));
    console.log('─'.repeat(70));
  }
  
  if (results.skipped.length > 0) {
    console.log('\n⚠️  Skipped:');
    console.log('─'.repeat(70));
    results.skipped.forEach(item => console.log(`   ⊘ ${item.email} (${item.reason})`));
    console.log('─'.repeat(70));
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    console.log('─'.repeat(70));
    results.errors.forEach(err => console.log(`   ✗ ${err.email}: ${err.error}`));
    console.log('─'.repeat(70));
  }
  
  console.log('\n📊 Statistics:');
  console.log(`   Profiles Created: ${results.created.length}`);
  console.log(`   Skipped: ${results.skipped.length}`);
  console.log(`   Errors: ${results.errors.length}`);
  console.log(`   Total: ${DEPARTMENT_STAFF.length}\n`);
  
  if (results.created.length > 0) {
    console.log('✅ Staff profiles created successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Test login for updated accounts');
    console.log('   2. Verify they can access staff dashboard');
    console.log('   3. Submit a test form to verify notifications\n');
  }
}

main()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });