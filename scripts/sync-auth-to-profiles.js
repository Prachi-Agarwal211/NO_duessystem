/**
 * Sync Supabase Auth Users to Profiles Table
 * 
 * This script:
 * 1. Gets all users from Supabase Auth
 * 2. Checks if they have profile records
 * 3. Creates missing profile records
 * 
 * Run: node scripts/sync-auth-to-profiles.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Known account mappings
// IMPORTANT:
// - role must be 'department' or 'admin' (NOT 'staff')
// - department_name must match exactly with departments table (e.g., 'library', 'accounts_department', 'school_hod')
const ACCOUNT_MAPPINGS = {
  'razorrag.official@gmail.com': {
    full_name: 'System Administrator',
    role: 'admin',
    department_name: null,
    school_id: null
  },
  '15anuragsingh2003@gmail.com': {
    full_name: 'Anurag Singh (Library Staff)',
    role: 'department',
    department_name: 'library',  // Must match departments.name exactly
    school_id: null
  },
  'prachiagarwal211@gmail.com': {
    full_name: 'Prachi Agarwal (Accounts Staff)',
    role: 'department',
    department_name: 'accounts_department',  // Changed from 'accounts' to 'accounts_department'
    school_id: null
  },
  'anurag.22bcom1367@jecrcu.edu.in': {
    full_name: 'Anurag Kumar (Accounts Staff)',
    role: 'department',
    department_name: 'accounts_department',  // Changed from 'accounts' to 'accounts_department'
    school_id: null
  },
  'admin@jecrcu.edu.in': {
    full_name: 'Admin Account',
    role: 'admin',
    department_name: null,
    school_id: null
  }
};

async function syncAuthToProfiles() {
  console.log('\n🔄 Syncing Auth Users to Profiles Table\n');

  try {
    // Get all auth users
    console.log('📋 Fetching users from Auth...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw authError;
    }

    console.log(`✅ Found ${users.length} users in Auth\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found in Auth. Create accounts first.\n');
      return;
    }

    // Get existing profiles
    const { data: existingProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id');
    
    if (profileError) {
      throw profileError;
    }

    const existingProfileIds = new Set(existingProfiles.map(p => p.id));
    console.log(`📊 Found ${existingProfiles.length} existing profiles\n`);

    const results = {
      created: [],
      skipped: [],
      errors: []
    };

    // Sync each user
    for (const user of users) {
      console.log(`\n👤 Processing: ${user.email}`);
      console.log(`   User ID: ${user.id}`);

      // Check if profile exists
      if (existingProfileIds.has(user.id)) {
        console.log(`   ⚠️  Profile already exists - SKIPPING`);
        results.skipped.push(user.email);
        continue;
      }

      // Get account mapping or use defaults
      const mapping = ACCOUNT_MAPPINGS[user.email] || {
        full_name: user.email.split('@')[0],
        role: 'staff',
        department_name: 'library',
        school_id: null
      };

      console.log(`   Role: ${mapping.role}`);
      console.log(`   Department: ${mapping.department_name || 'N/A'}`);

      try {
        // Create profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: mapping.full_name,
            role: mapping.role,
            department_name: mapping.department_name,
            school_id: mapping.school_id,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }

        console.log(`   ✅ Profile created successfully`);
        results.created.push(user.email);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.errors.push({ email: user.email, error: error.message });
      }
    }

    // Print summary
    console.log('\n\n╔════════════════════════════════════════════════════════╗');
    console.log('║              SYNC SUMMARY                               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log(`Total Auth Users: ${users.length}`);
    console.log(`Profiles Created: ${results.created.length}`);
    console.log(`Already Had Profiles: ${results.skipped.length}`);
    console.log(`Errors: ${results.errors.length}\n`);

    if (results.created.length > 0) {
      console.log('✅ Successfully Created Profiles:');
      console.log('─'.repeat(60));
      results.created.forEach(email => console.log(`   ✓ ${email}`));
      console.log('─'.repeat(60));
    }

    if (results.skipped.length > 0) {
      console.log('\n⚠️  Already Had Profiles (Skipped):');
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

    // Verify final state
    console.log('\n\n🔍 Verifying final state...');
    const { data: finalProfiles } = await supabase
      .from('profiles')
      .select('email, role, department_name');

    console.log('\n📊 All Profiles in Database:');
    console.log('─'.repeat(60));
    finalProfiles.forEach(p => {
      console.log(`   • ${p.email}`);
      console.log(`     Role: ${p.role}, Department: ${p.department_name || 'N/A'}`);
    });
    console.log('─'.repeat(60));

    console.log('\n✅ Sync complete!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check .env.local file exists');
    console.error('  2. Verify SUPABASE_SERVICE_ROLE_KEY is set');
    console.error('  3. Ensure profiles table exists');
    console.error('  4. Check database connection\n');
    process.exit(1);
  }
}

// Run
syncAuthToProfiles()
  .then(() => {
    console.log('✅ Script completed\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });