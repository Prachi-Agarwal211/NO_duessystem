/**
 * Sync Auth Users to Profiles Table
 * 
 * This script syncs all auth users with the profiles table
 * - Creates missing profiles for existing auth users
 * - Updates existing profiles with correct information
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Expected staff configuration
const EXPECTED_STAFF = {
  'admin@jecrcu.edu.in': {
    full_name: 'System Administrator',
    role: 'admin',
    department_name: null,
    school_ids: null,
    course_ids: null,
    branch_ids: null
  },
  'surbhi.jetavat@jecrcu.edu.in': {
    full_name: 'Surbhi Jetavat',
    role: 'department',
    department_name: 'accounts_department',
    school_ids: null,
    course_ids: null,
    branch_ids: null
  },
  'vishaltiwari642@gmail.com': {
    full_name: 'Vishal Tiwari',
    role: 'department',
    department_name: 'library',
    school_ids: null,
    course_ids: null,
    branch_ids: null
  },
  'seniormanager.it@jecrcu.edu.in': {
    full_name: 'IT Senior Manager',
    role: 'department',
    department_name: 'it_department',
    school_ids: null,
    course_ids: null,
    branch_ids: null
  },
  'sailendra.trivedi@jecrcu.edu.in': {
    full_name: 'Sailendra Trivedi',
    role: 'department',
    department_name: 'mess',
    school_ids: null,
    course_ids: null,
    branch_ids: null
  },
  'akshar.bhardwaj@jecrcu.edu.in': {
    full_name: 'Akshar Bhardwaj',
    role: 'department',
    department_name: 'hostel',
    school_ids: null,
    course_ids: null,
    branch_ids: null
  },
  'anurag.sharma@jecrcu.edu.in': {
    full_name: 'Anurag Sharma',
    role: 'department',
    department_name: 'alumni_association',
    school_ids: null,
    course_ids: null,
    branch_ids: null
  },
  'ganesh.jat@jecrcu.edu.in': {
    full_name: 'Ganesh Jat',
    role: 'department',
    department_name: 'registrar',
    school_ids: null,
    course_ids: null,
    branch_ids: null
  },
  'umesh.sharma@jecrcu.edu.in': {
    full_name: 'Umesh Sharma',
    role: 'department',
    department_name: 'canteen',
    school_ids: null,
    course_ids: null,
    branch_ids: null
  },
  'arjit.jain@jecrcu.edu.in': {
    full_name: 'Arjit Jain',
    role: 'department',
    department_name: 'tpo',
    school_ids: null,
    course_ids: null,
    branch_ids: null
  }
};

async function syncAuthToProfiles() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     SYNC AUTH USERS TO PROFILES TABLE                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // Get all auth users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      return;
    }

    console.log(`📋 Found ${users.length} auth users\n`);

    const results = {
      created: [],
      updated: [],
      skipped: [],
      errors: []
    };

    // Process each staff email
    for (const [email, config] of Object.entries(EXPECTED_STAFF)) {
      console.log(`\n📧 Processing: ${email}`);
      
      // Find auth user
      const authUser = users.find(u => u.email === email);
      
      if (!authUser) {
        console.log(`   ⚠️  Auth user not found - need to create manually`);
        results.skipped.push({ email, reason: 'No auth user' });
        continue;
      }

      console.log(`   ✅ Found auth user: ${authUser.id.substring(0, 8)}...`);

      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
        console.error(`   ❌ Error checking profile: ${fetchError.message}`);
        results.errors.push({ email, error: fetchError.message });
        continue;
      }

      const profileData = {
        id: authUser.id,
        email: email,
        full_name: config.full_name,
        role: config.role,
        department_name: config.department_name,
        school_ids: config.school_ids,
        course_ids: config.course_ids,
        branch_ids: config.branch_ids,
        is_active: true,
        updated_at: new Date().toISOString()
      };

      if (!existingProfile) {
        // Create new profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(profileData);

        if (insertError) {
          console.error(`   ❌ Error creating profile: ${insertError.message}`);
          results.errors.push({ email, error: insertError.message });
        } else {
          console.log(`   ✅ Profile CREATED`);
          console.log(`   ✅ Role: ${config.role}`);
          console.log(`   ✅ Department: ${config.department_name || 'N/A'}`);
          results.created.push(email);
        }
      } else {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: config.full_name,
            role: config.role,
            department_name: config.department_name,
            school_ids: config.school_ids,
            course_ids: config.course_ids,
            branch_ids: config.branch_ids,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', authUser.id);

        if (updateError) {
          console.error(`   ❌ Error updating profile: ${updateError.message}`);
          results.errors.push({ email, error: updateError.message });
        } else {
          console.log(`   ✅ Profile UPDATED`);
          console.log(`   ✅ Role: ${config.role}`);
          console.log(`   ✅ Department: ${config.department_name || 'N/A'}`);
          results.updated.push(email);
        }
      }
    }

    // Print summary
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    SYNC SUMMARY                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    if (results.created.length > 0) {
      console.log('✅ Profiles Created:');
      console.log('─'.repeat(70));
      results.created.forEach(email => console.log(`   ✓ ${email}`));
      console.log('─'.repeat(70));
    }

    if (results.updated.length > 0) {
      console.log('\n🔄 Profiles Updated:');
      console.log('─'.repeat(70));
      results.updated.forEach(email => console.log(`   ↻ ${email}`));
      console.log('─'.repeat(70));
    }

    if (results.skipped.length > 0) {
      console.log('\n⚠️  Skipped (no auth user):');
      console.log('─'.repeat(70));
      results.skipped.forEach(item => console.log(`   ⊘ ${item.email}`));
      console.log('─'.repeat(70));
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      console.log('─'.repeat(70));
      results.errors.forEach(err => console.log(`   ✗ ${err.email}: ${err.error}`));
      console.log('─'.repeat(70));
    }

    console.log('\n📊 Statistics:');
    console.log(`   Created: ${results.created.length}`);
    console.log(`   Updated: ${results.updated.length}`);
    console.log(`   Skipped: ${results.skipped.length}`);
    console.log(`   Errors: ${results.errors.length}`);
    console.log(`   Total Processed: ${Object.keys(EXPECTED_STAFF).length}\n`);

    // Verify final count
    const { data: allProfiles, error: countError } = await supabase
      .from('profiles')
      .select('email, role, department_name')
      .in('role', ['admin', 'department']);

    if (!countError) {
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║              FINAL VERIFICATION                           ║');
      console.log('╚═══════════════════════════════════════════════════════════╝\n');
      console.log(`✅ Total profiles in database: ${allProfiles.length}`);
      
      const admin = allProfiles.filter(p => p.role === 'admin').length;
      const dept = allProfiles.filter(p => p.role === 'department').length;
      
      console.log(`   - Admin: ${admin}`);
      console.log(`   - Department Staff: ${dept}`);
      console.log(`\n🎯 Expected: 10 accounts (1 admin + 9 dept staff)`);
      
      if (allProfiles.length >= 10) {
        console.log('\n🎉 SUCCESS! All staff accounts synced to profiles table!\n');
      } else {
        console.log(`\n⚠️  WARNING: Expected 10+ but found ${allProfiles.length}\n`);
      }
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    throw error;
  }
}

syncAuthToProfiles()
  .then(() => {
    console.log('✅ Sync completed successfully\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  });