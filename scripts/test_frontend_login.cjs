// Test frontend login flow exactly like the app does
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

// Initialize Supabase exactly like frontend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFrontendLogin() {
  try {
    console.log('🧪 TESTING FRONTEND LOGIN FLOW...\n');
    
    const adminEmail = 'admin@jecrcu.edu.in';
    const adminPassword = 'Jecrc@2026';
    
    console.log(`🔐 Testing login for: ${adminEmail}`);
    console.log(`🔑 Using password: ${adminPassword}`);
    console.log(`🌐 Supabase URL: ${supabaseUrl}`);
    console.log(`🔑 Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
    
    // Step 1: Sign in (exactly like frontend)
    console.log('\n📝 STEP 1: SIGN IN...');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });
      
      if (error) {
        console.log(`❌ Sign in failed: ${error.message}`);
        console.log(`   Error code: ${error.status}`);
        console.log(`   Error details: ${JSON.stringify(error, null, 2)}`);
        
        // Analyze specific error
        if (error.message.includes('Invalid login credentials')) {
          console.log('\n🔍 ANALYSIS: Invalid login credentials');
          console.log('Possible causes:');
          console.log('1. Wrong password');
          console.log('2. Email not confirmed');
          console.log('3. User does not exist');
          console.log('4. Account is disabled/banned');
        }
        
        return;
      }
      
      console.log(`✅ Sign in successful!`);
      console.log(`   User ID: ${data.user?.id}`);
      console.log(`   Email: ${data.user?.email}`);
      console.log(`   Email confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Session: ${data.session ? 'Active' : 'None'}`);
      
      // Step 2: Check profile role (exactly like frontend)
      console.log('\n👤 STEP 2: CHECK PROFILE ROLE...');
      
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        
        if (profileError) {
          console.log(`❌ Profile check failed: ${profileError.message}`);
          console.log(`   Error code: ${profileError.code}`);
          console.log(`   Error details: ${JSON.stringify(profileError, null, 2)}`);
          
          if (profileError.code === 'PGRST116') {
            console.log('\n🔍 ANALYSIS: Profile not found');
            console.log('This means the user exists in auth but not in profiles table');
          }
        } else {
          console.log(`✅ Profile found!`);
          console.log(`   Role: ${profile.role}`);
          
          if (profile.role === 'admin') {
            console.log(`   ✅ Would redirect to /admin`);
          } else {
            console.log(`   ✅ Would redirect to /staff/dashboard`);
          }
        }
      }
      
      // Step 3: Test session persistence
      console.log('\n🔄 STEP 3: TEST SESSION PERSISTENCE...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log(`✅ Session persisted`);
        console.log(`   Session user: ${session.user?.email}`);
        console.log(`   Expires at: ${new Date(session.expires_at * 1000).toLocaleString()}`);
      } else {
        console.log(`❌ Session not persisted`);
      }
      
      // Step 4: Sign out
      console.log('\n🚪 STEP 4: SIGN OUT...');
      
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.log(`❌ Sign out failed: ${signOutError.message}`);
      } else {
        console.log(`✅ Signed out successfully`);
      }
      
    } catch (e) {
      console.log(`❌ Exception during login: ${e.message}`);
      console.log(`   Stack: ${e.stack}`);
    }
    
    // Step 5: Test with different credentials
    console.log('\n🔍 STEP 5: TEST WITH DIFFERENT CREDENTIALS...');
    
    const testCredentials = [
      { email: 'admin@jecrcu.edu.in', password: 'Jecrc@2026' },
      { email: 'admin@jecrcu.edu.in', password: 'admin123' },
      { email: 'librarian@jecrcu.edu.in', password: 'Jecrc@2026' },
      { email: 'it@jecrcu.edu.in', password: 'Jecrc@2026' }
    ];
    
    for (const creds of testCredentials) {
      console.log(`\n🔐 Testing: ${creds.email} / ${creds.password}`);
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: creds.email,
          password: creds.password,
        });
        
        if (error) {
          console.log(`   ❌ ${error.message}`);
        } else {
          console.log(`   ✅ Success! User ID: ${data.user?.id}`);
          await supabase.auth.signOut();
        }
      } catch (e) {
        console.log(`   ❌ Exception: ${e.message}`);
      }
    }
    
    console.log('\n🎯 FRONTEND LOGIN TEST COMPLETE!');
    
  } catch (error) {
    console.error('💥 Frontend login test error:', error);
  }
}

testFrontendLogin();
