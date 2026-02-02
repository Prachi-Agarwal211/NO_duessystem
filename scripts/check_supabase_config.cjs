// Check Supabase configuration and authentication flow
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

async function checkSupabaseConfig() {
  try {
    console.log('🔍 CHECKING SUPABASE CONFIGURATION...\n');
    
    // 1. Check environment variables
    console.log('🌍 ENVIRONMENT VARIABLES:');
    console.log(`NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'NOT SET'}`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'NOT SET'}`);
    
    // 2. Test with anon key (like frontend would use)
    console.log('\n🔐 TESTING WITH ANON KEY (FRONTEND SIMULATION)...');
    
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const adminEmail = 'admin@jecrcu.edu.in';
    const adminPassword = 'Jecrc@2026';
    
    try {
      const { data, error } = await anonSupabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword
      });
      
      if (error) {
        console.log(`❌ Anon key login failed: ${error.message}`);
        console.log(`   Error code: ${error.status}`);
        
        // Check if it's a configuration issue
        if (error.message.includes('Invalid') || error.status === 400) {
          console.log('\n🔧 POSSIBLE ISSUES:');
          console.log('1. Wrong password (but we verified it works with service key)');
          console.log('2. Account disabled/blocked');
          console.log('3. Email not confirmed (but we confirmed it is)');
          console.log('4. Supabase project configuration issue');
        }
      } else {
        console.log(`✅ Anon key login successful!`);
        console.log(`   User ID: ${data.user?.id}`);
        console.log(`   Session: ${data.session ? 'Active' : 'None'}`);
        
        // Test session
        if (data.session) {
          console.log(`   Session expires at: ${data.session.expires_at}`);
          console.log(`   Access token length: ${data.session.access_token?.length || 0}`);
        }
      }
    } catch (e) {
      console.log(`❌ Anon key login exception: ${e.message}`);
    }
    
    // 3. Check RLS policies
    console.log('\n🔒 CHECKING RLS POLICIES...');
    
    try {
      const { data: rlsPolicies, error: rlsError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'auth.users');
      
      if (!rlsError && rlsPolicies) {
        console.log(`Found ${rlsPolicies.length} RLS policies for auth.users:`);
        rlsPolicies.forEach(policy => {
          console.log(`  ${policy.policyname}: ${policy.permissive ? 'Permissive' : 'Restrictive'}`);
        });
      } else {
        console.log('ℹ️  Cannot check RLS policies (may need admin access)');
      }
    } catch (e) {
      console.log('ℹ️  Cannot check RLS policies');
    }
    
    // 4. Check authentication settings
    console.log('\n⚙️ CHECKING AUTHENTICATION SETTINGS...');
    
    try {
      // Test if email confirmation is required
      const { data: settings, error: settingsError } = await supabase.auth.admin.getUserById(
        '30cb74ae-4087-4816-b9e9-fe67cacfedb5'
      );
      
      if (!settingsError && settings) {
        console.log('Admin user settings:');
        console.log(`  Email confirmed: ${settings.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`  Phone confirmed: ${settings.phone_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`  Banned until: ${settings.banned_until || 'Not banned'}`);
        console.log(`  Reauthentication: ${settings.reauthentication_at ? 'Required' : 'Not required'}`);
      }
    } catch (e) {
      console.log('ℹ️  Cannot check user settings');
    }
    
    // 5. Create a test with fresh credentials
    console.log('\n🧪 CREATING TEST ADMIN USER...');
    
    const testAdminEmail = 'testadmin@jecrcu.edu.in';
    
    try {
      // Delete if exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingTestUser = existingUsers.users.find(u => u.email === testAdminEmail);
      
      if (existingTestUser) {
        await supabase.auth.admin.deleteUser(existingTestUser.id);
        console.log('Deleted existing test admin user');
      }
      
      // Create new test admin
      const { data: newAdmin, error: createError } = await supabase.auth.admin.createUser({
        email: testAdminEmail,
        password: 'TestAdmin@2026',
        email_confirm: true,
        user_metadata: {
          full_name: 'Test Administrator',
          role: 'admin'
        }
      });
      
      if (createError) {
        console.log(`❌ Failed to create test admin: ${createError.message}`);
      } else {
        console.log(`✅ Test admin created: ${newAdmin.user.id}`);
        
        // Test login with anon key
        const { data: loginData, error: loginError } = await anonSupabase.auth.signInWithPassword({
          email: testAdminEmail,
          password: 'TestAdmin@2026'
        });
        
        if (loginError) {
          console.log(`❌ Test admin login failed: ${loginError.message}`);
        } else {
          console.log(`✅ Test admin login successful!`);
          
          // Clean up
          await supabase.auth.admin.deleteUser(newAdmin.user.id);
          console.log('Test admin cleaned up');
        }
      }
    } catch (e) {
      console.log(`❌ Test admin exception: ${e.message}`);
    }
    
    // 6. Check frontend configuration files
    console.log('\n📁 CHECKING FRONTEND CONFIGURATION...');
    
    const configFiles = [
      '../src/lib/supabaseAdmin.js',
      '../src/lib/supabase.js',
      '../src/lib/auth.js',
      '../src/config/supabase.js'
    ];
    
    configFiles.forEach(file => {
      const fullPath = path.join(__dirname, file);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ Found: ${file}`);
        
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check for common issues
        if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
          console.log(`   ⚠️  Using service role key in frontend (security issue)`);
        }
        
        if (content.includes('createClient')) {
          console.log(`   ✅ Using createClient`);
        }
      } else {
        console.log(`❌ Missing: ${file}`);
      }
    });
    
    console.log('\n🎯 SUPABASE CONFIGURATION CHECK COMPLETE!');
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Check if frontend is using correct anon key');
    console.log('2. Verify Supabase project URL is correct');
    console.log('3. Check if RLS policies are blocking authentication');
    console.log('4. Ensure email confirmation is disabled in Supabase settings if needed');
    console.log('5. Check browser console for detailed error messages');
    
  } catch (error) {
    console.error('💥 Supabase config check error:', error);
  }
}

checkSupabaseConfig();
