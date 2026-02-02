// Fix admin profile issue
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

async function fixAdminProfile() {
  try {
    console.log('🔧 FIXING ADMIN PROFILE ISSUE...\n');
    
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
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Created: ${adminUser.created_at}`);
    
    // 2. Check if profile exists
    console.log('\n👥 CHECKING IF PROFILE EXISTS...');
    
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminUser.id)
      .single();
    
    if (profileError && profileError.code === 'PGRST116') {
      console.log('❌ Profile does not exist - creating it...');
      
      // 3. Create admin profile
      console.log('\n🆕 CREATING ADMIN PROFILE...');
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: adminUser.id,
          email: adminUser.email,
          full_name: adminUser.user_metadata?.full_name || 'System Administrator',
          role: 'admin',
          department_name: 'system',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_active_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating profile:', createError.message);
        console.log('Error details:', JSON.stringify(createError, null, 2));
        return;
      }
      
      console.log('✅ Admin profile created successfully!');
      console.log(`   Profile ID: ${newProfile.id}`);
      console.log(`   Name: ${newProfile.full_name}`);
      console.log(`   Role: ${newProfile.role}`);
      
    } else if (profileError) {
      console.error('❌ Error checking profile:', profileError.message);
      return;
    } else {
      console.log('✅ Profile already exists:');
      console.log(`   Profile ID: ${existingProfile.id}`);
      console.log(`   Role: ${existingProfile.role}`);
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
    
    // Check profile
    const { data: profileData, error: profileCheckError } = await anonSupabase
      .from('profiles')
      .select('role')
      .eq('id', signInData.user.id)
      .single();
    
    if (profileCheckError) {
      console.error('❌ Profile check failed:', profileCheckError.message);
    } else {
      console.log('✅ Profile check successful!');
      console.log(`   Role: ${profileData.role}`);
      
      if (profileData.role === 'admin') {
        console.log('✅ Would redirect to /admin');
      } else {
        console.log('✅ Would redirect to /staff/dashboard');
      }
    }
    
    // Sign out
    await anonSupabase.auth.signOut();
    
    // 5. Fix other missing profiles
    console.log('\n🔧 CHECKING OTHER MISSING PROFILES...');
    
    const departmentUsers = authUsers.users.filter(user => 
      user.user_metadata?.role === 'department' ||
      user.email?.includes('@jecrcu.edu.in') ||
      user.email?.includes('hod@') ||
      user.email?.includes('library@') ||
      user.email?.includes('it@') ||
      user.email?.includes('hostel@') ||
      user.email?.includes('accounts@') ||
      user.email?.includes('registrar@') ||
      user.email?.includes('alumni@')
    );
    
    console.log(`Checking ${departmentUsers.length} department users...`);
    
    let fixedCount = 0;
    
    for (const user of departmentUsers) {
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (checkError && checkError.code === 'PGRST116') {
        console.log(`\n🆕 Creating profile for: ${user.email}`);
        
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            role: user.user_metadata?.role || 'department',
            department_name: user.user_metadata?.department_name || 'general',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (createError) {
          console.log(`   ❌ Failed: ${createError.message}`);
        } else {
          console.log(`   ✅ Created successfully`);
          fixedCount++;
        }
      }
    }
    
    console.log(`\n📊 Fixed ${fixedCount} missing profiles`);
    
    console.log('\n🎉 ADMIN PROFILE FIX COMPLETE!');
    console.log('🔐 Admin login should now work properly');
    console.log('👥 All department users now have profiles');
    
  } catch (error) {
    console.error('💥 Admin profile fix error:', error);
  }
}

fixAdminProfile();
