// Recreate librarian profile for new auth.user
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

async function recreateProfile() {
  console.log('🔧 RECREATING LIBRARIAN PROFILE\n');
  console.log('='.repeat(60));

  const newUserId = '8c6f19b7-c8f8-4969-958c-38c0c373b816';
  const email = 'razorrag.official@gmail.com';

  // Check if profile exists
  console.log('\n1️⃣  Checking current profiles...');

  const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  const existingProfiles = await checkResponse.json();
  
  if (existingProfiles && existingProfiles.length > 0) {
    console.log('   Profile already exists:', existingProfiles[0].id);
    console.log('   ✅ Nothing to do - profile matches auth.user');
  } else {
    console.log('   ❌ No profile found - creating...');

    // Create profile with minimal required fields
    const profileData = {
      id: newUserId,
      email: email,
      full_name: 'Librarian',
      role: 'department',
      department_name: 'library',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('\n2️⃣  Creating profile with data:');
    console.log(JSON.stringify(profileData, null, 2));

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
      console.log('   ✅ Profile created successfully!');
    } else {
      const error = await createResponse.text();
      console.log('   ❌ Failed to create profile:', error);
    }
  }

  // 3. Verify login works
  console.log('\n3️⃣  Final verification...');

  const verifyResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  const { users } = await verifyResponse.json();
  const targetUser = users?.find(u => u.email === email);

  if (targetUser) {
    console.log('   ✅ Auth user exists:', targetUser.id);
    console.log('   ✅ Email:', targetUser.email);
  }

  const profileVerify = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  const profiles = await profileVerify.json();
  
  if (profiles && profiles.length > 0) {
    console.log('   ✅ Profile exists:', profiles[0].id);
    console.log('   ✅ Profile email:', profiles[0].email);
    
    // Check if IDs match
    if (profiles[0].id === targetUser?.id) {
      console.log('   ✅ IDs MATCH - login will work!');
    } else {
      console.log('   ⚠️  ID MISMATCH - profile ID:', profiles[0].id);
      console.log('   ⚠️  Auth user ID:', targetUser?.id);
    }
  } else {
    console.log('   ❌ Profile not found');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ READY TO LOGIN:');
  console.log('='.repeat(60));
  console.log('\n🔐 LOGIN CREDENTIALS:');
  console.log(`   Email: ${email}`);
  console.log('   Password: Jecrc@2026');
  console.log('   URL: /staff/login');
  console.log('\n🎯 After login, you should be redirected to /staff/dashboard');
}

recreateProfile();
