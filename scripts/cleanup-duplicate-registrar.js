/**
 * Cleanup script to remove duplicate registrar account
 * Keeps: ganesh.jat@jecrcu.edu.in
 * Removes: coe@jecrcu.edu.in
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🗑️  Removing duplicate registrar account...\n');

  try {
    // Get the old registrar account
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, department_name')
      .eq('email', 'coe@jecrcu.edu.in')
      .single();

    if (!profile) {
      console.log('ℹ️  Account coe@jecrcu.edu.in not found (already removed)');
      return;
    }

    console.log(`Found duplicate account:`);
    console.log(`  Email: ${profile.email}`);
    console.log(`  Name: ${profile.full_name}`);
    console.log(`  Department: ${profile.department_name}\n`);

    // Delete from auth.users (will cascade to profiles)
    const { error } = await supabase.auth.admin.deleteUser(profile.id);

    if (error) {
      console.error(`❌ Failed to remove: ${error.message}`);
      process.exit(1);
    }

    console.log(`✅ Successfully removed: ${profile.email}`);
    console.log(`✅ Kept: ganesh.jat@jecrcu.edu.in as the registrar\n`);

    // Verify only one registrar remains
    const { data: registrars } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('department_name', 'registrar');

    console.log(`📊 Current registrar account(s):`);
    registrars.forEach(r => {
      console.log(`  ✓ ${r.email} (${r.full_name})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();