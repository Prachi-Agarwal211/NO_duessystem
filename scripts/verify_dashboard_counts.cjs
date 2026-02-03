// Verify all dashboard counts are showing 241 approved
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

async function verifyDashboardCounts() {
  console.log('🔍 VERIFYING DASHBOARD COUNTS - ALL SHOULD SHOW 241 APPROVED\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Get all departments and their users
    console.log('📋 1. Getting all departments and users...');
    
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name');

    if (deptError) {
      console.error('❌ Error fetching departments:', deptError);
      return;
    }

    console.log(`✅ Found ${departments.length} active departments`);

    // 2. Get department staff profiles
    const { data: deptStaff, error: staffError } = await supabase
      .from('profiles')
      .select('id, email, full_name, department_name, role, assigned_department_ids')
      .eq('role', 'department')
      .order('department_name');

    if (staffError) {
      console.error('❌ Error fetching staff:', staffError);
      return;
    }

    console.log(`✅ Found ${deptStaff.length} department staff members`);

    // 3. Test each department's dashboard query
    console.log('\n📊 2. Testing Department Dashboard Queries:');
    
    for (const dept of departments) {
      console.log(`\n🏢 ${dept.name.toUpperCase()} DEPARTMENT:`);
      
      // Simulate the department dashboard query
      const { data: deptForms, error: formsError } = await supabase
        .from('no_dues_forms')
        .select(`
          *,
          no_dues_status!inner(
            status,
            department_name
          )
        `)
        .eq('no_dues_status.department_name', dept.name)
        .order('created_at', { ascending: false });

      if (formsError) {
        console.error(`   ❌ Query error: ${formsError.message}`);
        continue;
      }

      // Count by status for this department
      const statusCounts = {};
      deptForms.forEach(form => {
        const deptStatus = form.no_dues_status.find(s => s.department_name === dept.name);
        const status = deptStatus?.status || 'pending';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      console.log(`   Total forms visible: ${deptForms.length}`);
      console.log(`   Approved: ${statusCounts.approved || 0}`);
      console.log(`   Pending: ${statusCounts.pending || 0}`);
      console.log(`   Rejected: ${statusCounts.rejected || 0}`);
      console.log(`   In Progress: ${statusCounts.in_progress || 0}`);

      // Check if it shows 241 approved
      const approvedCount = statusCounts.approved || 0;
      if (approvedCount === 241) {
        console.log(`   ✅ CORRECT: Shows 241 approved`);
      } else {
        console.log(`   ❌ ISSUE: Shows ${approvedCount} approved (should be 241)`);
      }
    }

    // 4. Test admin dashboard (should see all 241)
    console.log('\n📊 3. Testing Admin Dashboard:');
    const { data: allForms, error: adminError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status')
      .order('created_at', { ascending: false });

    if (adminError) {
      console.error(`   ❌ Admin query error: ${adminError.message}`);
    } else {
      const adminStatusCounts = {};
      allForms.forEach(form => {
        adminStatusCounts[form.status] = (adminStatusCounts[form.status] || 0) + 1;
      });

      console.log(`   Total forms: ${allForms.length}`);
      console.log(`   Completed: ${adminStatusCounts.completed || 0}`);
      
      if (allForms.length === 241) {
        console.log(`   ✅ CORRECT: Admin sees all 241 forms`);
      } else {
        console.log(`   ❌ ISSUE: Admin sees ${allForms.length} forms (should be 241)`);
      }
    }

    // 5. Test HOD specific queries (should show scoped data)
    console.log('\n📊 4. Testing HOD Scoped Queries:');
    
    // Get HOD profiles
    const { data: hodProfiles, error: hodError } = await supabase
      .from('profiles')
      .select('id, email, full_name, department_name')
      .eq('role', 'department')
      .ilike('department_name', '%hod%')
      .or('department_name.eq.school_hod,department_name.eq.hod');

    if (!hodError && hodProfiles.length > 0) {
      for (const hod of hodProfiles) {
        console.log(`\n👨‍🏫 HOD: ${hod.full_name} (${hod.email})`);
        console.log(`   Department: ${hod.department_name}`);
        
        // HOD should see forms based on their department scope
        const { data: hodForms, error: hodError } = await supabase
          .from('no_dues_forms')
          .select(`
            *,
            no_dues_status!inner(
              status,
              department_name
            )
          `)
          .eq('no_dues_status.department_name', hod.department_name)
          .order('created_at', { ascending: false });

        if (!hodError) {
          const hodStatusCounts = {};
          hodForms.forEach(form => {
            const deptStatus = form.no_dues_status.find(s => s.department_name === hod.department_name);
            const status = deptStatus?.status || 'pending';
            hodStatusCounts[status] = (hodStatusCounts[status] || 0) + 1;
          });

          console.log(`   Forms visible: ${hodForms.length}`);
          console.log(`   Approved: ${hodStatusCounts.approved || 0}`);
          console.log(`   Note: HOD sees scoped data for their department`);
        }
      }
    } else {
      console.log('   No HOD profiles found');
    }

    // 6. Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(70));
    console.log('✅ EXPECTED BEHAVIOR:');
    console.log('   - Admin Dashboard: 241 forms (all completed)');
    console.log('   - Library Dashboard: 241 approved');
    console.log('   - Accounts Dashboard: 241 approved');
    console.log('   - Hostel Dashboard: 241 approved');
    console.log('   - IT Dashboard: 241 approved');
    console.log('   - Registrar Dashboard: 241 approved');
    console.log('   - Alumni Dashboard: 241 approved');
    console.log('   - HOD Dashboard: Scoped data (but collectively 241)');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
verifyDashboardCounts().catch(console.error);
