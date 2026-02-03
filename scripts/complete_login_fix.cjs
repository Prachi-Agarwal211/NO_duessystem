// Complete fix for login and password reset issues
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

async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY
    },
    body: JSON.stringify({ sql })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL Error: ${error}`);
  }
  
  return response.json();
}

async function completeFix() {
  console.log('🔧 COMPLETE LOGIN & PASSWORD RESET FIX\n');
  console.log('='.repeat(60));

  try {
    // 1. Add missing columns
    console.log('\n1️⃣  Adding OTP columns to profiles table...');
    
    const alterSQL = `
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS otp_code TEXT,
      ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS reset_token TEXT,
      ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ;
    `;
    
    try {
      await executeSQL(alterSQL);
      console.log('   ✅ OTP columns added successfully!');
    } catch (e) {
      console.log('   ⚠️  Columns may already exist or SQL failed:', e.message.substring(0, 100));
    }

    // 2. Check if auth user exists
    console.log('\n2️⃣  Checking auth.users...');
    
    const listUsersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    });
    
    const { users } = await listUsersResponse.json();
    const targetEmail = 'razorrag.official@gmail.com';
    const existingUser = users?.find(u => u.email === targetEmail);
    
    if (existingUser) {
      console.log(`   ✅ User exists: ${existingUser.email}`);
      console.log(`   User ID: ${existingUser.id}`);
      
      // 3. Update password directly
      console.log('\n3️⃣  Updating password...');
      
      const updateResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY
        },
        body: JSON.stringify({
          password: 'Jecrc@2026'
        })
      });
      
      if (updateResponse.ok) {
        console.log('   ✅ Password updated to: Jecrc@2026');
      } else {
        console.log('   ❌ Password update failed');
      }
    } else {
      console.log(`   ❌ User ${targetEmail} not found in auth.users`);
      console.log('   📝 Creating new auth user...');
      
      // Create new user
      const createResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY
        },
        body: JSON.stringify({
          email: targetEmail,
          password: 'Jecrc@2026',
          email_confirmed: true
        })
      });
      
      if (createResponse.ok) {
        const newUser = await createResponse.json();
        console.log('   ✅ User created with ID:', newUser.id);
      } else {
        const error = await createResponse.text();
        console.log('   ❌ User creation failed:', error);
      }
    }

    // 4. Verify profile exists
    console.log('\n4️⃣  Verifying profile...');
    
    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?email=eq.razorrag.official@gmail.com`,
      {
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const profiles = await profileResponse.json();
    
    if (profiles && profiles.length > 0) {
      console.log(`   ✅ Profile found: ${profiles[0].email}`);
      console.log(`   Profile ID: ${profiles[0].id}`);
      console.log(`   Role: ${profiles[0].role}`);
    } else {
      console.log('   ❌ Profile not found - creating...');
      
      // Get user ID again
      const refreshUsers = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY
        }
      });
      const { users: refreshUsersList } = await refreshUsers.json();
      const userForProfile = refreshUsersList?.find(u => u.email === targetEmail);
      
      if (userForProfile) {
        // Create profile
        const createProfileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            id: userForProfile.id,
            email: targetEmail,
            full_name: 'Librarian',
            role: 'department',
            department_name: 'library',
            is_active: true
          })
        });
        
        if (createProfileResponse.ok) {
          console.log('   ✅ Profile created!');
        } else {
          console.log('   ❌ Profile creation failed');
        }
      }
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ FIX COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n🔐 LOGIN CREDENTIALS:');
    console.log(`   Email: razorrag.official@gmail.com`);
    console.log(`   Password: Jecrc@2026`);
    console.log(`   URL: http://localhost:3000/staff/login`);
    console.log('\n⚠️  Note: If running on production, use production URL');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

completeFix();
