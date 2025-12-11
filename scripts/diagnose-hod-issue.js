#!/usr/bin/env node

/**
 * Diagnose why CSE HOD sees stats but no table entries
 * Check the exact filtering logic for HOD accounts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseHOD() {
  console.log('🔍 Diagnosing CSE HOD Dashboard Issue...\n');

  // Step 1: Get CSE HOD profile
  console.log('1️⃣ Fetching CSE HOD profile...');
  const { data: hodProfile, error: hodError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', '15anuragsingh2003@gmail.com')
    .single();

  if (hodError || !hodProfile) {
    console.error('   ❌ CSE HOD profile not found!');
    return;
  }

  console.log('   ✅ Found HOD profile:');
  console.log(`      Email: ${hodProfile.email}`);
  console.log(`      Name: ${hodProfile.full_name}`);
  console.log(`      Department: ${hodProfile.department_name}`);
  console.log(`      School ID (single): ${hodProfile.school_id}`);
  console.log(`      School IDs (array): ${JSON.stringify(hodProfile.school_ids)}`);
  console.log(`      Course IDs (array): ${JSON.stringify(hodProfile.course_ids)}`);
  console.log(`      Branch IDs (array): ${JSON.stringify(hodProfile.branch_ids)}`);
  console.log();

  // Step 2: Get all pending status records for school_hod
  console.log('2️⃣ Fetching ALL pending school_hod status records...');
  const { data: allHodStatuses, error: statusError } = await supabase
    .from('no_dues_status')
    .select(`
      id,
      form_id,
      department_name,
      status,
      no_dues_forms (
        id,
        student_name,
        registration_no,
        school,
        school_id,
        course,
        course_id,
        branch,
        branch_id
      )
    `)
    .eq('department_name', 'school_hod')
    .eq('status', 'pending');

  if (statusError) {
    console.error('   ❌ Error:', statusError);
    return;
  }

  console.log(`   ✅ Found ${allHodStatuses.length} pending school_hod records`);
  
  if (allHodStatuses.length > 0) {
    console.log('\n   📋 All pending students for school_hod:');
    allHodStatuses.forEach((status, i) => {
      const form = status.no_dues_forms;
      console.log(`\n   ${i + 1}. ${form.student_name} (${form.registration_no})`);
      console.log(`      School (TEXT): ${form.school}`);
      console.log(`      School (UUID): ${form.school_id}`);
      console.log(`      Course (TEXT): ${form.course}`);
      console.log(`      Course (UUID): ${form.course_id}`);
      console.log(`      Branch (TEXT): ${form.branch}`);
      console.log(`      Branch (UUID): ${form.branch_id}`);
      
      // Check if this student matches HOD's scope
      let matches = true;
      let reasons = [];
      
      if (hodProfile.school_ids && hodProfile.school_ids.length > 0) {
        if (!hodProfile.school_ids.includes(form.school_id)) {
          matches = false;
          reasons.push('School UUID mismatch');
        }
      }
      
      if (hodProfile.course_ids && hodProfile.course_ids.length > 0) {
        if (!hodProfile.course_ids.includes(form.course_id)) {
          matches = false;
          reasons.push('Course UUID mismatch');
        }
      }
      
      if (hodProfile.branch_ids && hodProfile.branch_ids.length > 0) {
        if (!hodProfile.branch_ids.includes(form.branch_id)) {
          matches = false;
          reasons.push('Branch UUID mismatch');
        }
      }
      
      if (matches) {
        console.log(`      ✅ MATCHES CSE HOD scope - should appear in dashboard`);
      } else {
        console.log(`      ❌ DOES NOT MATCH - Reasons: ${reasons.join(', ')}`);
      }
    });
  }
  console.log();

  // Step 3: Test the EXACT dashboard query
  console.log('3️⃣ Testing EXACT dashboard query (as used in API)...');
  
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
        course,
        branch,
        created_at
      )
    `)
    .eq('department_name', hodProfile.department_name)
    .eq('status', 'pending');

  console.log('   Query conditions:');
  console.log(`   - department_name = '${hodProfile.department_name}'`);
  console.log(`   - status = 'pending'`);

  // Apply HOD scope filtering
  if (hodProfile.department_name === 'school_hod') {
    if (hodProfile.school_ids && hodProfile.school_ids.length > 0) {
      console.log(`   - school_id IN [${hodProfile.school_ids.length} UUIDs]`);
      query = query.in('no_dues_forms.school_id', hodProfile.school_ids);
    }
    
    if (hodProfile.course_ids && hodProfile.course_ids.length > 0) {
      console.log(`   - course_id IN [${hodProfile.course_ids.length} UUIDs]`);
      query = query.in('no_dues_forms.course_id', hodProfile.course_ids);
    }
    
    if (hodProfile.branch_ids && hodProfile.branch_ids.length > 0) {
      console.log(`   - branch_id IN [${hodProfile.branch_ids.length} UUIDs]`);
      query = query.in('no_dues_forms.branch_id', hodProfile.branch_ids);
    }
  }

  const { data: dashboardResults, error: dashError } = await query;

  if (dashError) {
    console.error('\n   ❌ Dashboard query FAILED:', dashError);
  } else {
    console.log(`\n   ✅ Dashboard query returned: ${dashboardResults.length} results`);
    
    if (dashboardResults.length > 0) {
      console.log('\n   📋 Students that SHOULD appear in CSE HOD dashboard:');
      dashboardResults.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.no_dues_forms.student_name} (${r.no_dues_forms.registration_no})`);
      });
    } else {
      console.log('\n   ⚠️  NO RESULTS - This is why the dashboard table is empty!');
    }
  }
  console.log();

  // Step 4: Check stats query
  console.log('4️⃣ Testing stats query (shows count)...');
  const { data: statsData, error: statsError } = await supabase
    .from('no_dues_status')
    .select('id', { count: 'exact', head: true })
    .eq('department_name', 'school_hod')
    .eq('status', 'pending');

  if (statsError) {
    console.error('   ❌ Stats query failed:', statsError);
  } else {
    console.log(`   ✅ Stats query COUNT: ${statsData || 0}`);
    console.log('   Note: Stats query does NOT filter by school/course/branch!');
    console.log('   This is why stats show a number but table is empty.');
  }
  console.log();

  // Step 5: Diagnosis
  console.log('📊 DIAGNOSIS:');
  console.log('═'.repeat(60));
  
  if (hodProfile.school_ids === null || hodProfile.school_ids.length === 0) {
    console.log('❌ PROBLEM: school_ids is NULL or EMPTY!');
    console.log('   The HOD profile has no school scope defined.');
    console.log('   Solution: Update the profile with correct school_ids array.');
  } else if (hodProfile.course_ids === null || hodProfile.course_ids.length === 0) {
    console.log('❌ PROBLEM: course_ids is NULL or EMPTY!');
    console.log('   The HOD profile has no course scope defined.');
    console.log('   Solution: Update the profile with correct course_ids array.');
  } else if (hodProfile.branch_ids === null || hodProfile.branch_ids.length === 0) {
    console.log('❌ PROBLEM: branch_ids is NULL or EMPTY!');
    console.log('   The HOD profile has no branch scope defined.');
    console.log('   Solution: Update the profile with correct branch_ids array.');
  } else if (allHodStatuses.length === 0) {
    console.log('❌ PROBLEM: No pending school_hod status records!');
    console.log('   No students have submitted forms yet.');
    console.log('   Solution: Submit a test form.');
  } else {
    console.log('❌ PROBLEM: UUID mismatch between HOD scope and student data!');
    console.log('   The HOD\'s school/course/branch UUIDs don\'t match the student forms.');
    console.log('   This happens when:');
    console.log('   - Student form has different school/course/branch UUIDs');
    console.log('   - HOD profile has wrong UUIDs in arrays');
    console.log('   Solution: Check and fix the UUID arrays in HOD profile.');
  }
  console.log();
}

// Run diagnosis
diagnoseHOD().catch(console.error);