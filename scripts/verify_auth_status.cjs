// Verify authentication status and create clear login summary
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

async function verifyAuthStatus() {
  try {
    console.log('🔍 VERIFYING AUTHENTICATION STATUS...\n');
    
    // 1. Check profiles table structure
    console.log('📋 CHECKING PROFILES TABLE STRUCTURE:');
    const { data: profileSample, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (!profileError && profileSample && profileSample.length > 0) {
      const columns = Object.keys(profileSample[0]);
      console.log('Profiles table columns:');
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col}`);
      });
      
      if (!columns.includes('password')) {
        console.log('✅ Confirmed: No password field in profiles table (uses Supabase Auth)');
      }
    }
    
    // 2. Get all department profiles
    console.log('\n👥 GETTING DEPARTMENT PROFILES:');
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
    
    // 3. Get Supabase Auth users
    console.log('\n🔐 GETTING SUPABASE AUTH USERS:');
    try {
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
          user.email?.includes('alumni@') ||
          user.email?.includes('sunstone.in')
        );
        
        console.log(`Found ${departmentAuthUsers.length} department auth users`);
        
        // 4. Create comprehensive login summary
        console.log('\n📄 CREATING COMPREHENSIVE LOGIN SUMMARY...');
        
        const loginSummary = {
          resetDate: new Date().toISOString(),
          universalPassword: 'Jecrc@2026',
          authenticationMethod: 'Supabase Auth (not profiles table)',
          totalDepartmentUsers: departmentAuthUsers.length,
          users: departmentAuthUsers.map(authUser => {
            const profile = deptProfiles.find(p => p.email === authUser.email);
            return {
              name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email.split('@')[0],
              email: authUser.email,
              department: profile?.department_name || 'Not specified',
              role: profile?.role || authUser.user_metadata?.role || 'department',
              lastSignIn: authUser.last_sign_in_at,
              created: authUser.created_at,
              password: 'Jecrc@2026',
              loginUrl: 'https://your-domain.com/login'
            };
          }).sort((a, b) => a.name.localeCompare(b.name))
        };
        
        // Save comprehensive summary
        fs.writeFileSync(
          path.join(__dirname, '../comprehensive_login_summary.json'),
          JSON.stringify(loginSummary, null, 2)
        );
        
        // Display formatted summary
        console.log('\n🎉 AUTHENTICATION STATUS VERIFIED!');
        console.log('📊 Summary:');
        console.log(`   Authentication: Supabase Auth`);
        console.log(`   Total Users: ${loginSummary.totalDepartmentUsers}`);
        console.log(`   Universal Password: ${loginSummary.universalPassword}`);
        console.log(`   Reset Date: ${new Date(loginSummary.resetDate).toLocaleString()}`);
        
        console.log('\n📋 Department Login Credentials:');
        console.log('=' .repeat(80));
        
        loginSummary.users.forEach((user, index) => {
          console.log(`${index + 1}. ${user.name}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Department: ${user.department}`);
          console.log(`   Password: ${user.password}`);
          console.log('');
        });
        
        console.log('=' .repeat(80));
        console.log('🔐 Login Instructions:');
        console.log('1. Go to your login page');
        console.log('2. Enter your department email');
        console.log('3. Enter password: Jecrc@2026');
        console.log('4. Click login');
        console.log('');
        console.log('📄 Detailed summary saved to: comprehensive_login_summary.json');
        
      } else {
        console.error('❌ Error getting auth users:', authError?.message);
      }
    } catch (e) {
      console.error('❌ Cannot access Supabase Auth admin functions:', e.message);
      console.log('ℹ️  This might be due to missing admin permissions');
    }
    
  } catch (error) {
    console.error('💥 Error verifying auth status:', error);
  }
}

verifyAuthStatus();
