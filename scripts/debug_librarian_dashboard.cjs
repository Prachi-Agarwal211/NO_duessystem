// Debug librarian dashboard - why only 1 form showing
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

async function debugLibrarianDashboard() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║              LIBRARIAN DASHBOARD DEBUG                              ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Check librarian profiles
    console.log('1️⃣  CHECKING LIBRARIAN PROFILES');
    console.log('-'.repeat(70));
    
    const { data: librarianProfiles, error: librarianError } = await supabase
      .from('profiles')
      .select('*')
      .or('department_name.eq.library,assigned_department_ids.cs.{library}');
    
    if (librarianError) {
      console.error('❌ Error fetching librarian profiles:', librarianError);
      return;
    }
    
    console.log(`📊 Found ${librarianProfiles?.length || 0} librarian profiles`);
    librarianProfiles?.forEach((profile, i) => {
      console.log(`   ${i+1}. ${profile.email}`);
      console.log(`      Name: ${profile.full_name}`);
      console.log(`      Department: ${profile.department_name}`);
      console.log(`      Assigned Depts: ${profile.assigned_department_ids?.join(', ') || 'None'}`);
      console.log(`      Role: ${profile.role}`);
      console.log(`      Profile ID: ${profile.id}`);
    });
    
    // 2. Check all forms with library department status
    console.log('\n2️⃣  CHECKING FORMS WITH LIBRARY DEPARTMENT STATUS');
    console.log('-'.repeat(70));
    
    const { data: libraryForms, error: libraryFormsError } = await supabase
      .from('no_dues_status')
      .select(`
        form_id,
        department_name,
        status,
        created_at,
        action_at,
        no_dues_forms!inner(
          id,
          registration_no,
          student_name,
          status,
          created_at
        )
      `)
      .eq('department_name', 'library')
      .order('created_at', { ascending: false });
    
    if (libraryFormsError) {
      console.error('❌ Error fetching library forms:', libraryFormsError);
      return;
    }
    
    console.log(`📊 Found ${libraryForms?.length || 0} forms with library department status`);
    libraryForms?.forEach((form, i) => {
      console.log(`   ${i+1}. ${form.no_dues_forms.registration_no} - ${form.no_dues_forms.student_name}`);
      console.log(`      Form Status: ${form.no_dues_forms.status}`);
      console.log(`      Library Status: ${form.status}`);
      console.log(`      Created: ${form.created_at}`);
      console.log(`      Action At: ${form.action_at || 'Pending'}`);
    });
    
    // 3. Test the exact query used in department dashboard
    console.log('\n3️⃣  TESTING DEPARTMENT DASHBOARD QUERY FOR LIBRARIAN');
    console.log('-'.repeat(70));
    
    for (const profile of librarianProfiles || []) {
      console.log(`\n🔍 Testing for: ${profile.email}`);
      
      // This is the exact query from department dashboard
      const { data: dashboardForms, error: dashboardError } = await supabase
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
        .eq('no_dues_status.department_name', profile.department_name || 'library')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (dashboardError) {
        console.error(`   ❌ Error for ${profile.email}:`, dashboardError.message);
      } else {
        console.log(`   ✅ Found ${dashboardForms?.length || 0} forms for ${profile.department_name || 'library'}`);
        dashboardForms?.forEach((form, i) => {
          const status = form.no_dues_status?.[0]?.status || 'unknown';
          console.log(`     ${i+1}. ${form.registration_no} - ${form.student_name} (${status})`);
        });
      }
    }
    
    // 4. Check if there are any filtering issues
    console.log('\n4️⃣  CHECKING FILTERING ISSUES');
    console.log('-'.repeat(70));
    
    // Check all forms (no department filter)
    const { data: allForms, error: allFormsError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!allFormsError && allForms) {
      console.log(`📊 Total forms in database: ${allForms.length}`);
      allForms.forEach((form, i) => {
        console.log(`   ${i+1}. ${form.registration_no} - ${form.student_name} (${form.status})`);
      });
    }
    
    // Check forms that don't have library status
    const { data: formsWithoutLibrary, error: withoutError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name')
      .not('no_dues_status', 'in', '(department_name.eq.library)')
      .limit(5);
    
    if (!withoutError && formsWithoutLibrary) {
      console.log(`\n📊 Forms without library status: ${formsWithoutLibrary.length}`);
      formsWithoutLibrary.forEach((form, i) => {
        console.log(`   ${i+1}. ${form.registration_no} - ${form.student_name}`);
      });
    }
    
    // 5. Check department configuration
    console.log('\n5️⃣  CHECKING DEPARTMENT CONFIGURATION');
    console.log('-'.repeat(70));
    
    const { data: libraryDept, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .eq('name', 'library')
      .single();
    
    if (deptError) {
      console.error('❌ Error fetching library department:', deptError);
    } else {
      console.log('📊 Library department configuration:');
      console.log(`   Name: ${libraryDept.name}`);
      console.log(`   Display Name: ${libraryDept.display_name}`);
      console.log(`   Is Active: ${libraryDept.is_active}`);
      console.log(`   Display Order: ${libraryDept.display_order}`);
    }
    
    // 6. Test with different department names
    console.log('\n6️⃣  TESTING DIFFERENT DEPARTMENT NAMES');
    console.log('-'.repeat(70));
    
    const possibleDeptNames = ['library', 'Library', 'LIBRARY', 'librarian', 'Librarian'];
    
    for (const deptName of possibleDeptNames) {
      const { data: testForms, error: testError } = await supabase
        .from('no_dues_status')
        .select('form_id, status')
        .eq('department_name', deptName)
        .limit(1);
      
      if (!testError && testForms && testForms.length > 0) {
        console.log(`✅ Found forms for department name: "${deptName}" (${testForms.length} forms)`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 LIBRARIAN DASHBOARD DEBUG COMPLETE');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugLibrarianDashboard();
