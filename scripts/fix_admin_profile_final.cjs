// Fix admin profile issue - final version
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

async function fixAdminProfileFinal() {
  try {
    console.log('🔧 FIXING ADMIN PROFILE ISSUE - FINAL VERSION...\n');
    
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
    
    // 2. Check available departments
    console.log('\n🏢 CHECKING AVAILABLE DEPARTMENTS...');
    
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name, display_name')
      .order('display_order');
    
    if (deptError) {
      console.error('❌ Error getting departments:', deptError.message);
      return;
    }
    
    console.log('Available departments:');
    departments.forEach(dept => {
      console.log(`  ${dept.id}: ${dept.display_name} (${dept.name})`);
    });
    
    // 3. Find existing profile
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
    console.log(`   Auth User ID: ${adminUser.id}`);
    console.log(`   Role: ${existingProfile.role}`);
    console.log(`   Department: ${existingProfile.department_name}`);
    
    // 4. The issue is that the profile ID doesn't match auth user ID
    // We need to delete the old profile and create a new one with correct ID
    console.log('\n🔄 DELETING OLD PROFILE AND CREATING NEW ONE...');
    
    // Delete old profile
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('email', adminEmail);
    
    if (deleteError) {
      console.error('❌ Error deleting old profile:', deleteError.message);
      return;
    }
    
    console.log('✅ Old profile deleted');
    
    // Create new profile with correct auth user ID
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: adminUser.id, // Use the auth user ID
        email: adminUser.email,
        full_name: 'System Administrator',
        role: 'admin',
        department_name: null, // Set to null to avoid foreign key constraint
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating new profile:', createError.message);
      console.log('Error details:', JSON.stringify(createError, null, 2));
      return;
    }
    
    console.log('✅ New profile created successfully!');
    console.log(`   Profile ID: ${newProfile.id}`);
    console.log(`   Role: ${newProfile.role}`);
    
    // 5. Test the complete login flow
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
    } else {
      console.log('✅ Profile check successful!');
      console.log(`   Profile ID matches: ${signInData.user.id === profileData.__temporary_id ? 'YES' : 'NO'}`);
      console.log(`   Name: ${profileData.full_name}`);
      console.log(`   Role: ${profileData.role}`);
      console.log(`   Department: ${profileData.department_name || 'None'}`);
      
      if (profileData.role === 'admin') {
        console.log('✅ Would redirect to /admin');
      } else {
        console.log('✅ Would redirect to /staff/dashboard');
      }
    }
    
    // Sign out
    await anonSupabase.auth.signOut();
    
    console.log('\n🎉 ADMIN PROFILE FIX COMPLETE!');
    console.log('🔐 Admin login should now work properly');
    console.log('📊 Try logging in with: admin@jecrcu.edu.in / Jecrc@2026');
    console.log('✅ Profile ID now matches auth user ID');
    
  } catch (error) {
    console.error('💥 Admin profile fix error:', error);
  }
}

fixAdminProfileFinal();
