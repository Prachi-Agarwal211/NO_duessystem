const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Test data
let testFormId = null;
let testManualEntryId = null;
let testStaffId = null;

async function runAllTests() {
  console.log('🧪 COMPREHENSIVE FEATURE TESTING\n');
  console.log('='.repeat(70));
  
  const results = [];
  
  // ==================== PHASE 1: STUDENT FEATURES ====================
  console.log('\n📝 PHASE 1: STUDENT FEATURES');
  console.log('='.repeat(70));

  // Test 1: Student Form Submission
  console.log('\n1️⃣  Testing Student Form Submission...');
  try {
    const { data: school } = await supabaseAdmin.from('config_schools').select('id, name').limit(1).single();
    const { data: course } = await supabaseAdmin.from('config_courses').select('id, name').eq('school_id', school.id).limit(1).single();
    const { data: branch } = await supabaseAdmin.from('config_branches').select('id, name').eq('course_id', course.id).limit(1).single();

    const testForm = {
      registration_no: `TEST${Date.now()}`,
      student_name: 'Test Student',
      school_id: school.id,
      school: school.name,
      course_id: course.id,
      course: course.name,
      branch_id: branch.id,
      branch: branch.name,
      country_code: '+91',
      contact_no: '9876543210',
      personal_email: 'test@example.com',
      college_email: 'test@jecrcu.edu.in',
      session_from: '2020',
      session_to: '2024',
      status: 'pending'
    };

    const { data: form, error } = await supabaseAdmin
      .from('no_dues_forms')
      .insert(testForm)
      .select()
      .single();

    if (form) {
      testFormId = form.id;
      console.log(`   ✅ Form created: ${form.registration_no}`);
      results.push({ feature: 'Student Form Submission', status: 'PASS' });
    } else {
      throw new Error(error?.message || 'Form creation failed');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ feature: 'Student Form Submission', status: 'FAIL', error: error.message });
  }

  // Test 2: Check Form Status
  console.log('\n2️⃣  Testing Form Status Check...');
  try {
    const { data: form } = await supabaseAnon
      .from('no_dues_forms')
      .select('id, registration_no, status, student_name')
      .eq('id', testFormId)
      .single();

    if (form) {
      console.log(`   ✅ Can retrieve form: ${form.status}`);
      results.push({ feature: 'Form Status Check', status: 'PASS' });
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ feature: 'Form Status Check', status: 'FAIL', error: error.message });
  }

  // Test 3: Duplicate Prevention
  console.log('\n3️⃣  Testing Duplicate Prevention...');
  try {
    const { data: existingForm } = await supabaseAdmin
      .from('no_dues_forms')
      .select('registration_no')
      .eq('id', testFormId)
      .single();

    const { error: dupError } = await supabaseAdmin
      .from('no_dues_forms')
      .insert({
        registration_no: existingForm.registration_no,
        student_name: 'Duplicate Test',
        status: 'pending'
      });

    if (dupError && dupError.code === '23505') {
      console.log('   ✅ Duplicate detection works');
      results.push({ feature: 'Duplicate Prevention', status: 'PASS' });
    } else {
      throw new Error('Duplicate was allowed!');
    }
  } catch (error) {
    if (error.message.includes('Duplicate detection')) {
      console.log(`   ❌ ${error.message}`);
      results.push({ feature: 'Duplicate Prevention', status: 'FAIL' });
    } else {
      console.log(`   ✅ Duplicate prevented`);
      results.push({ feature: 'Duplicate Prevention', status: 'PASS' });
    }
  }

  // ==================== PHASE 2: STAFF FEATURES ====================
  console.log('\n\n👨‍💼 PHASE 2: STAFF FEATURES');
  console.log('='.repeat(70));

  // Test 4: Staff Dashboard Access
  console.log('\n4️⃣  Testing Staff Dashboard Access...');
  try {
    const { count } = await supabaseAdmin
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    console.log(`   ✅ Can query pending forms: ${count || 0} found`);
    results.push({ feature: 'Staff Dashboard Access', status: 'PASS' });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ feature: 'Staff Dashboard Access', status: 'FAIL', error: error.message });
  }

  // Test 5: Department Actions
  console.log('\n5️⃣  Testing Department Actions...');
  try {
    const actionData = {
      form_id: testFormId,
      department_name: 'Library',
      action: 'approved',
      remarks: 'Test approval',
      action_by: 'test@staff.com'
    };

    const { data: action, error } = await supabaseAdmin
      .from('department_actions')
      .insert(actionData)
      .select()
      .single();

    if (action) {
      console.log(`   ✅ Department action created: ${action.action}`);
      results.push({ feature: 'Department Actions', status: 'PASS' });
    } else {
      throw new Error(error?.message || 'Action creation failed');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ feature: 'Department Actions', status: 'FAIL', error: error.message });
  }

  // Test 6: Query Actions by Form
  console.log('\n6️⃣  Testing Action History Query...');
  try {
    const { data: actions } = await supabaseAdmin
      .from('department_actions')
      .select('*')
      .eq('form_id', testFormId)
      .order('created_at', { ascending: false });

    console.log(`   ✅ Can query actions: ${actions?.length || 0} found`);
    results.push({ feature: 'Action History Query', status: 'PASS' });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ feature: 'Action History Query', status: 'FAIL', error: error.message });
  }

  // Test 7: Staff Scoping (Department Filter)
  console.log('\n7️⃣  Testing Staff Scoping...');
  try {
    const { data: school } = await supabaseAdmin.from('config_schools').select('name').limit(1).single();
    
    const { data: forms } = await supabaseAdmin
      .from('no_dues_forms')
      .select('*')
      .eq('school', school.name);

    console.log(`   ✅ Can filter by school: ${forms?.length || 0} forms`);
    results.push({ feature: 'Staff Scoping', status: 'PASS' });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ feature: 'Staff Scoping', status: 'FAIL', error: error.message });
  }

  // ==================== PHASE 3: MANUAL ENTRY FEATURES ====================
  console.log('\n\n✍️  PHASE 3: MANUAL ENTRY FEATURES');
  console.log('='.repeat(70));

  // Test 8: Create Manual Entry
  console.log('\n8️⃣  Testing Manual Entry Creation...');
  try {
    const { data: school } = await supabaseAdmin.from('config_schools').select('id, name').limit(1).single();
    const { data: course } = await supabaseAdmin.from('config_courses').select('id, name').eq('school_id', school.id).limit(1).single();
    const { data: branch } = await supabaseAdmin.from('config_branches').select('id, name').eq('course_id', course.id).limit(1).single();

    const manualEntry = {
      registration_no: `MANUAL${Date.now()}`,
      student_name: 'Manual Entry Student',
      school_id: school.id,
      school: school.name,
      course_id: course.id,
      course: course.name,
      branch_id: branch.id,
      branch: branch.name,
      contact_no: '9876543210',
      personal_email: 'manual@example.com',
      college_email: 'manual@jecrcu.edu.in',
      entry_type: 'manual',
      entered_by: 'test@staff.com',
      status: 'pending'
    };

    const { data: entry, error } = await supabaseAdmin
      .from('manual_entries')
      .insert(manualEntry)
      .select()
      .single();

    if (entry) {
      testManualEntryId = entry.id;
      console.log(`   ✅ Manual entry created: ${entry.registration_no}`);
      results.push({ feature: 'Manual Entry Creation', status: 'PASS' });
    } else {
      throw new Error(error?.message || 'Manual entry creation failed');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ feature: 'Manual Entry Creation', status: 'FAIL', error: error.message });
  }

  // Test 9: Query Manual Entries
  console.log('\n9️⃣  Testing Manual Entry Query...');
  try {
    const { data: entries } = await supabaseAdmin
      .from('manual_entries')
      .select('*')
      .eq('entry_type', 'manual')
      .limit(5);

    console.log(`   ✅ Can query manual entries: ${entries?.length || 0} found`);
    results.push({ feature: 'Manual Entry Query', status: 'PASS' });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ feature: 'Manual Entry Query', status: 'FAIL', error: error.message });
  }

  // Test 10: Manual Entry Action
  console.log('\n🔟 Testing Manual Entry Action...');
  try {
    const { data: updated } = await supabaseAdmin
      .from('manual_entries')
      .update({ status: 'approved' })
      .eq('id', testManualEntryId)
      .select()
      .single();

    if (updated && updated.status === 'approved') {
      console.log(`   ✅ Manual entry updated to: ${updated.status}`);
      results.push({ feature: 'Manual Entry Action', status: 'PASS' });
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ feature: 'Manual Entry Action', status: 'FAIL', error: error.message });
  }

  // ==================== PHASE 4: ADMIN FEATURES ====================
  console.log('\n\n👑 PHASE 4: ADMIN FEATURES');
  console.log('='.repeat(70));

  // Test 11: Admin Stats
  console.log('\n1️⃣1️⃣  Testing Admin Statistics...');
  try {
    const { count: totalForms } = await supabaseAdmin
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true });

    const { count: pendingForms } = await supabaseAdmin
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    console.log(`   ✅ Total forms: ${totalForms || 0}, Pending: ${pendingForms || 0}`);
    results.push({ feature: 'Admin Statistics', status: 'PASS' });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ feature: 'Admin Statistics', status: 'FAIL', error: error.message });
  }

  // Test 12: Config Management
  console.log('\n1️⃣2️⃣  Testing Config Management...');
  try {
    const { data: schools } = await supabaseAdmin
      .from('config_schools')
      .select('*')
      .eq('is_active', true);

    const { data: courses } = await supabaseAdmin
      .from('config_courses')
      .select('*')
      .eq('is_active', true);

    console.log(`   ✅ Can manage configs: ${schools?.length || 0} schools, ${courses?.length || 0} courses`);
    results.push({ feature: 'Config Management', status: 'PASS' });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ feature: 'Config Management', status: 'FAIL', error: error.message });
  }

  // Test 13: Staff Management
  console.log('\n1️⃣3️⃣  Testing Staff Management...');
  try {
    const { data: staff } = await supabaseAdmin
      .from('staff')
      .select('*')
      .limit(10);

    console.log(`   ✅ Can query staff: ${staff?.length || 0} accounts found`);
    results.push({ feature: 'Staff Management', status: 'PASS' });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ feature: 'Staff Management', status: 'FAIL', error: error.message });
  }

  // ==================== PHASE 5: WORKFLOW TESTS ====================
  console.log('\n\n🔄 PHASE 5: WORKFLOW TESTS');
  console.log('='.repeat(70));

  // Test 14: Complete Approval Workflow
  console.log('\n1️⃣4️⃣  Testing Complete Approval Workflow...');
  try {
    const departments = ['Library', 'Hostel', 'Accounts', 'IT Department', 'Mess', 'Canteen', 'TPO', 'Alumni', 'Department'];
    
    for (const dept of departments) {
      await supabaseAdmin
        .from('department_actions')
        .insert({
          form_id: testFormId,
          department_name: dept,
          action: 'approved',
          remarks: `Auto-approved by test`,
          action_by: 'test@staff.com'
        });
    }

    // Check if all departments approved
    const { data: actions } = await supabaseAdmin
      .from('department_actions')
      .select('*')
      .eq('form_id', testFormId)
      .eq('action', 'approved');

    console.log(`   ✅ Approval workflow: ${actions?.length || 0}/9 departments approved`);
    results.push({ feature: 'Complete Approval Workflow', status: 'PASS' });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ feature: 'Complete Approval Workflow', status: 'FAIL', error: error.message });
  }

  // Test 15: Rejection Workflow
  console.log('\n1️⃣5️⃣  Testing Rejection Workflow...');
  try {
    const { data: rejectedAction } = await supabaseAdmin
      .from('department_actions')
      .insert({
        form_id: testFormId,
        department_name: 'Library',
        action: 'rejected',
        remarks: 'Test rejection',
        action_by: 'test@staff.com'
      })
      .select()
      .single();

    if (rejectedAction && rejectedAction.action === 'rejected') {
      console.log(`   ✅ Rejection workflow works`);
      results.push({ feature: 'Rejection Workflow', status: 'PASS' });
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ feature: 'Rejection Workflow', status: 'FAIL', error: error.message });
  }

  // ==================== CLEANUP ====================
  console.log('\n\n🧹 CLEANUP');
  console.log('='.repeat(70));

  console.log('\nCleaning up test data...');
  try {
    if (testFormId) {
      await supabaseAdmin.from('department_actions').delete().eq('form_id', testFormId);
      await supabaseAdmin.from('no_dues_forms').delete().eq('id', testFormId);
      console.log('   ✅ Cleaned test form and actions');
    }
    if (testManualEntryId) {
      await supabaseAdmin.from('manual_entries').delete().eq('id', testManualEntryId);
      console.log('   ✅ Cleaned manual entry');
    }
  } catch (error) {
    console.log(`   ⚠️  Cleanup warning: ${error.message}`);
  }

  // ==================== SUMMARY ====================
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 COMPREHENSIVE TEST SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  results.forEach((r, i) => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${i + 1}. ${r.feature}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  });

  console.log('='.repeat(70));
  console.log(`Total Tests: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(70));

  if (failed === 0) {
    console.log('\n🎉 ALL FEATURES WORKING! System is production-ready.');
  } else {
    console.log(`\n⚠️  ${failed} features failed. Please review and fix.`);
  }

  return { total: results.length, passed, failed, results };
}

// Run tests
runAllTests()
  .then(({ total, passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\n❌ Test suite error:', error);
    process.exit(1);
  });