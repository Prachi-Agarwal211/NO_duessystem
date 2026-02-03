// Fix profile ID by updating all related foreign key references
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment from .env.local
const envFile = path.join(__dirname, '../.env.local');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixProfileIdComplete() {
  console.log('🔧 COMPLETE PROFILE ID FIX...\n');

  const oldProfileId = '7ee6b21e-d72d-496a-bed5-8a1040e076c4';
  const newUserId = '9f0e50c6-b5cf-4bc4-9a7b-8a1b06a78898';
  const email = 'razorrag.official@gmail.com';

  // Check what tables reference this profile
  console.log('📋 Checking foreign key references...');

  // 1. Check no_dues_status (action_by_user_id)
  const { data: duesRecords } = await supabase
    .from('no_dues_status')
    .select('id')
    .eq('action_by_user_id', oldProfileId);

  console.log(`📊 Found ${duesRecords?.length || 0} no_dues_status records referencing old profile`);

  if (duesRecords?.length > 0) {
    console.log('🔄 Updating no_dues_status records...');
    const { error: updateDuesError } = await supabase
      .from('no_dues_status')
      .update({ action_by_user_id: newUserId })
      .eq('action_by_user_id', oldProfileId);

    if (updateDuesError) {
      console.log(`❌ Failed to update no_dues_status: ${updateDuesError.message}`);
    } else {
      console.log('✅ no_dues_status updated');
    }
  }

  // 2. Check support_tickets (user_email)
  const { data: supportRecords } = await supabase
    .from('support_tickets')
    .select('id')
    .eq('user_email', email);

  console.log(`📊 Found ${supportRecords?.length || 0} support_tickets records referencing old profile`);

  if (supportRecords?.length > 0) {
    console.log('🔄 Updating support_tickets records...');
    const { error: updateSupportError } = await supabase
      .from('support_tickets')
      .update({ user_id: newUserId })
      .eq('user_email', email);

    if (updateSupportError) {
      console.log(`❌ Failed to update support_tickets: ${updateSupportError.message}`);
    } else {
      console.log('✅ support_tickets updated');
    }
  }

  // 3. Check any other potential references (by email)
  console.log('\n📋 Checking for other email references...');

  // Update profiles table
  console.log('🔄 Updating profile ID...');
  const { error: updateProfileError } = await supabase
    .from('profiles')
    .update({ id: newUserId })
    .eq('id', oldProfileId);

  if (updateProfileError) {
    console.log(`❌ Failed to update profile ID: ${updateProfileError.message}`);
    console.log('\n⚠️  ALTERNATIVE SOLUTION:');
    console.log('The profile cannot be updated due to remaining foreign key constraints.');
    console.log('You have two options:');
    console.log('1. Delete the new auth.user (9f0e50c6-b5cf-4bc4-9a7b-8a1b06a78898) in Supabase Auth');
    console.log('   and use the existing profile (7ee6b21e-d72d-496a-bed5-8a1040e076c4)');
    console.log('2. Manually update the profile ID in Supabase SQL:');
    console.log(`   UPDATE profiles SET id = '${newUserId}' WHERE id = '${oldProfileId}';`);
  } else {
    console.log('✅ Profile ID updated successfully!');

    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const { data: verifiedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', newUserId)
      .single();

    if (verifiedProfile) {
      console.log(`✅ Verified: ${verifiedProfile.email} (ID: ${verifiedProfile.id})`);
      console.log('\n🎉 Profile fix complete! The user should now be able to login.');
    } else {
      console.log('❌ Profile still not found');
    }
  }
}

fixProfileIdComplete().catch(console.error);
