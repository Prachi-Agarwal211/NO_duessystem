/**
 * Database Configuration Checker
 * Verifies that all configuration tables have data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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

async function checkConfiguration() {
  console.log('\n🔍 Checking Database Configuration...\n');
  console.log('='.repeat(80));

  // Check Schools
  console.log('\n📚 SCHOOLS (config_schools)');
  console.log('-'.repeat(80));
  const { data: schools, error: schoolsError } = await supabase
    .from('config_schools')
    .select('*')
    .order('name');

  if (schoolsError) {
    console.error('❌ Error fetching schools:', schoolsError);
  } else if (!schools || schools.length === 0) {
    console.log('⚠️  NO SCHOOLS FOUND - This will cause form submission to fail!');
  } else {
    console.log(`✅ Found ${schools.length} school(s):\n`);
    schools.forEach((school, i) => {
      console.log(`${i + 1}. ${school.name}`);
      console.log(`   ID: ${school.id}`);
      console.log(`   Active: ${school.is_active ? '✅ Yes' : '❌ No'}`);
      console.log(`   Created: ${new Date(school.created_at).toLocaleDateString()}`);
      console.log('');
    });
  }

  // Check Courses
  console.log('\n📖 COURSES (config_courses)');
  console.log('-'.repeat(80));
  const { data: courses, error: coursesError } = await supabase
    .from('config_courses')
    .select('*, config_schools(name)')
    .order('name');

  if (coursesError) {
    console.error('❌ Error fetching courses:', coursesError);
  } else if (!courses || courses.length === 0) {
    console.log('⚠️  NO COURSES FOUND - This will cause form submission to fail!');
  } else {
    console.log(`✅ Found ${courses.length} course(s):\n`);
    
    // Group by school
    const coursesBySchool = {};
    courses.forEach(course => {
      const schoolName = course.config_schools?.name || 'Unknown School';
      if (!coursesBySchool[schoolName]) {
        coursesBySchool[schoolName] = [];
      }
      coursesBySchool[schoolName].push(course);
    });

    Object.entries(coursesBySchool).forEach(([schoolName, schoolCourses]) => {
      console.log(`\n  ${schoolName}:`);
      schoolCourses.forEach(course => {
        console.log(`    • ${course.name} (${course.is_active ? 'Active' : 'Inactive'})`);
      });
    });
    console.log('');
  }

  // Check Branches
  console.log('\n🌿 BRANCHES (config_branches)');
  console.log('-'.repeat(80));
  const { data: branches, error: branchesError } = await supabase
    .from('config_branches')
    .select('*')
    .order('name');

  if (branchesError) {
    console.error('❌ Error fetching branches:', branchesError);
  } else if (!branches || branches.length === 0) {
    console.log('⚠️  NO BRANCHES FOUND - This will cause form submission to fail!');
  } else {
    console.log(`✅ Found ${branches.length} branch(es)\n`);
  }

  // Check Departments
  console.log('\n🏢 DEPARTMENTS (departments)');
  console.log('-'.repeat(80));
  const { data: departments, error: deptsError } = await supabase
    .from('departments')
    .select('*')
    .order('name');

  if (deptsError) {
    console.error('❌ Error fetching departments:', deptsError);
  } else if (!departments || departments.length === 0) {
    console.log('⚠️  NO DEPARTMENTS FOUND');
  } else {
    console.log(`✅ Found ${departments.length} department(s):\n`);
    departments.forEach((dept, i) => {
      console.log(`${i + 1}. ${dept.name}`);
      console.log(`   Email: ${dept.email || 'Not set'}`);
      console.log(`   Active: ${dept.is_active ? '✅ Yes' : '❌ No'}`);
      console.log('');
    });
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const issues = [];
  if (!schools || schools.length === 0) {
    issues.push('❌ No schools configured - Students cannot submit forms');
  }
  if (!courses || courses.length === 0) {
    issues.push('❌ No courses configured - Students cannot submit forms');
  }
  if (!branches || branches.length === 0) {
    issues.push('❌ No branches configured - Students cannot submit forms');
  }
  if (!departments || departments.length === 0) {
    issues.push('⚠️  No departments configured - No staff will receive notifications');
  }

  if (issues.length > 0) {
    console.log('\n⚠️  ISSUES FOUND:\n');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('\n📝 SOLUTION:');
    console.log('  Run the database setup script or manually add configuration data');
    console.log('  in the Supabase dashboard.\n');
  } else {
    console.log('\n✅ All configuration tables have data!\n');
  }

  console.log('='.repeat(80));
}

checkConfiguration().catch(console.error);