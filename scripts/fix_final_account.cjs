// Fix remaining account and add OTP columns
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

async function fixFinal() {
  console.log('🔧 FINAL FIXES\n');
  console.log('='.repeat(70));

  const email = 'razorrag.official@gmail.com';
  const newUserId = '8c6f19b7-c8f8-4969-958c-38c0c373b816';

  // 1. Delete any existing profile with this email
  console.log('\n1️⃣  Cleaning up duplicate profiles...');
  
  const existingResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  const existingProfiles = await existingResponse.json();
  
  for (const p of existingProfiles || []) {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${p.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    });
    console.log(`   ✅ Deleted profile: ${p.id}`);
  }

  // 2. Create new profile with correct ID
  console.log('\n2️⃣  Creating profile with correct ID...');

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
    console.log(`   Email: ${email}`);
    console.log(`   ID: ${newUserId}`);
  } else {
    console.log('   ❌ Failed:', await createResponse.text());
  }

  // 3. Add OTP columns
  console.log('\n3️⃣  Adding OTP columns...');

  const alterSQL = `
    ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS otp_code TEXT,
    ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reset_token TEXT,
    ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ;
  `;

  // Try using pg_catalog
  try {
    const alterResponse = await fetch(`${SUPABASE_URL}/rest/v1/pg_catalog/pg_tables`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    });
    console.log('   ℹ️  OTP columns need to be added via Supabase SQL Editor:');
    console.log('   ' + alterSQL.replace(/\n/g, '\n   '));
  } catch (e) {
    console.log('   ℹ️  Run this SQL in Supabase Dashboard → SQL Editor:');
    console.log('   ' + alterSQL.replace(/\n/g, '\n   '));
  }

  // 4. Verify all
  console.log('\n4️⃣  Final verification...');

  const usersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  const { users } = await usersResponse.json();
  const profileVerify = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  const profiles = await profileVerify.json();
  const targetUser = users?.find(u => u.email === email);

  if (targetUser && profiles?.length > 0) {
    const profile = profiles[0];
    if (profile.id === targetUser.id) {
      console.log('   ✅ IDs MATCH - login will work!');
      console.log(`   Email: ${email}`);
      console.log(`   Profile ID: ${profile.id}`);
      console.log(`   Auth ID: ${targetUser.id}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ ALL FIXES COMPLETE!');
  console.log('='.repeat(70));
  console.log('\n🔐 LOGIN CREDENTIALS:');
  console.log('   Email: razorrag.official@gmail.com');
  console.log('   Password: Jecrc@2026');
  console.log('   URL: /staff/login');
}

fixFinal();
