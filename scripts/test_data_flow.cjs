// Comprehensive test to verify data flow from database to frontend
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

async function testDataFlow() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║              COMPREHENSIVE DATA FLOW TEST                                ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Test RPC functions used by admin stats
    console.log('1️⃣  TESTING ADMIN STATS RPC FUNCTIONS');
    console.log('-'.repeat(70));
    
    const { data: formStats, error: formStatsError } = await supabase.rpc('get_form_statistics');
    if (formStatsError) {
      console.error('❌ get_form_statistics error:', formStatsError);
    } else {
      console.log('✅ get_form_statistics:', JSON.stringify(formStats, null, 2));
    }
    
    const { data: workloadStats, error: workloadError } = await supabase.rpc('get_department_workload');
    if (workloadError) {
      console.error('❌ get_department_workload error:', workloadError);
    } else {
      console.log('✅ get_department_workload:', JSON.stringify(workloadStats, null, 2));
    }
    
    // 2. Test department dashboard query (library)
    console.log('\n2️⃣  TESTING DEPARTMENT DASHBOARD QUERY (LIBRARY)');
    console.log('-'.repeat(70));
    
    const { data: libraryForms, error: libraryError } = await supabase
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
      .order('created_at', { ascending: false });
    
    if (libraryError) {
      console.error('❌ Library forms query error:', libraryError);
    } else {
      console.log(`✅ Library forms found: ${libraryForms?.length || 0}`);
      if (libraryForms && libraryForms.length > 0) {
        console.log('   Sample form:', {
          id: libraryForms[0].id,
          registration_no: libraryForms[0].registration_no,
          student_name: libraryForms[0].student_name,
          status: libraryForms[0].no_dues_status[0]?.status
        });
      }
    }
    
    // 3. Test admin dashboard query (with pagination)
    console.log('\n3️⃣  TESTING ADMIN DASHBOARD QUERY (WITH PAGINATION)');
    console.log('-'.repeat(70));
    
    const page = 1;
    const limit = 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data: adminForms, error: adminError } = await supabase
      .from('no_dues_forms')
      .select(`
        id,
        student_name,
        registration_no,
        course,
        branch,
        school,
        contact_no,
        status,
        created_at,
        updated_at,
        reapplication_count,
        rejection_context,
        no_dues_status!inner (
          id,
          department_name,
          status,
          action_at,
          created_at,
          rejection_reason,
          action_by
        )
      `)
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (adminError) {
      console.error('❌ Admin forms query error:', adminError);
    } else {
      console.log(`✅ Admin forms (page ${page}): ${adminForms?.length || 0}`);
    }
    
    // Test count query
    const { count: totalCount, error: countError } = await supabase
      .from('no_dues_forms')
      .select('id', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Count query error:', countError);
    } else {
      console.log(`✅ Total forms count: ${totalCount || 0}`);
    }
    
    // 4. Test all departments
    console.log('\n4️⃣  TESTING ALL DEPARTMENTS');
    console.log('-'.repeat(70));
    
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('name, display_name')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (deptError) {
      console.error('❌ Departments query error:', deptError);
    } else {
      console.log(`✅ Active departments: ${departments?.length || 0}`);
      for (const dept of departments || []) {
        const { count: deptCount, error: deptCountError } = await supabase
          .from('no_dues_status')
          .select('*', { count: 'exact', head: true })
          .eq('department_name', dept.name);
        
        const { count: approvedCount, error: approvedError } = await supabase
          .from('no_dues_status')
          .select('*', { count: 'exact', head: true })
          .eq('department_name', dept.name)
          .eq('status', 'approved');
        
        console.log(`   ${dept.display_name}: ${deptCount || 0} total, ${approvedCount || 0} approved`);
      }
    }
    
    // 5. Test librarian profile
    console.log('\n5️⃣  TESTING LIBRARIAN PROFILE');
    console.log('-'.repeat(70));
    
    const { data: librarianProfile, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'razorrag.official@gmail.com')
      .single();
    
    if (profError) {
      console.error('❌ Librarian profile error:', profError);
    } else {
      console.log('✅ Librarian profile:', {
        email: librarianProfile.email,
        full_name: librarianProfile.full_name,
        role: librarianProfile.role,
        department_name: librarianProfile.department_name
      });
    }
    
    // 6. Summary
    console.log('\n6️⃣  SUMMARY');
    console.log('-'.repeat(70));
    
    const { count: totalForms, error: totalError } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalStatus, error: statusError } = await supabase
      .from('no_dues_status')
      .select('*', { count: 'exact', head: true });
    
    console.log('📊 DATABASE STATE:');
    console.log(`   Total Forms: ${totalForms || 0}`);
    console.log(`   Total Status Records: ${totalStatus || 0}`);
    console.log(`   Expected Status Records: ${(totalForms || 0) * 7} (7 departments per form)`);
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 COMPREHENSIVE DATA FLOW TEST COMPLETE');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testDataFlow();
