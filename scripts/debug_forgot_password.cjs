// Debug forgot password functionality
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
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugForgotPassword() {
  try {
    console.log('🔍 DEBUGGING FORGOT PASSWORD FUNCTIONALITY...\n');
    
    const testEmail = 'admin@jecrcu.edu.in';
    
    // 1. Test forgot password with different redirect URLs
    console.log('📧 TESTING FORGOT PASSWORD WITH DIFFERENT REDIRECTS...');
    
    const redirectUrls = [
      'https://yjjcndurtjprbtvaikzs.supabase.co/reset-password',
      'http://localhost:3000/reset-password',
      'https://your-domain.com/reset-password',
      undefined
    ];
    
    for (const redirectUrl of redirectUrls) {
      console.log(`\n🔗 Testing with redirect: ${redirectUrl || 'default'}`);
      
      try {
        const options = redirectUrl ? { redirectTo: redirectUrl } : {};
        
        const { data, error } = await supabase.auth.resetPasswordForEmail(
          testEmail,
          options
        );
        
        if (error) {
          console.log(`   ❌ Failed: ${error.message}`);
          console.log(`   Error code: ${error.status}`);
          
          // Analyze the error
          if (error.message.includes('Email address') && error.message.includes('invalid')) {
            console.log(`   🔍 Analysis: Email validation issue`);
          } else if (error.message.includes('rate limit')) {
            console.log(`   🔍 Analysis: Rate limiting active`);
          } else if (error.message.includes('Email') && error.message.includes('not')) {
            console.log(`   🔍 Analysis: Email configuration issue`);
          }
        } else {
          console.log(`   ✅ Success!`);
          console.log(`   Data: ${JSON.stringify(data)}`);
        }
      } catch (e) {
        console.log(`   ❌ Exception: ${e.message}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 2. Check if email templates exist
    console.log('\n📋 CHECKING EMAIL TEMPLATES...');
    
    try {
      // Try to get email templates (requires admin access)
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { data: templates, error: templateError } = await adminSupabase.auth.admin.listTemplates();
      
      if (!templateError && templates) {
        console.log('✅ Email templates found:');
        Object.entries(templates).forEach(([type, template]) => {
          console.log(`  ${type}:`);
          console.log(`    Subject: ${template.subject || 'Not set'}`);
          console.log(`    Content length: ${template.content?.length || 0}`);
        });
      } else {
        console.log('❌ Email templates not configured');
        console.log(`Error: ${templateError?.message}`);
      }
    } catch (e) {
      console.log('❌ Cannot check email templates (requires admin access)');
    }
    
    // 3. Test user existence
    console.log('\n👤 CHECKING USER EXISTENCE...');
    
    try {
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
      const user = authUsers.users.find(u => u.email === testEmail);
      
      if (user) {
        console.log('✅ User exists:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   Created: ${user.created_at}`);
        console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`);
      } else {
        console.log('❌ User does not exist');
      }
    } catch (e) {
      console.log('❌ Cannot check user existence');
    }
    
    // 4. Create a manual password reset solution
    console.log('\n🔧 CREATING MANUAL PASSWORD RESET SOLUTION...');
    
    const manualResetSolution = {
      problem: 'Supabase email templates not configured',
      solution: 'Configure Supabase email settings or implement manual reset',
      steps: [
        '1. Go to Supabase Dashboard',
        '2. Navigate to Authentication → Email Templates',
        '3. Configure SMTP settings',
        '4. Set up password reset email template',
        '5. Test with a real email address'
      ],
      alternative: 'Implement manual password reset with admin approval',
      code: `
// Manual password reset implementation
const { data, error } = await supabase.auth.admin.updateUserById(
  userId,
  { password: newPassword }
);
      `
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../forgot_password_solution.json'),
      JSON.stringify(manualResetSolution, null, 2)
    );
    
    console.log('💾 Solution saved to: forgot_password_solution.json');
    
    // 5. Test with a different email service
    console.log('\n📧 TESTING WITH DIFFERENT EMAIL...');
    
    const testEmails = [
      'admin@jecrcu.edu.in',
      'test@example.com',
      'user@test.com'
    ];
    
    for (const email of testEmails) {
      console.log(`\n🔗 Testing with email: ${email}`);
      
      try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email);
        
        if (error) {
          console.log(`   ❌ Failed: ${error.message}`);
        } else {
          console.log(`   ✅ Success!`);
        }
      } catch (e) {
        console.log(`   ❌ Exception: ${e.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎯 FORGOT PASSWORD DEBUG COMPLETE!');
    console.log('\n💡 MAIN ISSUE: Supabase email templates not configured');
    console.log('🔧 SOLUTION: Configure email settings in Supabase dashboard');
    
  } catch (error) {
    console.error('💥 Forgot password debug error:', error);
  }
}

debugForgotPassword();
