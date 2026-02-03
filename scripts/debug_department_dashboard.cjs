// Debug department dashboard issues
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugDepartmentDashboard() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║              DEPARTMENT DASHBOARD DEBUG                           ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Check department profiles
    console.log('1️⃣  CHECKING DEPARTMENT PROFILES');
    console.log('-'.repeat(70));
    
    const { data: deptProfiles, error: deptError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, department_name, assigned_department_ids')
      .eq('role', 'department');
    
    if (deptError) {
      console.error('❌ Error fetching department profiles:', deptError);
      return;
    }
    
    console.log(`📊 Found ${deptProfiles?.length || 0} department profiles`);
    deptProfiles?.forEach((profile, i) => {
      console.log(`   ${i+1}. ${profile.email} - ${profile.full_name} - Dept: ${profile.department_name || 'N/A'}`);
      console.log(`      Auth ID: ${profile.id}`);
      console.log(`      Assigned Depts: ${profile.assigned_department_ids?.join(', ') || 'None'}`);
    });
    
    // 2. Test department dashboard query for each profile
    console.log('\n2️⃣  TESTING DEPARTMENT DASHBOARD QUERIES');
    console.log('-'.repeat(70));
    
    for (const profile of deptProfiles || []) {
      console.log(`\n🔍 Testing for: ${profile.email}`);
      
      // Test the exact query used in department dashboard
      const { data: forms, error: formsError } = await supabase
        .from('no_dues_forms')
        .select(`
          *,
          no_dues_status!inner(
            status,
            action_at,
            action_by,
            remarks,
            rejection_reason
          )
        `)
        .eq('no_dues_status.department_name', profile.department_name)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (formsError) {
        console.error(`   ❌ Error for ${profile.email}:`, formsError.message);
      } else {
        console.log(`   ✅ Found ${forms?.length || 0} forms for ${profile.department_name}`);
        forms?.forEach((form, i) => {
          console.log(`     ${i+1}. ${form.registration_no} - ${form.student_name} - Status: ${form.no_dues_status[0]?.status}`);
        });
      }
    }
    
    // 3. Check department-action endpoint functionality
    console.log('\n3️⃣  TESTING DEPARTMENT ACTION ENDPOINT LOGIC');
    console.log('-'.repeat(70));
    
    // Get a sample form for testing
    const { data: sampleForm } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name')
      .limit(1);
    
    if (sampleForm && sampleForm.length > 0) {
      const testForm = sampleForm[0];
      console.log(`📝 Testing with form: ${testForm.registration_no}`);
      
      for (const profile of deptProfiles || []) {
        console.log(`\n🔧 Testing action for: ${profile.email} (${profile.department_name})`);
        
        // Check if profile has access to this form
        const { data: statusCheck } = await supabase
          .from('no_dues_status')
          .select('id, status, department_name')
          .eq('form_id', testForm.id)
          .eq('department_name', profile.department_name)
          .limit(1);
        
        if (statusCheck && statusCheck.length > 0) {
          console.log(`   ✅ Can act on form ${testForm.registration_no} (Current status: ${statusCheck[0].status})`);
        } else {
          console.log(`   ❌ No access to form ${testForm.registration_no} for department ${profile.department_name}`);
        }
      }
    }
    
    // 4. Check chat functionality prerequisites
    console.log('\n4️⃣  TESTING CHAT FUNCTIONALITY PREREQUISITES');
    console.log('-'.repeat(70));
    
    // Check chat tables
    const { data: chatMessages, error: chatError } = await supabase
      .from('chat_messages')
      .select('id, form_id, department_name, sender_type')
      .limit(5);
    
    if (chatError) {
      console.error('❌ Error checking chat messages:', chatError.message);
    } else {
      console.log(`📊 Found ${chatMessages?.length || 0} chat messages`);
      chatMessages?.forEach((msg, i) => {
        console.log(`   ${i+1}. Form ${msg.form_id} - Dept: ${msg.department_name} - Sender: ${msg.sender_type}`);
      });
    }
    
    // Check unread counts
    const { data: unreadCounts, error: unreadError } = await supabase
      .from('chat_unread_counts')
      .select('id, user_id, department_name, count')
      .limit(5);
    
    if (unreadError) {
      console.error('❌ Error checking unread counts:', unreadError.message);
    } else {
      console.log(`📊 Found ${unreadCounts?.length || 0} unread count records`);
      unreadCounts?.forEach((count, i) => {
        console.log(`   ${i+1}. User ${count.user_id} - Dept: ${count.department_name} - Count: ${count.count}`);
      });
    }
    
    // 5. Test authentication flow
    console.log('\n5️⃣  TESTING AUTHENTICATION FLOW');
    console.log('-'.repeat(70));
    
    // Get auth users to check ID mismatches
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    if (authUsers && authUsers.users) {
      console.log(`📊 Total auth users: ${authUsers.users.length}`);
      
      // Check for ID mismatches
      const mismatches = [];
      for (const authUser of authUsers.users) {
        const profile = deptProfiles?.find(p => p.email.toLowerCase() === authUser.email.toLowerCase());
        if (profile && profile.id !== authUser.id) {
          mismatches.push({
            email: authUser.email,
            authId: authUser.id,
            profileId: profile.id
          });
        }
      }
      
      if (mismatches.length > 0) {
        console.log(`⚠️  Found ${mismatches.length} ID mismatches:`);
        mismatches.forEach((mismatch, i) => {
          console.log(`   ${i+1}. ${mismatch.email}`);
          console.log(`      Auth ID: ${mismatch.authId}`);
          console.log(`      Profile ID: ${mismatch.profileId}`);
        });
      } else {
        console.log('✅ No ID mismatches found for department profiles');
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 DEPARTMENT DASHBOARD DEBUG COMPLETE');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugDepartmentDashboard();
