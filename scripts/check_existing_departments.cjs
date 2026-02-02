// Check existing departments and work with them, don't create duplicates
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
const envFile = path.join(__dirname, '../.env.local');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
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

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkExistingDepartments() {
  try {
    console.log('🔍 CHECKING EXISTING DEPARTMENTS IN DATABASE...\n');
    
    // Get all departments
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .order('display_order');
    
    if (deptError) {
      console.error('❌ Error getting departments:', deptError.message);
      return;
    }
    
    console.log(`Found ${departments.length} existing departments:`);
    departments.forEach(dept => {
      console.log(`\n📋 ${dept.display_name} (${dept.name})`);
      console.log(`   ID: ${dept.id}`);
      console.log(`   Email: ${dept.email}`);
      console.log(`   School-specific: ${dept.is_school_specific}`);
      console.log(`   Active: ${dept.is_active}`);
      console.log(`   Display Order: ${dept.display_order}`);
      console.log(`   Allowed Schools: ${JSON.stringify(dept.allowed_school_ids)}`);
      console.log(`   Allowed Courses: ${JSON.stringify(dept.allowed_course_ids)}`);
      console.log(`   Allowed Branches: ${JSON.stringify(dept.allowed_branch_ids)}`);
    });
    
    // Get configuration data
    console.log('\n📊 GETTING CONFIGURATION DATA...');
    
    const { data: schools } = await supabase
      .from('config_schools')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    const { data: courses } = await supabase
      .from('config_courses')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    const { data: branches } = await supabase
      .from('config_branches')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    console.log(`Available: ${schools.length} schools, ${courses.length} courses, ${branches.length} branches`);
    
    // Check what each existing department should see
    console.log('\n🎯 ANALYZING WHAT EACH DEPARTMENT SHOULD SEE:');
    
    for (const dept of departments) {
      if (!dept.is_school_specific || dept.allowed_course_ids.length === 0) {
        console.log(`\n⚠️  ${dept.display_name}: Not school-specific or no course restrictions`);
        continue;
      }
      
      console.log(`\n📊 ${dept.display_name}:`);
      
      // Get students this department can see
      const { data: deptStudents } = await supabase
        .from('no_dues_forms')
        .select('registration_no, student_name, school_id, course_id, branch_id, status')
        .in('school_id', dept.allowed_school_ids.length > 0 ? dept.allowed_school_ids : [''])
        .in('course_id', dept.allowed_course_ids.length > 0 ? dept.allowed_course_ids : [''])
        .in('branch_id', dept.allowed_branch_ids.length > 0 ? dept.allowed_branch_ids : ['']);
      
      console.log(`   Can see ${deptStudents.length} students`);
      
      // Show course breakdown
      const courseBreakdown = {};
      deptStudents.forEach(student => {
        const course = courses.find(c => c.id === student.course_id);
        const courseName = course ? course.name : 'Unknown';
        courseBreakdown[courseName] = (courseBreakdown[courseName] || 0) + 1;
      });
      
      Object.entries(courseBreakdown).forEach(([course, count]) => {
        if (count > 0) {
          console.log(`     ${course}: ${count} students`);
        }
      });
    }
    
    console.log('\n🎯 EXISTING DEPARTMENTS ANALYSIS COMPLETE!');
    console.log('Now we know exactly what departments exist and what they can see');
    
  } catch (error) {
    console.error('💥 Error checking existing departments:', error);
  }
}

checkExistingDepartments();
