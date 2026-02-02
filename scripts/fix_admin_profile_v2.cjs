// Fix admin profile issue - update existing profile
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

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAdminProfileV2() {
  try {
    console.log('🔧 FIXING ADMIN PROFILE ISSUE - VERSION 2...\n');
    
    const adminEmail = 'admin@jecrcu.edu.in';
    
    // 1. Get admin user from auth system
    console.log('👤 GETTING ADMIN USER FROM AUTH SYSTEM...');
    
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error getting auth users:', authError.message);
      return;
    }
    
    const adminUser = authUsers.users.find(u => u.email === adminEmail);
    
    if (!adminUser) {
      console.error('❌ Admin user not found in auth system');
      return;
    }
    
    console.log('✅ Admin user found:');
    console.log(`   Auth ID: ${adminUser.id}`);
    console.log(`   Email: ${adminUser.email}`);
    
    // 2. Find existing profile with admin email
    console.log('\n👥 FINDING EXISTING PROFILE...');
    
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', adminEmail)
      .single();
    
    if (profileError) {
      console.error('❌ Error finding profile:', profileError.message);
      return;
    }
    
    console.log('✅ Existing profile found:');
    console.log(`   Profile ID: ${existingProfile.id}`);
    console.log(`   Profile Auth ID: ${existingProfile.id}`);
    console.log(`   Auth User ID: ${adminUser.id}`);
    console.log(`   Role: ${existingProfile.role}`);
    console.log(`   Name: ${existingProfile.full_name}`);
    
    // 3. Check if IDs match
    if (existingProfile.id === adminUser.id) {
      console.log('✅ Profile ID matches auth user ID - no fix needed');
    } else {
      console.log('⚠️  Profile ID does not match auth user ID');
      console.log('🔄 Updating profile to match auth user...');
      
      // Update the profile to use the correct auth user ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          id: adminUser.id, // Update to match auth user ID
          role: 'admin',
          full_name: 'System Administrator',
          department_name: 'system',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('email', adminEmail);
      
      if (updateError) {
        console.error('❌ Error updating profile:', updateError.message);
        return;
      }
      
      console.log('✅ Profile updated successfully!');
    }
    
    // 4. Test the complete login flow
    console.log('\n🧪 TESTING COMPLETE LOGIN FLOW...');
    
    // Use anon key like frontend
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Sign in
    const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
      email: adminEmail,
      password: 'Jecrc@2026'
    });
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      return;
    }
    
    console.log('✅ Sign in successful');
    console.log(`   Auth User ID: ${signInData.user.id}`);
    
    // Check profile
    const { data: profileData, error: profileCheckError } = await anonSupabase
      .from('profiles')
      .select('role, full_name, department_name')
      .eq('id', signInData.user.id)
      .single();
    
    if (profileCheckError) {
      console.error('❌ Profile check failed:', profileCheckError.message);
      console.log('This means the profile ID still does not match');
    } else {
      console.log('✅ Profile check successful!');
      console.log(`   Profile ID: ${signInData.user.id}`);
      console.log(`   Name: ${profileData.full_name}`);
      console.log(`   Role: ${profileData.role}`);
      console.log(`   Department: ${profileData.department_name}`);
      
      if (profileData.role === 'admin') {
        console.log('✅ Would redirect to /admin');
      } else {
        console.log('✅ Would redirect to /staff/dashboard');
      }
    }
    
    // Sign out
    await anonSupabase.auth.signOut();
    
    // 5. Show final status
    console.log('\n📊 FINAL STATUS CHECK...');
    
    const { data: finalProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', adminEmail)
      .single();
    
    if (finalProfile) {
      console.log('✅ Admin profile status:');
      console.log(`   Profile ID: ${finalProfile.id}`);
      console.log(`   Auth User ID: ${adminUser.id}`);
      console.log(`   IDs Match: ${finalProfile.id === adminUser.id ? 'YES' : 'NO'}`);
      console.log(`   Role: ${finalProfile.role}`);
      console.log(`   Active: ${finalProfile.is_active}`);
    }
    
    console.log('\n🎉 ADMIN PROFILE FIX COMPLETE!');
    console.log('🔐 Admin login should now work properly');
    console.log('📊 Try logging in with: admin@jecrcu.edu.in / Jecrc@2026');
    
  } catch (error) {
    console.error('💥 Admin profile fix error:', error);
  }
}

fixAdminProfileV2();
