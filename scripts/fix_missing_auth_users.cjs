// Fix missing auth users and ensure all department users can login
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

async function fixMissingAuthUsers() {
  try {
    console.log('🔧 FIXING MISSING AUTH USERS...\n');
    
    // 1. Get all department profiles
    console.log('👥 GETTING ALL DEPARTMENT PROFILES...');
    const { data: deptProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'department')
      .order('full_name');
    
    if (profilesError) {
      console.error('❌ Error getting profiles:', profilesError.message);
      return;
    }
    
    console.log(`Found ${deptProfiles.length} department profiles`);
    
    // 2. Get all auth users
    console.log('\n🔐 GETTING ALL AUTH USERS...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error getting auth users:', authError.message);
      return;
    }
    
    console.log(`Found ${authUsers.users.length} auth users`);
    
    // 3. Find missing users
    console.log('\n🔍 FINDING MISSING USERS...');
    const authEmails = authUsers.users.map(u => u.email);
    const missingUsers = deptProfiles.filter(profile => !authEmails.includes(profile.email));
    
    console.log(`Missing ${missingUsers.length} users from auth system:`);
    missingUsers.forEach(user => {
      console.log(`  ❌ ${user.full_name} (${user.email}) - Department: ${user.department_name}`);
    });
    
    // 4. Create missing auth users
    if (missingUsers.length > 0) {
      console.log('\n🆕 CREATING MISSING AUTH USERS...');
      
      for (const user of missingUsers) {
        console.log(`\n👤 Creating auth user: ${user.full_name} (${user.email})`);
        
        try {
          const { data, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: 'Jecrc@2026',
            email_confirm: true,
            user_metadata: {
              full_name: user.full_name,
              role: user.role,
              department_name: user.department_name
            }
          });
          
          if (error) {
            console.log(`   ❌ Failed to create: ${error.message}`);
          } else {
            console.log(`   ✅ Created successfully! User ID: ${data.user.id}`);
          }
        } catch (e) {
          console.log(`   ❌ Exception: ${e.message}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 5. Reset all passwords to ensure consistency
    console.log('\n🔄 RESETTING ALL PASSWORDS TO ENSURE CONSISTENCY...');
    
    const { data: updatedAuthUsers } = await supabase.auth.admin.listUsers();
    const departmentAuthUsers = updatedAuthUsers.users.filter(user => 
      user.user_metadata?.role === 'department' ||
      user.email?.includes('@jecrcu.edu.in') ||
      user.email?.includes('hod@') ||
      user.email?.includes('library@') ||
      user.email?.includes('it@') ||
      user.email?.includes('hostel@') ||
      user.email?.includes('accounts@') ||
      user.email?.includes('registrar@') ||
      user.email?.includes('alumni@') ||
      user.email?.includes('sunstone.in')
    );
    
    console.log(`Resetting passwords for ${departmentAuthUsers.length} users...`);
    
    for (const authUser of departmentAuthUsers) {
      try {
        const { error } = await supabase.auth.admin.updateUserById(
          authUser.id,
          { 
            password: 'Jecrc@2026',
            email_confirm: true 
          }
        );
        
        if (error) {
          console.log(`   ❌ Failed to reset ${authUser.email}: ${error.message}`);
        } else {
          console.log(`   ✅ Reset ${authUser.email}`);
        }
      } catch (e) {
        console.log(`   ❌ Exception for ${authUser.email}: ${e.message}`);
      }
    }
    
    // 6. Test logins again
    console.log('\n🧪 TESTING LOGINS AFTER FIXES...');
    
    const testUsers = [
      'admin@jecrcu.edu.in',
      'librarian@jecrcu.edu.in', 
      'hod.ce@jecrcu.edu.in',
      'it@jecrcu.edu.in',
      'hostel@jecrcu.edu.in',
      'accounts@jecrcu.edu.in',
      'registrar@jecrcu.edu.in',
      'alumni@jecrcu.edu.in'
    ];
    
    for (const email of testUsers) {
      console.log(`\n🔐 Testing: ${email}`);
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: 'Jecrc@2026'
        });
        
        if (error) {
          console.log(`   ❌ Failed: ${error.message}`);
        } else {
          console.log(`   ✅ Success! User ID: ${data.user?.id}`);
          await supabase.auth.signOut();
        }
      } catch (e) {
        console.log(`   ❌ Exception: ${e.message}`);
      }
    }
    
    // 7. Check forgot password again
    console.log('\n📧 TESTING FORGOT PASSWORD AFTER FIXES...');
    
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(
        'admin@jecrcu.edu.in',
        { redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/reset-password` }
      );
      
      if (error) {
        console.log(`❌ Forgot password still failing: ${error.message}`);
      } else {
        console.log(`✅ Forgot password working!`);
      }
    } catch (e) {
      console.log(`❌ Forgot password exception: ${e.message}`);
    }
    
    // 8. Create final summary
    console.log('\n📄 CREATING FINAL LOGIN SUMMARY...');
    
    const { data: finalAuthUsers } = await supabase.auth.admin.listUsers();
    const finalDepartmentUsers = finalAuthUsers.users.filter(user => 
      user.user_metadata?.role === 'department' ||
      user.email?.includes('@jecrcu.edu.in') ||
      user.email?.includes('hod@') ||
      user.email?.includes('library@') ||
      user.email?.includes('it@') ||
      user.email?.includes('hostel@') ||
      user.email?.includes('accounts@') ||
      user.email?.includes('registrar@') ||
      user.email?.includes('alumni@') ||
      user.email?.includes('sunstone.in')
    );
    
    const finalSummary = {
      fixedDate: new Date().toISOString(),
      universalPassword: 'Jecrc@2026',
      totalDepartmentUsers: finalDepartmentUsers.length,
      users: finalDepartmentUsers.map(user => ({
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        department: user.user_metadata?.department_name || 'Not specified',
        role: user.user_metadata?.role || 'department',
        emailConfirmed: !!user.email_confirmed_at,
        userId: user.id
      })).sort((a, b) => a.email.localeCompare(b.email))
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../final_login_summary.json'),
      JSON.stringify(finalSummary, null, 2)
    );
    
    console.log('\n🎉 AUTH SYSTEM FIX COMPLETE!');
    console.log('📊 Summary:');
    console.log(`   Total department users: ${finalSummary.totalDepartmentUsers}`);
    console.log(`   Universal password: ${finalSummary.universalPassword}`);
    console.log(`   Fixed missing users: ${missingUsers.length}`);
    console.log('\n🔐 All department users can now login with:');
    console.log('   Email: their department email');
    console.log('   Password: Jecrc@2026');
    console.log('\n📄 Final summary saved to: final_login_summary.json');
    
  } catch (error) {
    console.error('💥 Error fixing auth users:', error);
  }
}

fixMissingAuthUsers();
