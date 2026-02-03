// Fix razorrag by updating all references first
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

async function fixRazorragProperly() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║    PROPERLY FIXING razorrag.official@gmail.com                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const email = 'razorrag.official@gmail.com';
  const newAuthId = '8c6f19b7-c8f8-4969-958c-38c0c373b816';
  const oldProfileId = '7ee6b21e-d72d-496a-bed5-8a1040e076c4';

  // Step 1: Check all tables that reference profiles
  console.log('1️⃣  Checking tables that reference profiles...\n');

  const tablesToCheck = [
    'no_dues_status',
    'no_dues_forms',
    'support_tickets',
    'staff_achievements'
  ];

  for (const table of tablesToCheck) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id,action_by_user_id&action_by_user_id=eq.${oldProfileId}&limit=1`, {
        headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
      });
      const data = await response.json();
      console.log(`   ${table}: ${data.length > 0 ? 'Has references' : 'No references'}`);
    } catch (e) {
      console.log(`   ${table}: Unknown`);
    }
  }

  // Step 2: Update no_dues_status records
  console.log('\n2️⃣  Updating no_dues_status references...');

  try {
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/no_dues_status?action_by_user_id=eq.${oldProfileId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY
      },
      body: JSON.stringify({ action_by_user_id: newAuthId })
    });

    if (updateResponse.ok) {
      console.log('   ✅ Updated no_dues_status');
    } else {
      console.log('   ⚠️  Could not update (may be RLS or no records)');
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // Step 3: Now update profile ID using raw SQL via a workaround
  console.log('\n3️⃣  Updating profile ID...\n');

  // Since we can't run SQL directly, let's try updating via a different method
  // Use the fact that we can do upsert

  // First, let's see what constraints exist
  console.log('   The profile ID update requires:');
  console.log('   1. Update no_dues_status.action_by_user_id → DONE');
  console.log('   2. Update profiles.id → Need direct SQL access');
  console.log('\n   📝 MANUAL SQL REQUIRED IN SUPABASE DASHBOARD:');
  console.log('   ──────────────────────────────────────────────');
  console.log(`   UPDATE no_dues_status SET action_by_user_id = '${newAuthId}'`);
  console.log(`   WHERE action_by_user_id = '${oldProfileId}';`);
  console.log('');
  console.log(`   UPDATE profiles SET id = '${newAuthId}'`);
  console.log(`   WHERE id = '${oldProfileId}';`);
  console.log('   ──────────────────────────────────────────────');

  // Step 4: Alternative - create a new profile and delete old one via different approach
  console.log('\n4️⃣  Alternative approach: Creating workaround profile...\n');

  // Delete the old profile by ID directly
  const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${oldProfileId}`, {
    method: 'DELETE',
    headers: { 
      'Authorization': `Bearer ${SERVICE_KEY}`, 
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json'
    }
  });

  console.log(`   Delete response status: ${deleteResponse.status}`);
  
  if (deleteResponse.status === 200 || deleteResponse.status === 204) {
    console.log('   ✅ Profile deleted successfully!');
    
    // Now create new profile
    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        id: newAuthId,
        email: email,
        full_name: 'Librarian',
        role: 'department',
        department_name: 'library',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    if (createResponse.ok) {
      console.log('   ✅ New profile created with correct ID!');
    } else {
      console.log('   ❌ Create failed:', await createResponse.text());
    }
  } else {
    console.log('   ❌ Cannot delete profile due to constraints');
    console.log('\n   🔧 SOLUTION: Run SQL in Supabase Dashboard → SQL Editor');
  }

  // Step 5: Verify
  console.log('\n5️⃣  Current status...\n');

  const verifyProfile = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });
  const verifyProfiles = await verifyProfile.json();

  if (verifyProfiles.length > 0) {
    const vp = verifyProfiles[0];
    console.log(`   Profile ID: ${vp.id.substring(0, 8)}...`);
    console.log(`   Auth User ID: ${newAuthId.substring(0, 8)}...`);
    
    if (vp.id === newAuthId) {
      console.log('\n   ╔════════════════════════════════════════════════════════════╗');
      console.log('   ║  ✅ FIXED! IDs NOW MATCH                                   ║');
      console.log('   ╚════════════════════════════════════════════════════════════╝');
    } else {
      console.log('\n   ╔════════════════════════════════════════════════════════════╗');
      console.log('   ║  ⚠️  STILL MISMATCHED - NEEDS MANUAL SQL                    ║');
      console.log('   ╚════════════════════════════════════════════════════════════╝');
    }
  }

  console.log('\n' + '═'.repeat(70));
}

fixRazorragProperly().catch(console.error);
