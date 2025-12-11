/**
 * Check Staff Email Configuration
 * Verifies all 10 departments have staff accounts with valid emails
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStaffEmails() {
  console.log('\n📋 Checking Staff Email Configuration...\n');

  // Expected 10 departments (removed JIC and Student Council, added Registrar)
  const expectedDepartments = [
    'school_hod',
    'library',
    'it_department',
    'hostel',
    'mess',
    'canteen',
    'tpo',
    'alumni_association',
    'accounts_department',
    'registrar'
  ];

  // Check departments table
  console.log('1️⃣ Checking Departments Table:');
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('name, display_name, is_active')
    .eq('is_active', true)
    .order('display_order');

  if (deptError) {
    console.error('❌ Error fetching departments:', deptError.message);
    return;
  }

  console.log(`   Found ${departments.length} active departments:\n`);
  departments.forEach((dept, i) => {
    console.log(`   ${i + 1}. ${dept.name} (${dept.display_name})`);
  });

  // Check staff accounts
  console.log('\n2️⃣ Checking Staff Accounts (profiles table):');
  const { data: staff, error: staffError } = await supabase
    .from('profiles')
    .select('id, email, full_name, department_name, role, is_active')
    .eq('role', 'department')
    .order('department_name');

  if (staffError) {
    console.error('❌ Error fetching staff:', staffError.message);
    return;
  }

  console.log(`   Found ${staff.length} staff accounts:\n`);
  
  const staffByDept = {};
  staff.forEach((s) => {
    if (!staffByDept[s.department_name]) {
      staffByDept[s.department_name] = [];
    }
    staffByDept[s.department_name].push(s);
  });

  // Check each department
  console.log('3️⃣ Department Coverage Analysis:\n');
  let missingCount = 0;
  let hasEmailCount = 0;
  let activeCount = 0;

  expectedDepartments.forEach((deptName) => {
    const staffList = staffByDept[deptName] || [];
    const activeStaff = staffList.filter(s => s.is_active && s.email);
    
    if (activeStaff.length === 0) {
      console.log(`   ❌ ${deptName}: NO STAFF ASSIGNED`);
      missingCount++;
    } else {
      console.log(`   ✅ ${deptName}: ${activeStaff.length} staff member(s)`);
      activeStaff.forEach(s => {
        console.log(`      → ${s.full_name} (${s.email})`);
        hasEmailCount++;
        activeCount++;
      });
    }
  });

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total Departments: ${expectedDepartments.length}`);
  console.log(`   Departments with Staff: ${expectedDepartments.length - missingCount}`);
  console.log(`   Departments without Staff: ${missingCount}`);
  console.log(`   Total Active Staff with Email: ${activeCount}`);

  if (missingCount > 0) {
    console.log('\n⚠️  WARNING: Missing staff accounts for these departments:');
    expectedDepartments.forEach((deptName) => {
      const staffList = staffByDept[deptName] || [];
      const activeStaff = staffList.filter(s => s.is_active && s.email);
      if (activeStaff.length === 0) {
        console.log(`   - ${deptName}`);
      }
    });
    console.log('\n💡 Solution: Run scripts/create-department-staff.js to create missing accounts');
  }

  // Check for staff with no email
  const staffWithoutEmail = staff.filter(s => !s.email);
  if (staffWithoutEmail.length > 0) {
    console.log('\n⚠️  WARNING: Staff accounts without email:');
    staffWithoutEmail.forEach(s => {
      console.log(`   - ${s.full_name} (${s.department_name})`);
    });
  }

  // Check for inactive staff
  const inactiveStaff = staff.filter(s => !s.is_active);
  if (inactiveStaff.length > 0) {
    console.log('\n⚠️  INFO: Inactive staff accounts (won\'t receive emails):');
    inactiveStaff.forEach(s => {
      console.log(`   - ${s.full_name} (${s.department_name}) - ${s.email || 'No email'}`);
    });
  }

  // Test query that the notification system uses
  console.log('\n4️⃣ Testing Notification Query:');
  const { data: notificationStaff, error: notifError } = await supabase
    .from('profiles')
    .select('id, email, full_name, department_name')
    .eq('role', 'department')
    .not('email', 'is', null);

  if (notifError) {
    console.error('❌ Error with notification query:', notifError.message);
  } else {
    console.log(`   Query would notify: ${notificationStaff.length} staff members`);
    if (notificationStaff.length !== activeCount) {
      console.log('   ⚠️  MISMATCH: This doesn\'t match the expected count!');
    } else {
      console.log('   ✅ Query matches expected staff count');
    }
  }

  console.log('\n✅ Diagnostic complete!\n');
}

checkStaffEmails().catch(console.error);