// Deep analysis of Supabase schema - auth and profiles tables
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

async function analyzeSchema() {
  console.log('🔍 DEEP ANALYSIS OF SUPABASE SCHEMA\n');
  console.log('='.repeat(70));

  // 1. Get auth.users structure
  console.log('\n1️⃣  AUTH.USERS STRUCTURE');
  console.log('-' .repeat(70));

  const usersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  const { users } = await usersResponse.json();
  console.log(`Total auth.users: ${users?.length || 0}`);

  // 2. Get all profiles with their actual structure
  console.log('\n2️⃣  PROFILES TABLE - ACTUAL STRUCTURE');
  console.log('-' .repeat(70));

  const profilesResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  const profiles = await profilesResponse.json();
  console.log(`Total profiles: ${profiles?.length || 0}`);

  if (profiles && profiles.length > 0) {
    const firstProfile = profiles[0];
    console.log('\nFirst profile keys:');
    Object.keys(firstProfile).forEach(key => {
      console.log(`   ${key}: ${typeof firstProfile[key]}`);
    });
  }

  // 3. Analyze auth.users vs profiles relationship
  console.log('\n3️⃣  AUTH.USERS vs PROFILES - RELATIONSHIP ANALYSIS');
  console.log('-' .repeat(70));

  const authUsersByEmail = new Map();
  users?.forEach(u => authUsersByEmail.set(u.email.toLowerCase(), u));

  let matched = 0;
  let mismatched = 0;
  let noProfile = 0;
  let noAuth = 0;

  console.log('\nAnalyzing each auth.user vs profile...\n');

  for (const user of users || []) {
    const profile = profiles?.find(p => p.email.toLowerCase() === user.email.toLowerCase());
    
    if (!profile) {
      noProfile++;
      console.log(`   ⚠️  NO PROFILE: ${user.email}`);
      console.log(`      Auth ID: ${user.id}`);
    } else if (profile.id === user.id) {
      matched++;
    } else {
      mismatched++;
      console.log(`   🔄 MISMATCH: ${user.email}`);
      console.log(`      Auth ID: ${user.id.substring(0, 8)}...`);
      console.log(`      Profile ID: ${profile.id.substring(0, 8)}...`);
    }
  }

  // Check profiles without auth users
  for (const profile of profiles || []) {
    const user = users?.find(u => u.email.toLowerCase() === profile.email.toLowerCase());
    if (!user) {
      noAuth++;
      console.log(`   👤 NO AUTH: ${profile.email} (profile exists but no auth.user)`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`   ✅ IDs Match (login works): ${matched}`);
  console.log(`   🔄 IDs Mismatch (login fails): ${mismatched}`);
  console.log(`   ⚠️  Profile missing: ${noProfile}`);
  console.log(`   👤 Auth missing: ${noAuth}`);
  console.log(`   📋 Total auth.users: ${users?.length}`);
  console.log(`   📋 Total profiles: ${profiles?.length}`);

  // 4. Root cause
  console.log('\n' + '='.repeat(70));
  console.log('🔍 ROOT CAUSE ANALYSIS');
  console.log('='.repeat(70));

  if (mismatched > 0) {
    console.log('\n❌ PROBLEM: Profile IDs do not match auth.user IDs!');
    console.log('\nThe application expects:');
    console.log('   1. User logs in via Supabase Auth');
    console.log('   2. App queries: SELECT * FROM profiles WHERE id = user.id');
    console.log('   3. If IDs dont match, no profile is found → 401/406 error');
  }

  // 5. Solution options
  console.log('\n' + '='.repeat(70));
  console.log('🔧 SOLUTION OPTIONS');
  console.log('='.repeat(70));

  console.log('\nOption 1: DELETE all auth.users and recreate profiles (RECOMMENDED)');
  console.log('   - Delete all 44 auth.users');
  console.log('   - Create new auth.users with the same emails');
  console.log('   - New auth.users will have IDs matching profiles');
  console.log('   - Users will need to set passwords via forgot password');

  console.log('\nOption 2: Change app code to link by email instead of ID');
  console.log('   - Modify: SELECT * FROM profiles WHERE email = user.email');
  console.log('   - No database changes needed');
  console.log('   - Requires code changes');

  console.log('\nOption 3: Add trigger to sync profile IDs');
  console.log('   - Add Postgres trigger on auth.users');
  console.log('   - Auto-update profiles.id when new user is created');
  console.log('   - Complex setup');

  console.log('\n' + '='.repeat(70));
  console.log('💡 RECOMMENDATION: Option 1');
  console.log('   Delete auth.users and recreate with matching IDs');
  console.log('='.repeat(70));
}

analyzeSchema().catch(console.error);
