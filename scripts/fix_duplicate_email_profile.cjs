// Fix duplicate email issue by updating profile ID to match auth.user
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

async function fixDuplicateEmailProfile() {
  console.log('🔧 FIXING DUPLICATE EMAIL PROFILE ISSUE...\n');

  const oldProfileId = '7ee6b21e-d72d-496a-bed5-8a1040e076c4';
  const newUserId = '9f0e50c6-b5cf-4bc4-9a7b-8a1b06a78898';
  const email = 'razorrag.official@gmail.com';

  // Get the old profile
  const { data: oldProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', oldProfileId)
    .single();

  if (!oldProfile) {
    console.log('❌ Old profile not found');
    return;
  }

  console.log(`📋 Old profile: ${oldProfile.email} (ID: ${oldProfile.id})`);
  console.log(`📋 New auth user: ${email} (ID: ${newUserId})`);

  // Option 1: Update the old profile's ID to match the new auth.user
  console.log('\n🔄 Updating profile ID to match auth.user...');

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ id: newUserId })
    .eq('id', oldProfileId);

  if (updateError) {
    console.log(`❌ Update failed: ${updateError.message}`);
    
    // Option 2: Delete old profile and create new one
    console.log('\n🗑️ Deleting old profile and creating new one...');
    
    // First delete the old profile
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', oldProfileId);

    if (deleteError) {
      console.log(`❌ Delete failed: ${deleteError.message}`);
      return;
    }
    console.log('✅ Old profile deleted');

    // Create new profile with the correct ID
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: newUserId,
        email: oldProfile.email,
        full_name: oldProfile.full_name,
        role: oldProfile.role,
        department_name: oldProfile.department_name,
        school_ids: oldProfile.school_ids,
        course_ids: oldProfile.course_ids,
        branch_ids: oldProfile.branch_ids,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.log(`❌ Insert failed: ${insertError.message}`);
    } else {
      console.log('✅ New profile created with correct ID!');
    }
  } else {
    console.log('✅ Profile ID updated successfully!');
  }

  // Verify the fix
  console.log('\n🔍 Verifying fix...');
  const { data: verifiedProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', newUserId)
    .single();

  if (verifiedProfile) {
    console.log(`✅ Verified: ${verifiedProfile.email} (ID: ${verifiedProfile.id})`);
  } else {
    console.log('❌ Profile still not found');
  }
}

fixDuplicateEmailProfile().catch(console.error);
