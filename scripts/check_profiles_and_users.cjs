// Quick check profiles and auth.users
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProfilesAndUsers() {
  console.log('🔍 CHECKING PROFILES AND AUTH.USERS...\n');

  // Get all profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role');

  if (profileError) {
    console.error('❌ Error fetching profiles:', profileError.message);
    return;
  }

  console.log(`📊 Total profiles: ${profiles?.length || 0}`);
  console.log('\nProfiles:');
  profiles?.forEach(p => {
    console.log(`  - ${p.id}: ${p.email} (${p.role}) - ${p.full_name}`);
  });

  // Get auth.users via admin API (using rpc to list users)
  console.log('\n🔐 Trying to get user count via auth...');

  // Check if the user ID from the error exists
  const testUserId = '9f0e50c6-b5cf-4bc4-9a7b-8a1b06a78898';
  const { data: testProfile, error: testError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', testUserId)
    .single();

  console.log(`\n🔍 Checking if user ${testUserId} exists in profiles:`);
  if (testError && testError.code === 'PGRST116') {
    console.log('❌ User NOT FOUND in profiles table - this is the issue!');
  } else if (testProfile) {
    console.log('✅ User found:', testProfile.email);
  } else {
    console.log('❓ User not found (error:', testError?.message, ')');
  }

  // List all profile IDs
  console.log('\n📋 All profile IDs:');
  profiles?.forEach(p => console.log(`  ${p.id}`));
}

checkProfilesAndUsers();
