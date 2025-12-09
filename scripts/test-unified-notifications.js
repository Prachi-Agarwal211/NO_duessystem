/**
 * Test Script for Unified Notification System
 * 
 * This script verifies that:
 * 1. Staff account emails are properly configured
 * 2. All departments have at least one active staff member
 * 3. Email notification system works with staff emails
 * 
 * Run: node scripts/test-unified-notifications.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUnifiedNotifications() {
  console.log('\n🔍 Testing Unified Notification System\n');
  console.log('='.repeat(60));

  try {
    // TEST 1: Check all staff members have emails
    console.log('\n📋 TEST 1: Verifying Staff Email Configuration');
    console.log('-'.repeat(60));
    
    const { data: allStaff, error: staffError } = await supabase
      .from('profiles')
      .select('id, full_name, email, department_name')
      .eq('role', 'department');

    if (staffError) {
      console.error('❌ Error fetching staff:', staffError.message);
      return;
    }

    const staffWithoutEmail = allStaff.filter(s => !s.email);
    
    if (staffWithoutEmail.length > 0) {
      console.log(`❌ FAIL: ${staffWithoutEmail.length} staff member(s) without email:`);
      staffWithoutEmail.forEach(s => {
        console.log(`   - ${s.full_name} (${s.department_name})`);
      });
    } else {
      console.log(`✅ PASS: All ${allStaff.length} staff members have email addresses`);
    }

    // TEST 2: Check department coverage
    console.log('\n📋 TEST 2: Department Staff Coverage');
    console.log('-'.repeat(60));
    
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('name, display_name, is_active')
      .eq('is_active', true)
      .order('display_order');

    if (deptError) {
      console.error('❌ Error fetching departments:', deptError.message);
      return;
    }

    console.log(`\nTotal Active Departments: ${departments.length}\n`);

    const departmentsWithoutStaff = [];
    
    for (const dept of departments) {
      const staffCount = allStaff.filter(s => 
        s.department_name === dept.name && s.email
      ).length;

      if (staffCount === 0) {
        departmentsWithoutStaff.push(dept);
        console.log(`⚠️  ${dept.display_name}: ${staffCount} staff members (NO NOTIFICATIONS WILL BE SENT)`);
      } else {
        console.log(`✅ ${dept.display_name}: ${staffCount} staff member(s)`);
      }
    }

    if (departmentsWithoutStaff.length > 0) {
      console.log(`\n❌ WARNING: ${departmentsWithoutStaff.length} department(s) have no staff members!`);
      console.log('These departments will NOT receive email notifications:');
      departmentsWithoutStaff.forEach(d => console.log(`   - ${d.display_name}`));
    } else {
      console.log('\n✅ PASS: All departments have at least one staff member');
    }

    // TEST 3: Simulate notification query
    console.log('\n📋 TEST 3: Simulating Notification Query');
    console.log('-'.repeat(60));
    
    const { data: notificationRecipients, error: recipientsError } = await supabase
      .from('profiles')
      .select('id, email, full_name, department_name')
      .eq('role', 'department')
      .not('email', 'is', null);

    if (recipientsError) {
      console.error('❌ Error fetching notification recipients:', recipientsError.message);
      return;
    }

    console.log(`\nTotal email recipients: ${notificationRecipients.length}`);
    console.log('\nRecipient List:');
    
    const recipientsByDept = {};
    notificationRecipients.forEach(r => {
      if (!recipientsByDept[r.department_name]) {
        recipientsByDept[r.department_name] = [];
      }
      recipientsByDept[r.department_name].push(r);
    });

    Object.keys(recipientsByDept).sort().forEach(deptName => {
      const dept = departments.find(d => d.name === deptName);
      const displayName = dept ? dept.display_name : deptName;
      console.log(`\n  ${displayName}:`);
      recipientsByDept[deptName].forEach(r => {
        console.log(`    - ${r.full_name} <${r.email}>`);
      });
    });

    // SUMMARY
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Staff Members: ${allStaff.length}`);
    console.log(`Staff with Email: ${allStaff.filter(s => s.email).length}`);
    console.log(`Staff without Email: ${staffWithoutEmail.length}`);
    console.log(`Active Departments: ${departments.length}`);
    console.log(`Departments with Staff: ${departments.length - departmentsWithoutStaff.length}`);
    console.log(`Departments without Staff: ${departmentsWithoutStaff.length}`);
    console.log(`Total Notification Recipients: ${notificationRecipients.length}`);

    const allTestsPassed = 
      staffWithoutEmail.length === 0 && 
      departmentsWithoutStaff.length === 0;

    if (allTestsPassed) {
      console.log('\n✅ ALL TESTS PASSED - System ready for unified notifications!');
    } else {
      console.log('\n⚠️  TESTS FAILED - Please fix the issues above before deploying');
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error);
  }
}

// Run tests
testUnifiedNotifications().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});