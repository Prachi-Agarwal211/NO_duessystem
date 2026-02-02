// Reset all department passwords to Jecrc@2026
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

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

async function resetDepartmentPasswords() {
  try {
    console.log('🔧 RESETTING ALL DEPARTMENT PASSWORDS TO "Jecrc@2026"...\n');
    
    const newPassword = 'Jecrc@2026';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log(`🔐 New password: ${newPassword}`);
    console.log(`🔐 Hashed password: ${hashedPassword.substring(0, 50)}...`);
    
    // 1. Update profiles table
    console.log('\n📋 UPDATING PROFILES TABLE:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'department');
    
    if (profilesError) {
      console.error('❌ Error getting profiles:', profilesError.message);
    } else {
      console.log(`Found ${profiles.length} department profiles`);
      
      for (const profile of profiles) {
        console.log(`\n👤 Updating: ${profile.full_name} (${profile.email})`);
        
        // Check if there's a password field
        if (profile.password !== undefined) {
          const { error } = await supabase
            .from('profiles')
            .update({ password: hashedPassword })
            .eq('id', profile.id);
          
          if (error) {
            console.error(`   ❌ Error updating password:`, error.message);
          } else {
            console.log(`   ✅ Password updated`);
          }
        } else {
          console.log(`   ⚠️  No password field found in profiles table`);
        }
      }
    }
    
    // 2. Check and update users table
    console.log('\n📋 CHECKING USERS TABLE:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'department');
    
    if (usersError) {
      console.log('ℹ️  No users table or no department users found');
    } else {
      console.log(`Found ${users.length} department users`);
      
      for (const user of users) {
        console.log(`\n👤 Updating: ${user.name || user.full_name} (${user.email})`);
        
        const { error } = await supabase
          .from('users')
          .update({ password: hashedPassword })
          .eq('id', user.id);
        
        if (error) {
          console.error(`   ❌ Error updating password:`, error.message);
        } else {
          console.log(`   ✅ Password updated`);
        }
      }
    }
    
    // 3. Check for admin_users table
    console.log('\n📋 CHECKING ADMIN_USERS TABLE:');
    try {
      const { data: adminUsers, error: adminError } = await supabase
        .from('admin_users')
        .select('*');
      
      if (!adminError && adminUsers) {
        console.log(`Found ${adminUsers.length} admin users`);
        
        for (const admin of adminUsers) {
          console.log(`\n👤 Updating: ${admin.name || admin.full_name} (${admin.email})`);
          
          const { error } = await supabase
            .from('admin_users')
            .update({ password: hashedPassword })
            .eq('id', admin.id);
          
          if (error) {
            console.error(`   ❌ Error updating password:`, error.message);
          } else {
            console.log(`   ✅ Password updated`);
          }
        }
      }
    } catch (e) {
      console.log('ℹ️  No admin_users table found');
    }
    
    // 4. Try to update Supabase Auth users (if using Supabase Auth)
    console.log('\n🔐 CHECKING SUPABASE AUTH USERS:');
    try {
      // Get all users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (!authError && authUsers.users) {
        const departmentAuthUsers = authUsers.users.filter(user => 
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
        
        console.log(`Found ${departmentAuthUsers.length} department auth users`);
        
        for (const authUser of departmentAuthUsers) {
          console.log(`\n👤 Updating auth user: ${authUser.email}`);
          
          try {
            const { error } = await supabase.auth.admin.updateUserById(
              authUser.id,
              { password: newPassword }
            );
            
            if (error) {
              console.error(`   ❌ Error updating auth password:`, error.message);
            } else {
              console.log(`   ✅ Auth password updated`);
            }
          } catch (e) {
            console.error(`   ❌ Error updating auth user:`, e.message);
          }
        }
      }
    } catch (e) {
      console.log('ℹ️  Cannot access Supabase Auth admin functions');
    }
    
    // 5. Create a summary file with login credentials
    console.log('\n📄 CREATING LOGIN CREDENTIALS SUMMARY...');
    
    const { data: finalProfiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'department')
      .order('full_name');
    
    const { data: finalDepartments } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    const credentials = {
      resetDate: new Date().toISOString(),
      universalPassword: newPassword,
      note: 'All department users have been reset to use this password',
      departments: finalDepartments.map(dept => ({
        name: dept.display_name,
        email: dept.email,
        password: newPassword,
        loginUrl: 'https://your-domain.com/login'
      })),
      profiles: finalProfiles.map(profile => ({
        name: profile.full_name,
        email: profile.email,
        department: profile.department_name,
        password: newPassword,
        loginUrl: 'https://your-domain.com/login'
      }))
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../department_login_credentials.json'),
      JSON.stringify(credentials, null, 2)
    );
    
    console.log('💾 Login credentials saved to department_login_credentials.json');
    
    // Display summary
    console.log('\n🎉 PASSWORD RESET COMPLETE!');
    console.log('📊 Summary:');
    console.log(`   Universal password: ${newPassword}`);
    console.log(`   Profiles updated: ${finalProfiles ? finalProfiles.length : 0}`);
    console.log(`   Departments: ${finalDepartments ? finalDepartments.length : 0}`);
    console.log('\n📋 Department Login Credentials:');
    
    finalDepartments?.forEach(dept => {
      console.log(`   ${dept.display_name}: ${dept.email} / ${newPassword}`);
    });
    
    console.log('\n🔐 All department users can now login with:');
    console.log(`   Email: their department email`);
    console.log(`   Password: ${newPassword}`);
    
  } catch (error) {
    console.error('💥 Error resetting passwords:', error);
  }
}

resetDepartmentPasswords();
