// Deep authentication system check
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

async function deepAuthCheck() {
  try {
    console.log('🔍 DEEP AUTHENTICATION SYSTEM CHECK...\n');
    
    // 1. Test actual login with generated passwords
    console.log('🧪 TESTING ACTUAL LOGIN WITH GENERATED PASSWORDS...');
    
    const testUsers = [
      'admin@jecrcu.edu.in',
      'librarian@jecrcu.edu.in',
      'hod.ce@jecrcu.edu.in',
      'it@jecrcu.edu.in'
    ];
    
    for (const email of testUsers) {
      console.log(`\n🔐 Testing login for: ${email}`);
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: 'Jecrc@2026'
        });
        
        if (error) {
          console.log(`   ❌ Login failed: ${error.message}`);
          console.log(`   Error code: ${error.status}`);
        } else {
          console.log(`   ✅ Login successful!`);
          console.log(`   User ID: ${data.user?.id}`);
          console.log(`   Email confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No'}`);
          
          // Sign out after testing
          await supabase.auth.signOut();
        }
      } catch (e) {
        console.log(`   ❌ Exception: ${e.message}`);
      }
    }
    
    // 2. Check if users exist in auth system
    console.log('\n👥 CHECKING USER EXISTENCE IN AUTH SYSTEM...');
    
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (!authError && authUsers.users) {
        console.log(`Total users in auth system: ${authUsers.users.length}`);
        
        for (const email of testUsers) {
          const user = authUsers.users.find(u => u.email === email);
          if (user) {
            console.log(`\n👤 ${email}:`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
            console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`);
            console.log(`   Created: ${user.created_at}`);
            console.log(`   Phone confirmed: ${user.phone_confirmed_at ? 'Yes' : 'No'}`);
            console.log(`   Role: ${user.user_metadata?.role || 'Not set'}`);
          } else {
            console.log(`\n❌ ${email}: NOT FOUND in auth system`);
          }
        }
      }
    } catch (e) {
      console.log(`❌ Cannot access auth admin: ${e.message}`);
    }
    
    // 3. Test forgot password functionality
    console.log('\n🔄 TESTING FORGOT PASSWORD FUNCTIONALITY...');
    
    for (const email of testUsers) {
      console.log(`\n📧 Testing forgot password for: ${email}`);
      
      try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://your-domain.com/reset-password'
        });
        
        if (error) {
          console.log(`   ❌ Forgot password failed: ${error.message}`);
          console.log(`   Error code: ${error.status}`);
        } else {
          console.log(`   ✅ Password reset email sent successfully!`);
          console.log(`   Data: ${JSON.stringify(data)}`);
        }
      } catch (e) {
        console.log(`   ❌ Exception: ${e.message}`);
      }
    }
    
    // 4. Check auth configuration
    console.log('\n⚙️ CHECKING AUTH CONFIGURATION...');
    
    // Check if email templates are configured
    try {
      const { data: templates, error: templateError } = await supabase.auth.admin.listTemplates();
      
      if (!templateError && templates) {
        console.log('Email templates configured:');
        Object.entries(templates).forEach(([type, template]) => {
          console.log(`  ${type}: ${template.subject || 'No subject'}`);
        });
      } else {
        console.log('❌ No email templates configured');
        console.log(`Error: ${templateError?.message}`);
      }
    } catch (e) {
      console.log('❌ Cannot check email templates');
    }
    
    // 5. Check if password reset is enabled
    console.log('\n🔧 CHECKING PASSWORD RESET SETTINGS...');
    
    // This would require checking Supabase dashboard settings, but we can infer from behavior
    
    // 6. Test with a fresh password reset
    console.log('\n🔄 TESTING FRESH PASSWORD RESET...');
    
    const testEmail = 'admin@jecrcu.edu.in';
    console.log(`Testing fresh reset for: ${testEmail}`);
    
    try {
      // Generate a new password reset token
      const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
        redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/reset-password`
      });
      
      if (error) {
        console.log(`❌ Fresh reset failed: ${error.message}`);
      } else {
        console.log(`✅ Fresh reset initiated`);
      }
    } catch (e) {
      console.log(`❌ Fresh reset exception: ${e.message}`);
    }
    
    // 7. Check environment variables
    console.log('\n🌍 CHECKING ENVIRONMENT VARIABLES...');
    console.log(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}`);
    console.log(`Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'}`);
    
    // 8. Try to manually set a password using admin functions
    console.log('\n🔧 TRYING MANUAL PASSWORD SET...');
    
    try {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const adminUser = authUsers.users.find(u => u.email === 'admin@jecrcu.edu.in');
      
      if (adminUser) {
        console.log(`Found admin user: ${adminUser.id}`);
        
        // Try to update password directly
        const { error } = await supabase.auth.admin.updateUserById(
          adminUser.id,
          { 
            password: 'Jecrc@2026',
            email_confirm: true 
          }
        );
        
        if (error) {
          console.log(`❌ Manual password update failed: ${error.message}`);
        } else {
          console.log(`✅ Manual password update successful`);
        }
      }
    } catch (e) {
      console.log(`❌ Manual update exception: ${e.message}`);
    }
    
    console.log('\n🎯 DEEP AUTH CHECK COMPLETE!');
    console.log('📊 Review the output above to identify issues');
    
  } catch (error) {
    console.error('💥 Deep auth check error:', error);
  }
}

deepAuthCheck();
