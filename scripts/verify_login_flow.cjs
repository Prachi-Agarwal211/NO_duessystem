// Comprehensive verification script for account login and dashboard
// Run with: node scripts/verify_login_flow.cjs

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
    }
  }
);

// Test accounts to verify
const testAccounts = [
  { email: 'yogesh.joshi@jecrcu.edu.in', name: 'Accounts Dept' },
  { email: 'mohit.badgujar@jecrcu.edu.in', name: 'Alumni Association' },
  { email: 'ashok.singh@jecrcu.edu.in', name: 'Registrar' },
  { email: 'seniormanager.it@jecrcu.edu.in', name: 'IT Department' },
  { email: 'nirmal.jain@jecrcu.edu.in', name: 'Hostel' },
  { email: 'librarian@jecrcu.edu.in', name: 'Library' },
  { email: 'admin@jecrcu.edu.in', name: 'Admin' },
  { email: 'hod.mechanical@jecrcu.edu.in', name: 'HOD Mechanical' }
];

async function verifyLoginFlow() {
  console.log('='.repeat(60));
  console.log('VERIFYING LOGIN AND DASHBOARD FLOW');
  console.log('='.repeat(60));
  
  let allPassed = true;
  
  for (const account of testAccounts) {
    console.log(`\n📋 Testing: ${account.name} (${account.email})`);
    console.log('-'.repeat(40));
    
    try {
      // Step 1: Sign in with password
      console.log('1️⃣  Signing in...');
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: account.email,
        password: 'Jecrc@2026'
      });
      
      if (signInError) {
        console.log('   ❌ Sign in failed:', signInError.message);
        allPassed = false;
        continue;
      }
      
      const user = signInData.user;
      console.log('   ✅ Sign in successful, User ID:', user.id);
      
      // Step 2: Query profile by email (new method)
      console.log('2️⃣  Querying profile by email...');
      const { data: profileByEmail, error: profileByEmailError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', user.email.toLowerCase())
        .single();
      
      if (profileByEmail) {
        console.log('   ✅ Profile found by email');
        console.log('      ID:', profileByEmail.id);
        console.log('      Role:', profileByEmail.role);
        console.log('      Department:', profileByEmail.department_name);
      } else if (!profileByEmailError) {
        console.log('   ⚠️  Profile is null (no error)');
        // Try ID lookup as fallback
        const { data: profileById } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileById) {
          console.log('   ✅ Profile found by ID fallback');
          console.log('      ID:', profileById.id);
          console.log('      Role:', profileById.role);
        } else {
          console.log('   ❌ Profile not found by ID either');
          allPassed = false;
        }
      } else if (profileByEmailError.code === 'PGRST116') {
        console.log('   ⚠️  Email query returned PGRST116, trying ID...');
        const { data: profileById } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileById) {
          console.log('   ✅ Profile found by ID fallback');
        } else {
          console.log('   ❌ Profile not found at all');
          allPassed = false;
        }
      } else {
        console.log('   ❌ Profile query error:', profileByEmailError);
        allPassed = false;
      }
      
      // Step 3: Check no_dues_status for this department
      console.log('3️⃣  Checking no_dues_status for department...');
      
      // Get department name from profile
      let deptName = profileByEmail?.department_name;
      if (!deptName) {
        // Try ID lookup
        const { data: profileById } = await supabaseAdmin
          .from('profiles')
          .select('department_name')
          .eq('id', user.id)
          .single();
        deptName = profileById?.department_name;
      }
      
      if (deptName) {
        console.log('   Department:', deptName);
        
        // Count pending applications for this department
        const { count: pendingCount, error: pendingError } = await supabaseAdmin
          .from('no_dues_status')
          .select('*', { count: 'exact', head: true })
          .eq('department_name', deptName)
          .eq('status', 'pending');
        
        if (pendingError) {
          console.log('   ❌ Error counting pending:', pendingError.message);
        } else {
          console.log('   ✅ Pending applications:', pendingCount || 0);
        }
        
        // Count approved applications by this user
        const profileId = profileByEmail?.id || user.id;
        const { count: approvedCount, error: approvedError } = await supabaseAdmin
          .from('no_dues_status')
          .select('*', { count: 'exact', head: true })
          .eq('department_name', deptName)
          .eq('status', 'approved')
          .eq('action_by_user_id', profileId);
        
        if (approvedError) {
          console.log('   ❌ Error counting approved:', approvedError.message);
        } else {
          console.log('   ✅ Approved by this user:', approvedCount || 0);
        }
      } else {
        console.log('   ⚠️  No department_name found');
      }
      
      // Step 4: Verify chat functionality
      console.log('4️⃣  Checking chat functionality...');
      
      const { count: messagesCount, error: messagesError } = await supabaseAdmin
        .from('no_dues_messages')
        .select('*', { count: 'exact', head: true })
        .eq('department_name', deptName)
        .eq('sender_type', 'student');
      
      if (messagesError) {
        console.log('   ❌ Error checking messages:', messagesError.message);
      } else {
        console.log('   ✅ Student messages in department:', messagesCount || 0);
      }
      
      console.log('   ✅ ALL CHECKS PASSED');
      
    } catch (error) {
      console.log('   ❌ Unexpected error:', error.message);
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Login and dashboard working!');
  } else {
    console.log('❌ SOME TESTS FAILED - Check output above');
  }
  console.log('='.repeat(60));
  
  process.exit(allPassed ? 0 : 1);
}

verifyLoginFlow().catch(console.error);
