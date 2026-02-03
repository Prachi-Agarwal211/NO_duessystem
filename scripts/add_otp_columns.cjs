// Add missing OTP columns to profiles table
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
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

async function addOTPColumns() {
  console.log('🔧 ADDING MISSING OTP COLUMNS TO PROFILES TABLE\n');
  console.log('='.repeat(60));

  // SQL to add missing columns
  const alterTableSQL = `
    ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS otp_code TEXT,
    ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reset_token TEXT,
    ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ;
  `;

  console.log('\n📝 Executing SQL to add columns...');
  console.log(alterTableSQL);

  try {
    const { error } = await supabase.rpc('exec', { sql: alterTableSQL });
    
    // If rpc doesn't work, try raw query through a different approach
    if (error) {
      console.log('❌ RPC approach failed, trying alternative...');
      
      // Try using the REST API with a workaround
      // We'll use insert with minimal data to trigger the column creation
      // Actually, we need to use Supabase's SQL runner or direct SQL
      
      console.log('\n📝 Alternative: Please run this SQL in Supabase Dashboard → SQL Editor:\n');
      console.log('='.repeat(60));
      console.log(alterTableSQL);
      console.log('='.repeat(60));
    } else {
      console.log('✅ Columns added successfully!');
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
    console.log('\n📝 Please run this SQL in Supabase Dashboard → SQL Editor:\n');
    console.log('='.repeat(60));
    console.log(alterTableSQL);
    console.log('='.repeat(60));
  }

  // Also check if the profile exists
  console.log('\n🔍 Checking for razorrag.official@gmail.com profile...');
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('email', 'razorrag.official@gmail.com')
    .single();

  if (profile) {
    console.log(`✅ Found profile: ${profile.email}`);
    console.log(`   ID: ${profile.id}`);
    console.log(`   Role: ${profile.role}`);
  } else {
    console.log('❌ Profile not found');
    console.log('   This might be because the profile uses a different email');
    
    // List all profiles to find the correct one
    console.log('\n📋 Listing all profiles to find Librarian...');
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'department');

    allProfiles?.forEach(p => {
      if (p.full_name?.toLowerCase().includes('librarian')) {
        console.log(`\n   Found Librarian profile:`);
        console.log(`   Email: ${p.email}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   Name: ${p.full_name}`);
      }
    });
  }
}

addOTPColumns().catch(console.error);
