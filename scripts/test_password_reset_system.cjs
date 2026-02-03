// Comprehensive test for password reset system
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

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

// Also load from .env
const mainEnvFile = path.join(__dirname, '../.env');
if (fs.existsSync(mainEnvFile)) {
  const envContent = fs.readFileSync(mainEnvFile, 'utf8');
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

async function testPasswordResetSystem() {
  console.log('🔍 COMPREHENSIVE PASSWORD RESET SYSTEM TEST\n');
  console.log('='.repeat(60));

  // 1. Check profiles table columns
  console.log('\n1️⃣  CHECKING PROFILES TABLE COLUMNS...');
  
  const requiredColumns = [
    'otp_code', 'otp_expires_at', 'otp_attempts',
    'reset_token', 'reset_token_expires_at', 'last_password_change'
  ];

  const { data: profileSample } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (profileSample && profileSample.length > 0) {
    console.log('   Existing columns:', Object.keys(profileSample[0]).join(', '));
    
    const missingColumns = requiredColumns.filter(col => !(col in profileSample[0]));
    if (missingColumns.length > 0) {
      console.log('   ❌ Missing columns:', missingColumns.join(', '));
    } else {
      console.log('   ✅ All required columns exist');
    }
  } else {
    console.log('   ❌ No profiles found to check columns');
  }

  // 2. Test SMTP connection
  console.log('\n2️⃣  TESTING SMTP CONNECTION...');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    await transporter.verify();
    console.log('   ✅ SMTP connection successful');
    console.log(`   Server: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    console.log(`   User: ${process.env.SMTP_USER}`);
  } catch (e) {
    console.log('   ❌ SMTP connection failed:', e.message);
    console.log('   📝 Gmail requires App Password, not regular password');
    console.log('   📝 Go to: Google Account → Security → 2-Step Verification → App Passwords');
  }

  // 3. Check if user has OTP-capable profile
  console.log('\n3️⃣  CHECKING USER PROFILE FOR OTP...');
  
  const testEmail = 'razorrag.official@gmail.com';
  const { data: testProfile } = await supabase
    .from('profiles')
    .select('id, email, role, otp_code, otp_expires_at, reset_token, reset_token_expires_at')
    .eq('email', testEmail)
    .single();

  if (testProfile) {
    console.log(`   Email: ${testProfile.email}`);
    console.log(`   Role: ${testProfile.role}`);
    console.log(`   Has OTP: ${testProfile.otp_code ? 'Yes' : 'No'}`);
    console.log(`   Has Reset Token: ${testProfile.reset_token ? 'Yes' : 'No'}`);
  } else {
    console.log('   ❌ Profile not found');
  }

  // 4. Test password update directly
  console.log('\n4️⃣  TESTING DIRECT PASSWORD UPDATE...');
  
  // Get user from auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.log('   ❌ Cannot list users:', listError.message);
  } else {
    const targetUser = users.find(u => u.email === testEmail);
    
    if (targetUser) {
      console.log(`   Found user: ${targetUser.email}`);
      console.log(`   User ID: ${targetUser.id}`);
      
      // Try to update password
      const testPassword = 'Jecrc@2026';
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        targetUser.id,
        { password: testPassword }
      );
      
      if (updateError) {
        console.log('   ❌ Password update failed:', updateError.message);
      } else {
        console.log('   ✅ Password updated successfully!');
        console.log(`   New password: ${testPassword}`);
      }
    } else {
      console.log('   ❌ User not found in auth.users');
    }
  }

  // 5. Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY:');
  console.log('='.repeat(60));
  
  console.log('\n🔐 TO LOGIN:');
  console.log(`   Email: ${testEmail}`);
  console.log('   Password: Jecrc@2026 (if above test succeeded)');
  console.log('   URL: /staff/login');
  
  console.log('\n⚠️  IF FORGOT PASSWORD DOES NOT WORK:');
  console.log('   1. Check SMTP configuration (Gmail requires App Password)');
  console.log('   2. Ensure profiles table has OTP columns');
  console.log('   3. Check spam folder for OTP emails');
  console.log('   4. Use the direct password update above as workaround');
}

testPasswordResetSystem().catch(console.error);
