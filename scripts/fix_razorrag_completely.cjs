// Completely fix razorrag.official@gmail.com - remove and recreate with correct ID
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

async function fixRazorragCompletely() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║    COMPLETELY FIXING razorrag.official@gmail.com                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const email = 'razorrag.official@gmail.com';
  const newAuthId = '8c6f19b7-c8f8-4969-958c-38c0c373b816';
  const oldProfileId = '7ee6b21e-d72d-496a-bed5-8a1040e076c4';

  // Step 1: Get the profile data first (before deleting)
  console.log('1️⃣  Getting current profile data...');

  const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });
  const profiles = await profileResponse.json();

  if (profiles.length === 0) {
    console.log('   ❌ Profile not found (already deleted)');
  } else {
    const profile = profiles[0];
    console.log(`   ✅ Found profile: ${profile.id}`);
    console.log(`   Name: ${profile.full_name}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Department: ${profile.department_name}`);
  }

  // Step 2: Delete the profile
  console.log('\n2️⃣  Deleting old profile...');

  const deleteProfileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${oldProfileId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });

  if (deleteProfileResponse.ok) {
    console.log('   ✅ Old profile deleted');
  } else {
    console.log('   ❌ Failed to delete profile');
  }

  // Step 3: Create new profile with correct ID
  console.log('\n3️⃣  Creating new profile with correct ID...');

  const profileData = profiles.length > 0 ? profiles[0] : {
    email: email,
    full_name: 'Librarian',
    role: 'department',
    department_name: 'library',
    is_active: true
  };

  const { id, created_at, updated_at, ...cleanData } = profileData;

  const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      ...cleanData,
      id: newAuthId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  if (createResponse.ok) {
    console.log('   ✅ New profile created with correct ID!');
    console.log(`   Profile ID: ${newAuthId}`);
    console.log(`   Matches auth.user ID: ✅`);
  } else {
    const error = await createResponse.text();
    console.log('   ❌ Failed:', error.substring(0, 200));
  }

  // Step 4: Verify
  console.log('\n4️⃣  Verification...');

  const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });

  const verifyProfiles = await verifyResponse.json();

  if (verifyProfiles.length > 0) {
    const vp = verifyProfiles[0];
    console.log(`   Email: ${vp.email}`);
    console.log(`   Profile ID: ${vp.id}`);
    console.log(`   Auth User ID: ${newAuthId}`);

    if (vp.id === newAuthId) {
      console.log('\n   ╔════════════════════════════════════════════════════════════╗');
      console.log('   ║  ✅ FIXED! IDs NOW MATCH - LOGIN WILL WORK!                ║');
      console.log('   ╚════════════════════════════════════════════════════════════╝');
    }
  }

  // Step 5: Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📋 LOGIN CREDENTIALS');
  console.log('═'.repeat(70));
  console.log(`\n   Email: ${email}`);
  console.log('   Password: Jecrc@2026');
  console.log('   URL: /staff/login');
  console.log('\n' + '═'.repeat(70));
}

fixRazorragCompletely().catch(console.error);
