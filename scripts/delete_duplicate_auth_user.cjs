// Delete duplicate auth.user using Supabase Admin API
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

async function deleteDuplicateAuthUser() {
  console.log('🗑️ DELETING DUPLICATE AUTH.USER\n');
  console.log('='.repeat(60));

  const duplicateUserId = '9f0e50c6-b5cf-4bc4-9a7b-8a1b06a78898';
  const existingProfileId = '7ee6b21e-d72d-496a-bed5-8a1040e076c4';
  const email = 'razorrag.official@gmail.com';

  console.log(`\n📋 User to delete:`);
  console.log(`   ID: ${duplicateUserId}`);
  console.log(`   Email: ${email}`);

  console.log(`\n📋 Existing profile to keep:`);
  console.log(`   ID: ${existingProfileId}`);
  console.log(`   Email: ${email}`);

  console.log('\n⚠️  CONFIRMATION REQUIRED:');
  console.log('   This will permanently delete the auth.user with ID:');
  console.log(`   ${duplicateUserId}`);
  console.log('\n   The profile (ID: ${existingProfileId}) will remain intact.');
  console.log('   After deletion, login with razorrag.official@gmail.com');
  console.log('   will use the existing profile.');

  // Check if user exists first
  console.log('\n🔍 Checking if user exists in auth.users...');
  try {
    const { data: { user }, error } = await supabase.auth.admin.getUserById(duplicateUserId);
    
    if (user) {
      console.log(`✅ User found: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      
      // Delete the user
      console.log('\n🗑️ Deleting user...');
      const { error: deleteError } = await supabase.auth.admin.deleteUser(duplicateUserId);
      
      if (deleteError) {
        console.log(`❌ Failed to delete user: ${deleteError.message}`);
        console.log('\n📝 MANUAL STEPS:');
        console.log('   Go to Supabase Dashboard → Authentication → Users');
        console.log(`   Delete user with ID: ${duplicateUserId}`);
      } else {
        console.log('✅ User deleted successfully!');
        console.log('\n🎉 DONE! The duplicate auth.user has been removed.');
        console.log('   You can now login with razorrag.official@gmail.com');
        console.log('   and it will use the existing profile.');
      }
    } else {
      console.log('❌ User not found (already deleted or invalid ID)');
    }
  } catch (e) {
    console.log(`❌ Error: ${e.message}`);
    console.log('\n📝 MANUAL STEPS:');
    console.log('   Go to Supabase Dashboard → Authentication → Users');
    console.log(`   Delete user with ID: ${duplicateUserId}`);
  }

  console.log('\n' + '='.repeat(60));
}

// Run the function
deleteDuplicateAuthUser().catch(console.error);
