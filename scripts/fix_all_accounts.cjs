// Fix ALL profile/auth.user mismatches
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

async function fixAllAccounts() {
  console.log('🔧 COMPREHENSIVE FIX FOR ALL ACCOUNT MISMATCHES\n');
  console.log('='.repeat(70));

  // 1. Get all auth.users
  console.log('\n1️⃣  Fetching auth.users...');
  
  const usersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  const { users: authUsers } = await usersResponse.json();
  console.log(`   Found ${authUsers?.length || 0} auth.users`);

  // 2. Get all profiles
  console.log('\n2️⃣  Fetching profiles...');

  const profilesResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  const profiles = await profilesResponse.json();
  console.log(`   Found ${profiles?.length || 0} profiles`);

  // 3. Create map of email -> auth user
  const authUserMap = new Map();
  authUsers?.forEach(u => {
    authUserMap.set(u.email.toLowerCase(), u);
  });

  // 4. Find and fix mismatches
  console.log('\n3️⃣  Analyzing mismatches...\n');

  let fixedCount = 0;
  let alreadyMatched = 0;
  let noAuthUser = 0;

  for (const profile of profiles || []) {
    const profileEmail = profile.email?.toLowerCase();
    const authUser = authUserMap.get(profileEmail);

    if (!authUser) {
      console.log(`   ⚠️  No auth.user for: ${profileEmail}`);
      noAuthUser++;
      continue;
    }

    if (profile.id === authUser.id) {
      console.log(`   ✅ ${profileEmail}: Already matched`);
      alreadyMatched++;
    } else {
      console.log(`   🔄 FIXING: ${profileEmail}`);
      console.log(`      Profile ID: ${profile.id}`);
      console.log(`      Auth User ID: ${authUser.id}`);

      // Delete old profile
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY
        }
      });

      // Create new profile with correct ID
      const { id, created_at, updated_at, ...profileData } = profile;

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
          id: authUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });

      if (createResponse.ok) {
        console.log(`      ✅ Fixed!`);
        fixedCount++;
      } else {
        console.log(`      ❌ Failed: ${await createResponse.text()}`);
      }
    }
  }

  // 5. Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY:');
  console.log('='.repeat(70));
  console.log(`   ✅ Already matched: ${alreadyMatched}`);
  console.log(`   🔄 Fixed: ${fixedCount}`);
  console.log(`   ⚠️  No auth.user: ${noAuthUser}`);
  console.log(`   📋 Total: ${profiles?.length || 0}`);

  // 6. List working accounts
  console.log('\n' + '='.repeat(70));
  console.log('🔐 WORKING ACCOUNTS (can login now):');
  console.log('='.repeat(70));

  const workingAccounts = [];
  for (const profile of profiles || []) {
    const profileEmail = profile.email?.toLowerCase();
    const authUser = authUserMap.get(profileEmail);
    
    if (authUser && profile.id === authUser.id && profile.is_active) {
      workingAccounts.push(profile);
    }
  }

  workingAccounts.forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.full_name || p.email}`);
    console.log(`   Email: ${p.email}`);
    console.log(`   Role: ${p.role}`);
    console.log(`   Password: Jecrc@2026 (default)`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('✅ FIX COMPLETE!');
  console.log('='.repeat(70));
}

fixAllAccounts().catch(console.error);
