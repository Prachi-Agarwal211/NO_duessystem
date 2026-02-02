// Debug admin account specifically
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

async function debugAdminAccount() {
  try {
    console.log('🔍 DEBUGGING ADMIN ACCOUNT...\n');
    
    const adminEmail = 'admin@jecrcu.edu.in';
    const adminPassword = 'Jecrc@2026';
    
    // 1. Check if admin user exists in auth system
    console.log('👤 CHECKING ADMIN USER IN AUTH SYSTEM...');
    
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (!authError && authUsers.users) {
        const adminUser = authUsers.users.find(u => u.email === adminEmail);
        
        if (adminUser) {
          console.log('✅ Admin user found in auth system:');
          console.log(`   ID: ${adminUser.id}`);
          console.log(`   Email: ${adminUser.email}`);
          console.log(`   Email confirmed: ${adminUser.email_confirmed_at ? 'Yes' : 'No'}`);
          console.log(`   Last sign in: ${adminUser.last_sign_in_at || 'Never'}`);
          console.log(`   Created: ${adminUser.created_at}`);
          console.log(`   Phone confirmed: ${adminUser.phone_confirmed_at ? 'Yes' : 'No'}`);
          console.log(`   Role: ${adminUser.user_metadata?.role || 'Not set'}`);
          console.log(`   Metadata: ${JSON.stringify(adminUser.user_metadata)}`);
        } else {
          console.log('❌ Admin user NOT found in auth system');
          
          // Create admin user
          console.log('\n🆕 CREATING ADMIN USER...');
          const { data, error } = await supabase.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true,
            user_metadata: {
              full_name: 'System Administrator',
              role: 'admin'
            }
          });
          
          if (error) {
            console.log(`❌ Failed to create admin: ${error.message}`);
          } else {
            console.log(`✅ Admin created successfully! User ID: ${data.user.id}`);
          }
        }
      }
    } catch (e) {
      console.log(`❌ Cannot access auth admin: ${e.message}`);
    }
    
    // 2. Test admin login
    console.log('\n🔐 TESTING ADMIN LOGIN...');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword
      });
      
      if (error) {
        console.log(`❌ Admin login failed: ${error.message}`);
        console.log(`   Error code: ${error.status}`);
        
        // Try to reset admin password
        console.log('\n🔄 RESETTING ADMIN PASSWORD...');
        
        try {
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const adminUser = authUsers.users.find(u => u.email === adminEmail);
          
          if (adminUser) {
            const { error: updateError } = await supabase.auth.admin.updateUserById(
              adminUser.id,
              { 
                password: adminPassword,
                email_confirm: true 
              }
            );
            
            if (updateError) {
              console.log(`❌ Password reset failed: ${updateError.message}`);
            } else {
              console.log(`✅ Admin password reset successfully!`);
              
              // Test login again
              console.log('\n🔐 TESTING ADMIN LOGIN AFTER RESET...');
              const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: adminEmail,
                password: adminPassword
              });
              
              if (loginError) {
                console.log(`❌ Still failing: ${loginError.message}`);
              } else {
                console.log(`✅ Admin login successful!`);
                console.log(`   User ID: ${loginData.user?.id}`);
                console.log(`   Session: ${loginData.session ? 'Active' : 'None'}`);
                
                // Sign out
                await supabase.auth.signOut();
              }
            }
          }
        } catch (e) {
          console.log(`❌ Password reset exception: ${e.message}`);
        }
      } else {
        console.log(`✅ Admin login successful!`);
        console.log(`   User ID: ${data.user?.id}`);
        console.log(`   Email confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   Session: ${data.session ? 'Active' : 'None'}`);
        console.log(`   Access token: ${data.session?.access_token ? 'Present' : 'Missing'}`);
        
        // Sign out
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.log(`❌ Admin login exception: ${e.message}`);
    }
    
    // 3. Check admin profile
    console.log('\n👥 CHECKING ADMIN PROFILE...');
    
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', adminEmail)
      .single();
    
    if (profileError) {
      console.log(`❌ Admin profile not found: ${profileError.message}`);
      
      // Create admin profile
      console.log('\n🆕 CREATING ADMIN PROFILE...');
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: authUsers?.users?.find(u => u.email === adminEmail)?.id || null,
          email: adminEmail,
          full_name: 'System Administrator',
          role: 'admin',
          department_name: 'system',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (createError) {
        console.log(`❌ Failed to create admin profile: ${createError.message}`);
      } else {
        console.log(`✅ Admin profile created successfully!`);
      }
    } else {
      console.log('✅ Admin profile found:');
      console.log(`   ID: ${adminProfile.id}`);
      console.log(`   Name: ${adminProfile.full_name}`);
      console.log(`   Role: ${adminProfile.role}`);
      console.log(`   Department: ${adminProfile.department_name}`);
      console.log(`   Active: ${adminProfile.is_active}`);
    }
    
    // 4. Test with different passwords
    console.log('\n🔍 TESTING WITH DIFFERENT PASSWORDS...');
    
    const testPasswords = [
      'Jecrc@2026',
      'admin123',
      'password',
      'Admin@123',
      'jecrc@2026'
    ];
    
    for (const testPass of testPasswords) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: testPass
        });
        
        if (error) {
          console.log(`   "${testPass}": ❌ ${error.message}`);
        } else {
          console.log(`   "${testPass}": ✅ SUCCESS!`);
          await supabase.auth.signOut();
          break;
        }
      } catch (e) {
        console.log(`   "${testPass}": ❌ Exception: ${e.message}`);
      }
    }
    
    console.log('\n🎯 ADMIN DEBUG COMPLETE!');
    
  } catch (error) {
    console.error('💥 Admin debug error:', error);
  }
}

debugAdminAccount();
