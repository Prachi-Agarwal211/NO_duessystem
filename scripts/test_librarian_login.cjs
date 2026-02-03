// Test Librarian Login Flow
// Simulate the exact login process the frontend uses

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
function loadEnv() {
  const envFiles = ['../.env.local', '../.env'];
  envFiles.forEach(envFile => {
    const filePath = path.join(__dirname, envFile);
    if (fs.existsSync(filePath)) {
      const envContent = fs.readFileSync(filePath, 'utf8');
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
  });
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testLibrarianLogin() {
  console.log('🔐 TESTING LIBRARIAN LOGIN FLOW\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Simulate auth sign in (we'll use the service key to get the user)
    console.log('1️⃣  GETTING AUTH USER');
    console.log('-'.repeat(70));
    
    try {
      const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY
        }
      });
      
      const { users } = await authResponse.json();
      const librarianUser = users?.find(u => u.email === 'librarian@jecrcu.edu.in');
      
      if (!librarianUser) {
        console.error('❌ Librarian auth user not found');
        return;
      }
      
      console.log('✅ Auth user found:');
      console.log(`   Email: ${librarianUser.email}`);
      console.log(`   ID: ${librarianUser.id}`);
      console.log(`   Created: ${new Date(librarianUser.created_at).toLocaleString()}`);
      console.log(`   Last Sign In: ${librarianUser.last_sign_in_at ? new Date(librarianUser.last_sign_in_at).toLocaleString() : 'Never'}`);
      
      // 2. Test profile lookup with the exact same query as frontend
      console.log('\n2️⃣  TESTING PROFILE LOOKUP (Frontend Query)');
      console.log('-'.repeat(70));
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('department_name, full_name, role, email')
        .eq('email', librarianUser.email)
        .single();
        
      if (profileError) {
        console.error('❌ Profile lookup failed:', profileError);
        
        // Try to find all profiles to see what's available
        const { data: allProfiles, error: allProfilesError } = await supabase
          .from('profiles')
          .select('email, department_name, full_name, role')
          .ilike('email', '%librarian%');
          
        if (!allProfilesError && allProfiles.length > 0) {
          console.log('\nAvailable librarian profiles:');
          allProfiles.forEach(p => {
            console.log(`   - ${p.email} -> Dept: ${p.department_name}, Role: ${p.role}`);
          });
        }
      } else {
        console.log('✅ Profile found:');
        console.log(`   Email: ${profile.email}`);
        console.log(`   Name: ${profile.full_name}`);
        console.log(`   Department: ${profile.department_name}`);
        console.log(`   Role: ${profile.role}`);
        
        // 3. Test the exact frontend query for forms
        console.log('\n3️⃣  TESTING FRONTEND FORMS QUERY');
        console.log('-'.repeat(70));
        
        const { data: forms, error: formsError } = await supabase
          .from('no_dues_forms')
          .select(`
            *,
            no_dues_status!inner(
              status,
              action_at,
              action_by,
              remarks,
              rejection_reason,
              department_name
            )
          `)
          .eq('no_dues_status.department_name', profile.department_name)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (formsError) {
          console.error('❌ Forms query failed:', formsError);
        } else {
          console.log(`✅ Forms query returned ${forms.length} records`);
          
          // Count by status
          const statusCounts = {};
          forms.forEach(form => {
            const status = form.no_dues_status[0]?.status || 'pending';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });
          
          console.log('\nStatus distribution for forms:');
          Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   ${status}: ${count}`);
          });
          
          console.log('\nSample forms:');
          forms.slice(0, 3).forEach((form, index) => {
            console.log(`   ${index + 1}. ${form.registration_no} - ${form.student_name}`);
            console.log(`      Department Status: ${form.no_dues_status[0]?.status}`);
            console.log(`      Form Status: ${form.status}`);
            console.log(`      Created: ${new Date(form.created_at).toLocaleString()}`);
            console.log('');
          });
        }
      }
      
      // 4. Test with different email variations
      console.log('\n4️⃣  TESTING EMAIL VARIATIONS');
      console.log('-'.repeat(70));
      
      const emailVariations = [
        'librarian@jecrcu.edu.in',
        'librarian.jecrcu.edu.in',
        'library@jecrcu.edu.in',
        'library.jecrcu.edu.in'
      ];
      
      for (const email of emailVariations) {
        const { data: testProfile, error: testError } = await supabase
          .from('profiles')
          .select('department_name, full_name')
          .eq('email', email)
          .maybeSingle();
          
        if (testError) {
          console.log(`   ❌ ${email}: Error - ${testError.message}`);
        } else if (testProfile) {
          console.log(`   ✅ ${email}: Found - Dept: ${testProfile.department_name}, Name: ${testProfile.full_name}`);
        } else {
          console.log(`   ⚪ ${email}: Not found`);
        }
      }
      
    } catch (authError) {
      console.error('❌ Auth error:', authError.message);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 LOGIN FLOW TEST SUMMARY');
    console.log('='.repeat(70));
    console.log('   If the profile lookup fails, the issue is:');
    console.log('   1. Profile email does not match auth user email');
    console.log('   2. Profile is missing or corrupted');
    console.log('   3. Department permissions are not set correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
testLibrarianLogin().catch(console.error);
