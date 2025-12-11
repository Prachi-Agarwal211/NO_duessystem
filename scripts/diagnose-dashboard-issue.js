#!/usr/bin/env node

/**
 * Diagnose why staff dashboard shows no data
 * Check database state and query logic
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
  console.log('🔍 Diagnosing Staff Dashboard Issue...\n');

  // Step 1: Check if any forms exist
  console.log('1️⃣ Checking no_dues_forms table...');
  const { data: forms, error: formsError } = await supabase
    .from('no_dues_forms')
    .select('id, registration_no, student_name, school_id, course_id, branch_id, school, course, branch, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (formsError) {
    console.error('   ❌ Error:', formsError);
    return;
  }

  console.log(`   ✅ Found ${forms.length} forms`);
  if (forms.length > 0) {
    forms.forEach((form, i) => {
      console.log(`   ${i + 1}. ${form.student_name} (${form.registration_no})`);
      console.log(`      - Status: ${form.status}`);
      console.log(`      - School (TEXT): ${form.school}`);
      console.log(`      - School (UUID): ${form.school_id}`);
      console.log(`      - Course (TEXT): ${form.course}`);
      console.log(`      - Course (UUID): ${form.course_id}`);
      console.log(`      - Branch (TEXT): ${form.branch}`);
      console.log(`      - Branch (UUID): ${form.branch_id}`);
      console.log(`      - Created: ${new Date(form.created_at).toLocaleString()}`);
    });
  }
  console.log();

  // Step 2: Check if status records were created
  console.log('2️⃣ Checking no_dues_status table...');
  const { data: statuses, error: statusError } = await supabase
    .from('no_dues_status')
    .select('id, form_id, department_name, status')
    .order('created_at', { ascending: false })
    .limit(20);

  if (statusError) {
    console.error('   ❌ Error:', statusError);
    return;
  }

  console.log(`   ✅ Found ${statuses.length} status records`);
  if (statuses.length > 0) {
    // Group by form_id
    const byForm = {};
    statuses.forEach(s => {
      if (!byForm[s.form_id]) byForm[s.form_id] = [];
      byForm[s.form_id].push(s);
    });

    Object.entries(byForm).forEach(([formId, stats]) => {
      const pending = stats.filter(s => s.status === 'pending').length;
      const approved = stats.filter(s => s.status === 'approved').length;
      const rejected = stats.filter(s => s.status === 'rejected').length;
      console.log(`   Form ${formId.substring(0, 8)}... → ${stats.length} depts (${pending} pending, ${approved} approved, ${rejected} rejected)`);
    });
  }
  console.log();

  // Step 3: Check staff profiles
  console.log('3️⃣ Checking staff profiles...');
  const { data: staff, error: staffError } = await supabase
    .from('profiles')
    .select('id, email, full_name, department_name, school_id, school_ids, course_ids, branch_ids')
    .eq('role', 'department');

  if (staffError) {
    console.error('   ❌ Error:', staffError);
    return;
  }

  console.log(`   ✅ Found ${staff.length} staff members`);
  staff.forEach(s => {
    console.log(`   - ${s.full_name} (${s.department_name})`);
    if (s.department_name === 'school_hod') {
      console.log(`     School UUIDs: ${s.school_ids?.length || 0}`);
      console.log(`     Course UUIDs: ${s.course_ids?.length || 0}`);
      console.log(`     Branch UUIDs: ${s.branch_ids?.length || 0}`);
    }
  });
  console.log();

  // Step 4: Test the exact query used by dashboard API
  if (staff.length > 0) {
    console.log('4️⃣ Testing dashboard query for first staff member...');
    const testStaff = staff[0];
    console.log(`   Testing for: ${testStaff.full_name} (${testStaff.department_name})`);

    let query = supabase
      .from('no_dues_status')
      .select(`
        id,
        form_id,
        department_name,
        status,
        no_dues_forms!inner (
          id,
          student_name,
          registration_no,
          school,
          school_id,
          course,
          course_id,
          branch,
          branch_id,
          created_at
        )
      `)
      .eq('department_name', testStaff.department_name)
      .eq('status', 'pending');

    // Apply HOD filtering if school_hod
    if (testStaff.department_name === 'school_hod') {
      console.log('   Applying HOD scope filtering...');
      
      if (testStaff.school_ids && testStaff.school_ids.length > 0) {
        console.log(`   - Filtering by school_ids: ${testStaff.school_ids.length} schools`);
        // CRITICAL FIX: Use school_id (UUID) instead of school (TEXT)
        query = query.in('no_dues_forms.school_id', testStaff.school_ids);
      }
      
      if (testStaff.course_ids && testStaff.course_ids.length > 0) {
        console.log(`   - Filtering by course_ids: ${testStaff.course_ids.length} courses`);
        // CRITICAL FIX: Use course_id (UUID) instead of course (TEXT)
        query = query.in('no_dues_forms.course_id', testStaff.course_ids);
      }
      
      if (testStaff.branch_ids && testStaff.branch_ids.length > 0) {
        console.log(`   - Filtering by branch_ids: ${testStaff.branch_ids.length} branches`);
        // CRITICAL FIX: Use branch_id (UUID) instead of branch (TEXT)
        query = query.in('no_dues_forms.branch_id', testStaff.branch_ids);
      }
    }

    const { data: testResults, error: testError } = await query.limit(10);

    if (testError) {
      console.error('   ❌ Query failed:', testError);
    } else {
      console.log(`   ✅ Query returned ${testResults.length} results`);
      if (testResults.length > 0) {
        testResults.forEach((r, i) => {
          console.log(`   ${i + 1}. ${r.no_dues_forms.student_name} (${r.no_dues_forms.registration_no})`);
        });
      } else {
        console.log('   ⚠️  No results - this is why dashboard is empty!');
      }
    }
  }
  console.log();

  // Step 5: Summary
  console.log('📊 Summary:');
  console.log(`   - Forms in database: ${forms.length}`);
  console.log(`   - Status records: ${statuses.length}`);
  console.log(`   - Staff members: ${staff.length}`);
  console.log();

  if (forms.length === 0) {
    console.log('💡 Issue: No forms have been submitted yet!');
    console.log('   Solution: Submit a test form at /student/submit-form');
  } else if (statuses.length === 0) {
    console.log('💡 Issue: Status records not created by trigger!');
    console.log('   Solution: Check if trigger is working or manually create status records');
  } else if (staff.length === 0) {
    console.log('💡 Issue: No staff accounts exist!');
    console.log('   Solution: Create staff accounts using create-department-staff.js');
  } else {
    console.log('💡 Issue: Query filtering logic mismatch!');
    console.log('   The dashboard API is likely using the wrong column names.');
    console.log('   It should filter by UUID columns (school_id, course_id, branch_id)');
    console.log('   instead of TEXT columns (school, course, branch)');
  }
  console.log();
}

// Run diagnosis
diagnose().catch(console.error);