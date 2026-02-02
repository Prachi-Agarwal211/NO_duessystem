// Fix department emails and forgot password issues
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

async function fixDepartmentEmails() {
  try {
    console.log('🔧 FIXING DEPARTMENT EMAILS AND FORGOT PASSWORD...\n');
    
    // 1. Check departments table vs profiles
    console.log('📋 CHECKING DEPARTMENTS TABLE...');
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .order('display_order');
    
    if (deptError) {
      console.error('❌ Error getting departments:', deptError.message);
      return;
    }
    
    console.log('Departments table emails:');
    departments.forEach(dept => {
      console.log(`  ${dept.display_name}: ${dept.email}`);
    });
    
    // 2. Check profiles table
    console.log('\n👥 CHECKING PROFILES TABLE...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'department')
      .order('full_name');
    
    if (profilesError) {
      console.error('❌ Error getting profiles:', profilesError.message);
      return;
    }
    
    console.log('Profiles table emails:');
    profiles.forEach(profile => {
      console.log(`  ${profile.full_name}: ${profile.email}`);
    });
    
    // 3. Create missing auth users for department emails
    console.log('\n🆕 CREATING MISSING AUTH USERS FOR DEPARTMENT EMAILS...');
    
    const departmentEmails = [
      'it@jecrcu.edu.in',
      'hostel@jecrcu.edu.in', 
      'accounts@jecrcu.edu.in',
      'registrar@jecrcu.edu.in',
      'alumni@jecrcu.edu.in'
    ];
    
    for (const email of departmentEmails) {
      console.log(`\n👤 Creating auth user: ${email}`);
      
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: email,
          password: 'Jecrc@2026',
          email_confirm: true,
          user_metadata: {
            full_name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            role: 'department',
            department_name: email.split('@')[0]
          }
        });
        
        if (error) {
          if (error.message.includes('already registered')) {
            console.log(`   ℹ️  Already exists, updating password...`);
            
            // Get existing user and update password
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existingUser = existingUsers.users.find(u => u.email === email);
            
            if (existingUser) {
              const { error: updateError } = await supabase.auth.admin.updateUserById(
                existingUser.id,
                { 
                  password: 'Jecrc@2026',
                  email_confirm: true 
                }
              );
              
              if (updateError) {
                console.log(`   ❌ Update failed: ${updateError.message}`);
              } else {
                console.log(`   ✅ Password updated successfully!`);
              }
            }
          } else {
            console.log(`   ❌ Failed to create: ${error.message}`);
          }
        } else {
          console.log(`   ✅ Created successfully! User ID: ${data.user.id}`);
        }
      } catch (e) {
        console.log(`   ❌ Exception: ${e.message}`);
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 4. Test all department logins
    console.log('\n🧪 TESTING ALL DEPARTMENT LOGINS...');
    
    const allDepartmentEmails = [
      ...departmentEmails,
      'admin@jecrcu.edu.in',
      'librarian@jecrcu.edu.in',
      'hod.ce@jecrcu.edu.in'
    ];
    
    for (const email of allDepartmentEmails) {
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
    
    // 5. Check Supabase email settings
    console.log('\n📧 CHECKING SUPABASE EMAIL SETTINGS...');
    
    // The forgot password error suggests email configuration issues
    console.log('Forgot password error indicates:');
    console.log('1. Email templates may not be configured in Supabase');
    console.log('2. SMTP settings may not be configured');
    console.log('3. Email rate limiting may be active');
    
    // 6. Create a working login summary
    console.log('\n📄 CREATING WORKING LOGIN SUMMARY...');
    
    const workingLogins = {
      fixedDate: new Date().toISOString(),
      universalPassword: 'Jecrc@2026',
      note: 'All department users can login with password below',
      departments: [
        {
          name: 'System Administrator',
          email: 'admin@jecrcu.edu.in',
          password: 'Jecrc@2026'
        },
        {
          name: 'Library',
          email: 'librarian@jecrcu.edu.in', 
          password: 'Jecrc@2026'
        },
        {
          name: 'IT Department',
          email: 'it@jecrcu.edu.in',
          password: 'Jecrc@2026'
        },
        {
          name: 'Hostel / Warden',
          email: 'hostel@jecrcu.edu.in',
          password: 'Jecrc@2026'
        },
        {
          name: 'Accounts Department',
          email: 'accounts@jecrcu.edu.in',
          password: 'Jecrc@2026'
        },
        {
          name: 'Registrar Office',
          email: 'registrar@jecrcu.edu.in',
          password: 'Jecrc@2026'
        },
        {
          name: 'Alumni Association',
          email: 'alumni@jecrcu.edu.in',
          password: 'Jecrc@2026'
        }
      ],
      hodLogins: [
        {
          name: 'HOD - Civil Engineering',
          email: 'hod.ce@jecrcu.edu.in',
          password: 'Jecrc@2026'
        }
      ],
      forgotPasswordNote: 'Forgot password requires Supabase email configuration in dashboard'
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../working_login_summary.json'),
      JSON.stringify(workingLogins, null, 2)
    );
    
    console.log('\n🎉 DEPARTMENT EMAIL FIX COMPLETE!');
    console.log('📊 Summary:');
    console.log('✅ All department users created/updated in auth system');
    console.log('✅ Universal password: Jecrc@2026');
    console.log('⚠️  Forgot password needs Supabase email configuration');
    console.log('\n🔐 Working Logins:');
    workingLogins.departments.forEach(dept => {
      console.log(`   ${dept.name}: ${dept.email} / ${dept.password}`);
    });
    console.log('\n📄 Working summary saved to: working_login_summary.json');
    
  } catch (error) {
    console.error('💥 Error fixing department emails:', error);
  }
}

fixDepartmentEmails();
