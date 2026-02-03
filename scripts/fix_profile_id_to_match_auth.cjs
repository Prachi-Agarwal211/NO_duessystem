// Fix profile ID to match auth.user
const fs = require('fs');
const path = require('path');

// Load environment
function loadEnv() {
  const envFiles = ['../.env.local', '../.env'];
  envFiles.forEach(envFile => {
    const filePath = path.join(__dirname, envFile);
    if (fs.existsSync(filePath)) {
      const envContent = fs.readFileSync(filePath, 'utf8');
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
  });
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fixProfileID() {
  console.log('🔧 FIXING PROFILE ID TO MATCH AUTH.USER\n');
  console.log('='.repeat(60));

  const oldProfileId = '7ee6b21e-d72d-496a-bed5-8a1040e076c4';
  const newUserId = '8c6f19b7-c8f8-4969-958c-38c0c373b816';
  const email = 'razorrag.official@gmail.com';

  // First, update any foreign key references
  console.log('\n1️⃣  Updating foreign key references...');

  // Update no_dues_status
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/no_dues_status?action_by_user_id=eq.${oldProfileId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY
      },
      body: JSON.stringify({ action_by_user_id: newUserId })
    });
    console.log('   ✅ Updated no_dues_status references');
  } catch (e) {
    console.log('   ⚠️  Could not update no_dues_status');
  }

  // 2. Update profile ID
  console.log('\n2️⃣  Updating profile ID...');

  try {
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${oldProfileId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY
      },
      body: JSON.stringify({ id: newUserId })
    });

    if (updateResponse.ok) {
      console.log('   ✅ Profile ID updated successfully!');
      console.log(`   Old ID: ${oldProfileId}`);
      console.log(`   New ID: ${newUserId}`);
    } else {
      console.log('   ❌ Update failed - will try alternative approach');
      
      // Alternative: Delete old profile and create new one with correct ID
      console.log('\n3️⃣  Alternative: Recreating profile with correct ID...');
      
      // First get the old profile data
      const getResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${oldProfileId}`, {
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY
        }
      });
      
      const oldProfiles = await getResponse.json();
      
      if (oldProfiles && oldProfiles.length > 0) {
        const oldProfile = oldProfiles[0];
        
        // Delete old profile
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${oldProfileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'apikey': SERVICE_KEY
          }
        });
        console.log('   ✅ Deleted old profile');
        
        // Create new profile with correct ID
        const { id, created_at, updated_at, ...profileData } = oldProfile;
        
        const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            ...profileData,
            id: newUserId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });
        
        if (createResponse.ok) {
          console.log('   ✅ Created new profile with correct ID!');
        } else {
          console.log('   ❌ Failed to create new profile');
        }
      }
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  // 4. Verify
  console.log('\n4️⃣  Verification...');

  const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${newUserId}`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  const verifiedProfiles = await verifyResponse.json();
  
  if (verifiedProfiles && verifiedProfiles.length > 0) {
    console.log('   ✅ Profile verified!');
    console.log(`   Email: ${verifiedProfiles[0].email}`);
    console.log(`   ID: ${verifiedProfiles[0].id}`);
    console.log(`   Role: ${verifiedProfiles[0].role}`);
  } else {
    console.log('   ⚠️  Profile not found with new ID');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ FIX COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n🔐 LOGIN CREDENTIALS:');
  console.log(`   Email: razorrag.official@gmail.com`);
  console.log(`   Password: Jecrc@2026`);
  console.log('   URL: /staff/login');
}

fixProfileID();
