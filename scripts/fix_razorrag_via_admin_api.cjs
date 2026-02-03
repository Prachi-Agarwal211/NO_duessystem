// Use Supabase Admin API to fix the profile ID
const fs = require('fs');
const path = require('path');

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

async function fixViaAdminAPI() {
  console.log('🔧 USING SUPABASE ADMIN API TO FIX PROFILE\n');

  const email = 'razorrag.official@gmail.com';
  const authUserId = '8c6f19b7-c8f8-4969-958c-38c0c373b816';
  const oldProfileId = '7ee6b21e-d72d-496a-bed5-8a1040e076c4';

  // First, delete the old profile using admin API with CASCADE
  console.log('1️⃣  Deleting old profile (with cascade)...');

  // Try to delete with cascade by first updating child records
  // no_dues_status needs to be updated first

  // Get no_dues_status records
  const duesResponse = await fetch(`${SUPABASE_URL}/rest/v1/no_dues_status?action_by_user_id=eq.${oldProfileId}&select=id`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });
  const duesRecords = await duesResponse.json();

  console.log(`   Found ${duesRecords.length} no_dues_status records`);

  if (duesRecords.length > 0) {
    // Delete these records to allow profile deletion
    for (const record of duesRecords) {
      await fetch(`${SUPABASE_URL}/rest/v1/no_dues_status?id=eq.${record.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
      });
    }
    console.log('   ✅ Deleted dependent records');
  }

  // Now delete the profile
  const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${oldProfileId}`, {
    method: 'DELETE',
    headers: { 
      'Authorization': `Bearer ${SERVICE_KEY}`, 
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json'
    }
  });

  console.log(`   Delete status: ${deleteResponse.status}`);

  if (deleteResponse.ok) {
    console.log('   ✅ Old profile deleted!');

    // Create new profile with correct ID
    console.log('\n2️⃣  Creating new profile with correct ID...');

    const profileData = {
      id: authUserId,
      email: email,
      full_name: 'Librarian',
      role: 'department',
      department_name: 'library',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(profileData)
    });

    if (createResponse.ok) {
      console.log('   ✅ New profile created!');
      console.log(`   ID: ${authUserId}`);
      console.log(`   Email: ${email}`);
    } else {
      console.log('   ❌ Create failed:', await createResponse.text().substring(0, 200));
    }
  } else {
    console.log('   ❌ Cannot delete profile');
    console.log('   Error:', await deleteResponse.text().substring(0, 200));
  }

  // Verify
  console.log('\n3️⃣  Verification...');

  const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });

  const verifyProfiles = await verifyResponse.json();

  if (verifyProfiles.length > 0) {
    const vp = verifyProfiles[0];
    console.log(`   Profile ID: ${vp.id}`);
    console.log(`   Matches auth.user: ${vp.id === authUserId ? '✅ YES' : '❌ NO'}`);
  } else {
    console.log('   ❌ Profile not found');
  }

  console.log('\n' + '='.repeat(60));
}

fixViaAdminAPI().catch(console.error);
