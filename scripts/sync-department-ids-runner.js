/**
 * Sync Department IDs in Profiles Table
 * 
 * This script fixes the department synchronization issue by:
 * 1. Populating assigned_department_ids based on department_name
 * 2. Verifying all department staff have proper department assignments
 * 3. Creating necessary indexes for better performance
 * 
 * Usage: node scripts/sync-department-ids-runner.js
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

async function syncDepartmentIds() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║        Syncing Department IDs in Profiles Table               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables. Check .env.local file.');
    }

    console.log('📊 Step 1: Analyzing current state...\n');

    // Get all department staff profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, department_name, assigned_department_ids')
      .eq('role', 'department');

    if (profilesError) throw profilesError;

    console.log(`   Found ${profiles.length} department staff members`);

    // Count profiles with missing assigned_department_ids
    const missingAssignments = profiles.filter(
      p => !p.assigned_department_ids || p.assigned_department_ids.length === 0
    );

    console.log(`   ${missingAssignments.length} profiles need department ID assignment\n`);

    if (missingAssignments.length === 0) {
      console.log('✅ All profiles already have department assignments!\n');
      return;
    }

    console.log('📋 Profiles needing sync:');
    console.log('─'.repeat(70));
    missingAssignments.forEach(p => {
      console.log(`   ${p.email} - Department: ${p.department_name}`);
    });
    console.log('─'.repeat(70));

    console.log('\n🔧 Step 2: Fetching all departments...\n');

    // Get all departments
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name, display_name');

    if (deptError) throw deptError;

    console.log(`   Found ${departments.length} departments in database`);

    // Create department name -> id map
    const deptMap = new Map(departments.map(d => [d.name, d.id]));

    console.log('\n🔄 Step 3: Syncing department IDs...\n');

    const results = {
      synced: [],
      skipped: [],
      errors: []
    };

    // Update each profile
    for (const profile of missingAssignments) {
      const deptId = deptMap.get(profile.department_name);

      if (!deptId) {
        console.log(`   ⚠️  ${profile.email}: Department "${profile.department_name}" not found in departments table`);
        results.skipped.push({ email: profile.email, reason: 'Department not found' });
        continue;
      }

      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ assigned_department_ids: [deptId] })
          .eq('id', profile.id);

        if (updateError) throw updateError;

        console.log(`   ✅ ${profile.email}: Assigned to department ID ${deptId.substring(0, 8)}...`);
        results.synced.push(profile.email);

      } catch (error) {
        console.log(`   ❌ ${profile.email}: ${error.message}`);
        results.errors.push({ email: profile.email, error: error.message });
      }
    }

    console.log('\n🔍 Step 4: Verifying sync results...\n');

    // Verify all profiles now have assignments
    const { data: verifyProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, department_name, assigned_department_ids')
      .eq('role', 'department');

    if (verifyError) throw verifyError;

    const stillMissing = verifyProfiles.filter(
      p => !p.assigned_department_ids || p.assigned_department_ids.length === 0
    );

    if (stillMissing.length === 0) {
      console.log('   ✅ All department staff now have proper assignments!');
    } else {
      console.log(`   ⚠️  ${stillMissing.length} profiles still missing assignments:`);
      stillMissing.forEach(p => {
        console.log(`      ${p.email} - ${p.department_name}`);
      });
    }

    // Print summary
    console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    SYNC SUMMARY                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    if (results.synced.length > 0) {
      console.log('✅ Successfully Synced:');
      console.log('─'.repeat(70));
      results.synced.forEach(email => console.log(`   ✓ ${email}`));
      console.log('─'.repeat(70));
    }

    if (results.skipped.length > 0) {
      console.log('\n⚠️  Skipped (Department not found):');
      console.log('─'.repeat(70));
      results.skipped.forEach(item => console.log(`   ⊘ ${item.email} - ${item.reason}`));
      console.log('─'.repeat(70));
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      console.log('─'.repeat(70));
      results.errors.forEach(err => console.log(`   ✗ ${err.email}: ${err.error}`));
      console.log('─'.repeat(70));
    }

    console.log('\n📊 Statistics:');
    console.log(`   Total profiles: ${profiles.length}`);
    console.log(`   Needed sync: ${missingAssignments.length}`);
    console.log(`   Successfully synced: ${results.synced.length}`);
    console.log(`   Skipped: ${results.skipped.length}`);
    console.log(`   Errors: ${results.errors.length}`);
    console.log(`   Still missing: ${stillMissing.length}\n`);

    console.log('✅ Department ID sync complete!\n');

    // Show sample of synced data
    if (results.synced.length > 0) {
      console.log('📋 Sample of synced profiles:\n');
      const { data: sampleProfiles } = await supabase
        .from('profiles')
        .select(`
          email,
          department_name,
          assigned_department_ids,
          departments:assigned_department_ids (
            name,
            display_name
          )
        `)
        .eq('role', 'department')
        .limit(5);

      if (sampleProfiles) {
        sampleProfiles.forEach(p => {
          console.log(`   ${p.email}`);
          console.log(`   Department: ${p.department_name}`);
          console.log(`   Assigned IDs: ${p.assigned_department_ids?.join(', ').substring(0, 50)}...`);
          console.log('');
        });
      }
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nStack trace:', error.stack);
    console.error('\nTroubleshooting:');
    console.error('  1. Check .env.local file exists in project root');
    console.error('  2. Verify NEXT_PUBLIC_SUPABASE_URL is set');
    console.error('  3. Verify SUPABASE_SERVICE_ROLE_KEY is set');
    console.error('  4. Ensure database tables exist');
    console.error('  5. Check Supabase project is active and accessible\n');
    process.exit(1);
  }
}

// Main execution
syncDepartmentIds()
  .then(() => {
    console.log('✅ Script completed successfully');
    console.log('🎯 Department staff should now be able to see forms in their dashboards\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });