import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log('Checking form data...\n');

  // Check all forms
  const { data: forms, error: formError } = await supabase
    .from('no_dues_forms')
    .select('id, registration_no, student_name, course, course_id, branch, branch_id, admission_year, passing_year')
    .limit(5);

  if (formError) {
    console.log('Form Error:', formError);
    return;
  }

  console.log('=== NO_DUES_FORMS Sample Data ===');
  forms.forEach(f => {
    console.log(`Reg: ${f.registration_no}, Name: ${f.student_name}`);
    console.log(`  Course: "${f.course}" (ID: ${f.course_id})`);
    console.log(`  Branch: "${f.branch}" (ID: ${f.branch_id})`);
    console.log('---');
  });

  // Check config_courses
  const { data: courses, error: courseError } = await supabase
    .from('config_courses')
    .select('id, name')
    .limit(5);

  if (courseError) {
    console.log('Course Error:', courseError);
  } else {
    console.log('\n=== CONFIG_COURSES Sample Data ===');
    courses.forEach(c => {
      console.log(`ID: ${c.id}, Name: ${c.name}`);
    });
  }

  // Check config_branches
  const { data: branches, error: branchError } = await supabase
    .from('config_branches')
    .select('id, name, course_id')
    .limit(5);

  if (branchError) {
    console.log('Branch Error:', branchError);
  } else {
    console.log('\n=== CONFIG_BRANCHES Sample Data ===');
    branches.forEach(b => {
      console.log(`ID: ${b.id}, Name: ${b.name}, CourseID: ${b.course_id}`);
    });
  }

  // Check student_data
  const { data: students, error: studentError } = await supabase
    .from('student_data')
    .select('registration_no, student_name, course, course_id, branch, branch_id')
    .limit(5);

  if (studentError) {
    console.log('Student Error:', studentError);
  } else {
    console.log('\n=== STUDENT_DATA Sample Data ===');
    students.forEach(s => {
      console.log(`Reg: ${s.registration_no}, Name: ${s.student_name}`);
      console.log(`  Course: "${s.course}" (ID: ${s.course_id})`);
      console.log(`  Branch: "${s.branch}" (ID: ${s.branch_id})`);
      console.log('---');
    });
  }
}

checkData().catch(console.error);
