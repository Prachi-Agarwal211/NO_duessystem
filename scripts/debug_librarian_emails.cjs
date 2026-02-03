// Debug Librarian Email Mismatch Issue
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

async function debugLibrarianEmails() {
  console.log('🔍 DEBUGGING LIBRARIAN EMAIL MISMATCH\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Get all librarian-related profiles
    console.log('👤 Step 1: Finding all librarian profiles...');
    const { data: allProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .or('email.ilike.%librarian%,department_name.ilike.%library%');

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError);
      return;
    }

    console.log(`Found ${allProfiles.length} librarian-related profiles:`);
    allProfiles.forEach((profile, index) => {
      console.log(`\n${index + 1}. ${profile.full_name}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Role: ${profile.role}`);
      console.log(`   Department: ${profile.department_name}`);
      console.log(`   Assigned IDs: ${JSON.stringify(profile.assigned_department_ids)}`);
      console.log(`   Profile ID: ${profile.id}`);
    });

    // 2. Check auth users
    console.log('\n🔐 Step 2: Checking auth users...');
    try {
      const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY
        }
      });
      
      const { users } = await authResponse.json();
      const librarianAuthUsers = users?.filter(u => 
        u.email.toLowerCase().includes('librarian') ||
        u.email.toLowerCase().includes('library')
      ) || [];

      console.log(`Found ${librarianAuthUsers.length} librarian auth users:`);
      librarianAuthUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.email}`);
        console.log(`   Auth ID: ${user.id}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
        
        // Find matching profile
        const matchingProfile = allProfiles.find(p => p.email === user.email);
        if (matchingProfile) {
          console.log(`   ✅ Profile found: ${matchingProfile.full_name}`);
          console.log(`   Profile ID: ${matchingProfile.id}`);
          console.log(`   IDs Match: ${user.id === matchingProfile.id ? '✅ YES' : '❌ NO'}`);
        } else {
          console.log(`   ❌ No profile found for this auth user`);
        }
      });
    } catch (authError) {
      console.error('❌ Error checking auth users:', authError.message);
    }

    // 3. Test login scenarios
    console.log('\n🔓 Step 3: Testing login scenarios...');
    
    const testEmails = [
      'librarian@jecrcu.edu.in',
      'razorrag.official@gmail.com',
      'library@jecrcu.edu.in'
    ];

    for (const email of testEmails) {
      console.log(`\nTesting email: ${email}`);
      
      // Check profile
      const { data: testProfile, error: testProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (testProfileError) {
        console.log(`   ❌ Profile error: ${testProfileError.message}`);
      } else if (testProfile) {
        console.log(`   ✅ Profile found: ${testProfile.full_name}`);
        console.log(`   Department: ${testProfile.department_name}`);
        console.log(`   Role: ${testProfile.role}`);
        
        // Test department query
        if (testProfile.department_name) {
          const { data: deptData, error: deptError } = await supabase
            .from('no_dues_forms')
            .select(`
              *,
              no_dues_status!inner(
                status,
                department_name
              )
            `)
            .eq('no_dues_status.department_name', testProfile.department_name)
            .limit(3);

          if (deptError) {
            console.log(`   ❌ Department query error: ${deptError.message}`);
          } else {
            console.log(`   ✅ Can access ${deptData.length} forms for department: ${testProfile.department_name}`);
          }
        }
      } else {
        console.log(`   ⚪ No profile found`);
      }
    }

    // 4. Check which email the user mentioned in the problem
    console.log('\n🎯 Step 4: Problem Analysis...');
    console.log('User mentioned: "librarian.jecrcu.edu.in" (with dot)');
    console.log('But actual emails found:');
    
    const allEmails = [...new Set([
      ...allProfiles.map(p => p.email),
      ...(librarianAuthUsers?.map(u => u.email) || [])
    ])];

    allEmails.forEach(email => {
      console.log(`   - ${email}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('🔍 RECOMMENDATIONS:');
    console.log('='.repeat(70));
    console.log('1. Check if user is logging in with correct email');
    console.log('2. Verify the email format (dot vs @)');
    console.log('3. Ensure profile and auth user IDs match');
    console.log('4. Check if department permissions are correctly set');

  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

// Run debug
debugLibrarianEmails().catch(console.error);
