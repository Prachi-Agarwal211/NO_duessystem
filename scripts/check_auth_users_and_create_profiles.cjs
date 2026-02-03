// Check auth.users and create profiles for missing users
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment from .env.local
const envFile = path.join(__dirname, '../.env.local');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAuthUsersAndCreateProfiles() {
  console.log('🔍 CHECKING AUTH.USERS AND CREATING MISSING PROFILES...\n');

  // First, get all existing profile IDs
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role');

  if (profileError) {
    console.error('❌ Error fetching profiles:', profileError.message);
    return;
  }

  const existingProfileIds = new Set(profiles?.map(p => p.id) || []);
  console.log(`📊 Existing profiles: ${existingProfileIds.size}`);

  // Try to get user count via RPC or check specific user
  const testUserId = '9f0e50c6-b5cf-4bc4-9a7b-8a1b06a78898';
  
  console.log(`\n🔍 Checking user ${testUserId}:`);
  
  // Check if user has a profile
  const { data: testProfile, error: testProfileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', testUserId)
    .single();

  if (testProfile) {
    console.log(`✅ User has profile: ${testProfile.email} (${testProfile.role})`);
  } else if (testProfileError && testProfileError.code === 'PGRST116') {
    console.log(`❌ User does NOT have a profile in the profiles table`);
    
    // Try to get user from auth.users (admin API)
    console.log('\n🔐 Attempting to get user from auth.users...');
    
    // Using admin API to get user
    try {
      const { data: { user }, error } = await supabase.auth.admin.getUserById(testUserId);
      
      if (user) {
        console.log(`✅ Found user in auth.users: ${user.email}`);
        console.log(`  User ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        
        // Create a profile for this user
        console.log('\n📝 Creating profile for this user...');
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.email.split('@')[0], // Use email prefix as name
            role: 'department', // Default role
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.log(`❌ Failed to create profile: ${insertError.message}`);
        } else {
          console.log(`✅ Profile created successfully!`);
        }
      } else {
        console.log(`❌ User not found in auth.users: ${error?.message || 'Unknown error'}`);
      }
    } catch (e) {
      console.log(`❌ Error checking auth user: ${e.message}`);
    }
  } else {
    console.log(`❌ Error checking profile: ${testProfileError?.message}`);
  }

  // List all profile IDs to compare
  console.log('\n📋 ALL EXISTING PROFILE IDs:');
  profiles?.forEach(p => {
    console.log(`  ${p.id}: ${p.email} (${p.role})`);
  });
}

checkAuthUsersAndCreateProfiles().catch(console.error);
