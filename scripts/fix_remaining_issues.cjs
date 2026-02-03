// Fix remaining issues: 1 mismatched + 5 missing profiles
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

async function fixRemainingIssues() {
  console.log('🔧 FIX REMAINING LOGIN ISSUES\n');
  console.log('='.repeat(70));

  // Get all data
  const usersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });
  const { users } = await usersResponse.json();

  const profilesResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });
  const profiles = await profilesResponse.json();

  // 1. Fix razorrag.official@gmail.com (ID mismatch)
  console.log('\n1️⃣  FIXING: razorrag.official@gmail.com (ID mismatch)');

  const razorragUser = users.find(u => u.email === 'razorrag.official@gmail.com');
  const razorragProfile = profiles.find(p => p.email === 'razorrag.official@gmail.com');

  if (razorragUser && razorragProfile) {
    console.log(`   Auth ID: ${razorragUser.id}`);
    console.log(`   Profile ID: ${razorragProfile.id}`);
    
    // Delete old profile and create new with correct ID
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${razorragProfile.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
    });

    const { id, created_at, updated_at, ...profileData } = razorragProfile;

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
        id: razorragUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    if (createResponse.ok) {
      console.log('   ✅ Profile ID fixed!');
    } else {
      console.log('   ❌ Failed:', await createResponse.text());
    }
  }

  // 2. Create profiles for auth.users without profiles
  console.log('\n2️⃣  CREATING PROFILES for missing accounts');

  const missingEmails = [
    'alumni@jecrcu.edu.in',
    'registrar@jecrcu.edu.in', 
    'accounts@jecrcu.edu.in',
    'hostel@jecrcu.edu.in',
    'it@jecrcu.edu.in'
  ];

  for (const email of missingEmails) {
    const user = users.find(u => u.email === email);
    if (user) {
      console.log(`\n   Creating profile for: ${email}`);

      // Determine role and department from email
      let role = 'department';
      let department = 'general';
      let fullName = email.split('@')[0];

      if (email.includes('alumni')) {
        department = 'alumni_association';
        fullName = 'Alumni Coordinator';
      } else if (email.includes('registrar')) {
        department = 'registrar';
        fullName = 'Registrar';
      } else if (email.includes('accounts')) {
        department = 'accounts_department';
        fullName = 'Accounts Department';
      } else if (email.includes('hostel')) {
        department = 'hostel';
        fullName = 'Hostel Manager';
      } else if (email.includes('it')) {
        department = 'it_department';
        fullName = 'IT Department';
      }

      const profileData = {
        id: user.id,
        email: user.email,
        full_name: fullName,
        role: role,
        department_name: department,
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
        console.log('   ✅ Profile created!');
      } else {
        const error = await createResponse.text();
        console.log(`   ⚠️  ${error.substring(0, 100)}`);
      }
    }
  }

  // 3. Final verification
  console.log('\n3️⃣  FINAL VERIFICATION');
  console.log('-'.repeat(70));

  // Re-fetch data
  const newUsersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });
  const newUsers = await newUsersResponse.json();

  const newProfilesResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY }
  });
  const newProfiles = await newProfilesResponse.json();

  let working = 0;
  let issues = 0;

  console.log('\nVerifying all accounts...\n');

  for (const user of newUsers.users || []) {
    const profile = newProfiles.find(p => p.email.toLowerCase() === user.email.toLowerCase());
    
    if (!profile) {
      console.log(`   ❌ ${user.email}: No profile`);
      issues++;
    } else if (profile.id !== user.id) {
      console.log(`   🔄 ${user.email}: ID mismatch`);
      issues++;
    } else if (!profile.is_active) {
      console.log(`   ⏸️  ${user.email}: Profile inactive`);
      issues++;
    } else {
      working++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 VERIFICATION RESULTS');
  console.log('='.repeat(70));
  console.log(`   ✅ Working accounts: ${working}`);
  console.log(`   ❌ Issues remaining: ${issues}`);
  console.log(`   📋 Total auth.users: ${newUsers.users?.length}`);
  console.log(`   📋 Total profiles: ${newProfiles.length}`);

  // 4. Working accounts list
  console.log('\n' + '='.repeat(70));
  console.log('🔐 ACCOUNTS THAT SHOULD NOW WORK');
  console.log('='.repeat(70));

  for (const user of newUsers.users || []) {
    const profile = newProfiles.find(p => p.email.toLowerCase() === user.email.toLowerCase());
    
    if (profile && profile.id === user.id && profile.is_active) {
      console.log(`\n   ${profile.full_name || profile.email}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Role: ${profile.role}`);
      console.log(`   Password: Jecrc@2026`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ FIX COMPLETE!');
  console.log('='.repeat(70));
  console.log('\nTry logging in with any of the above accounts at: /staff/login');
}

fixRemainingIssues().catch(console.error);
