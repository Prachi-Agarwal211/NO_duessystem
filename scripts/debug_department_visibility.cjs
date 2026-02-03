// Debug Department Visibility Issue
// Check why librarian.jecrcu.edu.in can't see approved data

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

async function debugDepartmentVisibility() {
  console.log('🔍 DEBUGGING DEPARTMENT VISIBILITY ISSUE\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Check librarian profile
    console.log('1️⃣  CHECKING LIBRARIAN PROFILE');
    console.log('-'.repeat(70));
    
    const { data: librarianProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'librarian.jecrcu.edu.in')
      .single();
      
    if (profileError) {
      console.error('❌ Librarian profile not found:', profileError);
      
      // Try to find any librarian profiles
      const { data: librarianProfiles, error: librarianError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', '%librarian%');
        
      if (!librarianError && librarianProfiles.length > 0) {
        console.log('Found librarian profiles:');
        librarianProfiles.forEach(profile => {
          console.log(`   - ${profile.email} -> Department: ${profile.department_name}`);
        });
      }
    } else {
      console.log('✅ Librarian profile found:');
      console.log(`   Email: ${librarianProfile.email}`);
      console.log(`   Name: ${librarianProfile.full_name}`);
      console.log(`   Department: ${librarianProfile.department_name}`);
      console.log(`   Role: ${librarianProfile.role}`);
    }
    
    // 2. Check library department statuses
    console.log('\n2️⃣  CHECKING LIBRARY DEPARTMENT STATUSES');
    console.log('-'.repeat(70));
    
    const { data: libraryStatuses, error: libraryError } = await supabase
      .from('no_dues_status')
      .select(`
        *,
        no_dues_forms!inner(
          registration_no,
          student_name,
          status,
          created_at
        )
      `)
      .eq('department_name', 'library')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (libraryError) {
      console.error('❌ Error fetching library statuses:', libraryError);
    } else {
      console.log(`✅ Found ${libraryStatuses.length} library status records`);
      
      // Count by status
      const statusCounts = {};
      libraryStatuses.forEach(status => {
        statusCounts[status.status] = (statusCounts[status.status] || 0) + 1;
      });
      
      console.log('\nStatus distribution:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
      
      console.log('\nSample records:');
      libraryStatuses.slice(0, 5).forEach((status, index) => {
        console.log(`   ${index + 1}. ${status.no_dues_forms.registration_no} - ${status.no_dues_forms.student_name}`);
        console.log(`      Status: ${status.status}`);
        console.log(`      Action At: ${status.action_at || 'Not yet'}`);
        console.log(`      Action By: ${status.action_by || 'Not yet'}`);
        console.log('');
      });
    }
    
    // 3. Test the exact query the frontend uses
    console.log('\n3️⃣  TESTING FRONTEND QUERY');
    console.log('-'.repeat(70));
    
    const { data: frontendQuery, error: frontendError } = await supabase
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
      .eq('no_dues_status.department_name', 'library')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (frontendError) {
      console.error('❌ Frontend query failed:', frontendError);
    } else {
      console.log(`✅ Frontend query returned ${frontendQuery.length} records`);
      
      frontendQuery.forEach((form, index) => {
        console.log(`   ${index + 1}. ${form.registration_no} - ${form.student_name}`);
        console.log(`      Department Status: ${form.no_dues_status[0]?.status || 'No status found'}`);
        console.log(`      Form Status: ${form.status}`);
        console.log('');
      });
    }
    
    // 4. Check all departments that have data
    console.log('\n4️⃣  CHECKING ALL DEPARTMENTS WITH DATA');
    console.log('-'.repeat(70));
    
    const { data: allDeptStatuses, error: allDeptError } = await supabase
      .from('no_dues_status')
      .select('department_name')
      .not('department_name', 'is', null);
      
    if (!allDeptError && allDeptStatuses) {
      const deptCounts = {};
      allDeptStatuses.forEach(status => {
        deptCounts[status.department_name] = (deptCounts[status.department_name] || 0) + 1;
      });
      
      console.log('Department record counts:');
      Object.entries(deptCounts).forEach(([dept, count]) => {
        console.log(`   ${dept}: ${count} records`);
      });
    }
    
    // 5. Check if there are any forms without library status
    console.log('\n5️⃣  CHECKING FORMS WITHOUT LIBRARY STATUS');
    console.log('-'.repeat(70));
    
    const { data: formsWithoutLibrary, error: withoutLibraryError } = await supabase
      .from('no_dues_forms')
      .select('registration_no, student_name')
      .not('id', 'in', 
        `(SELECT form_id FROM no_dues_status WHERE department_name = 'library')`
      )
      .limit(5);
      
    if (!withoutLibraryError && formsWithoutLibrary) {
      console.log(`Found ${formsWithoutLibrary.length} forms without library status`);
      formsWithoutLibrary.forEach(form => {
        console.log(`   - ${form.registration_no} - ${form.student_name}`);
      });
    }
    
    // 6. Check auth.users for librarian
    console.log('\n6️⃣  CHECKING AUTH USERS FOR LIBRARIAN');
    console.log('-'.repeat(70));
    
    try {
      const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY
        }
      });
      
      const { users } = await authResponse.json();
      const librarianUsers = users?.filter(u => u.email.includes('librarian')) || [];
      
      console.log(`Found ${librarianUsers.length} auth users with 'librarian' in email:`);
      librarianUsers.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user.id})`);
        console.log(`     Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`     Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
      });
    } catch (authError) {
      console.error('❌ Error checking auth users:', authError.message);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 DEBUG SUMMARY');
    console.log('='.repeat(70));
    console.log('   Check the above results to identify the issue:');
    console.log('   1. Librarian profile exists and has correct department_name');
    console.log('   2. Library department has status records');
    console.log('   3. Frontend query returns data');
    console.log('   4. Auth user exists for librarian');
    console.log('   5. All forms have library status records');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

// Run debug
debugDepartmentVisibility().catch(console.error);
