// Analyze HOD permissions and department filtering
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

async function analyzeHODPermissions() {
  try {
    console.log('🔍 ANALYZING HOD PERMISSIONS AND DEPARTMENT FILTERING...\n');
    
    // 1. Check departments table structure
    console.log('📋 CHECKING DEPARTMENTS TABLE:');
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .order('display_order');
    
    if (deptError) {
      console.error('❌ Error getting departments:', deptError.message);
    } else {
      console.log(`Found ${departments.length} departments:`);
      departments.forEach(dept => {
        console.log(`  ${dept.id}: ${dept.display_name} (${dept.name})`);
        console.log(`    Email: ${dept.email}`);
        console.log(`    School-specific: ${dept.is_school_specific}`);
        console.log(`    Allowed school IDs: ${JSON.stringify(dept.allowed_school_ids)}`);
        console.log(`    Allowed course IDs: ${JSON.stringify(dept.allowed_course_ids)}`);
        console.log(`    Allowed branch IDs: ${JSON.stringify(dept.allowed_branch_ids)}`);
        console.log('---');
      });
    }
    
    // 2. Find HOD department
    console.log('\n👨‍🏫 FINDING HOD DEPARTMENT:');
    const hodDept = departments.find(dept => 
      dept.name.toLowerCase().includes('hod') || 
      dept.display_name.toLowerCase().includes('hod')
    );
    
    if (hodDept) {
      console.log('✅ Found HOD department:');
      console.log(`  ID: ${hodDept.id}`);
      console.log(`  Name: ${hodDept.display_name}`);
      console.log(`  Email: ${hodDept.email}`);
      console.log(`  School-specific: ${hodDept.is_school_specific}`);
      console.log(`  Allowed schools: ${JSON.stringify(hodDept.allowed_school_ids)}`);
      console.log(`  Allowed courses: ${JSON.stringify(hodDept.allowed_course_ids)}`);
      console.log(`  Allowed branches: ${JSON.stringify(hodDept.allowed_branch_ids)}`);
    } else {
      console.log('❌ No HOD department found');
    }
    
    // 3. Check current no_dues_forms data and see what schools/courses/branches exist
    console.log('\n📊 ANALYZING CURRENT STUDENT DATA:');
    const { data: students, error: studentError } = await supabase
      .from('no_dues_forms')
      .select('registration_no, student_name, school_id, school, course_id, course, branch_id, branch, status')
      .limit(10);
    
    if (studentError) {
      console.error('❌ Error getting students:', studentError.message);
    } else {
      console.log('Sample student data:');
      students.forEach(student => {
        console.log(`  ${student.registration_no}: ${student.student_name}`);
        console.log(`    School: ${student.school_id} (${student.school})`);
        console.log(`    Course: ${student.course_id} (${student.course})`);
        console.log(`    Branch: ${student.branch_id} (${student.branch})`);
        console.log('---');
      });
    }
    
    // 4. Check what schools/courses/branches the HOD should see
    if (hodDept) {
      console.log('\n🎯 HOD SHOULD SEE:');
      
      // Get unique schools, courses, branches from allowed IDs
      const { data: schools } = await supabase
        .from('config_schools')
        .select('*')
        .in('id', hodDept.allowed_school_ids.length > 0 ? hodDept.allowed_school_ids : ['']);
      
      const { data: courses } = await supabase
        .from('config_courses')
        .select('*')
        .in('id', hodDept.allowed_course_ids.length > 0 ? hodDept.allowed_course_ids : ['']);
      
      const { data: branches } = await supabase
        .from('config_branches')
        .select('*')
        .in('id', hodDept.allowed_branch_ids.length > 0 ? hodDept.allowed_branch_ids : ['']);
      
      console.log('Allowed Schools:');
      schools.forEach(school => {
        console.log(`  ${school.id}: ${school.name}`);
      });
      
      console.log('Allowed Courses:');
      courses.forEach(course => {
        console.log(`  ${course.id}: ${course.name}`);
      });
      
      console.log('Allowed Branches:');
      branches.forEach(branch => {
        console.log(`  ${branch.id}: ${branch.name}`);
      });
      
      // 5. Test what students HOD should see
      console.log('\n🔍 TESTING HOD FILTERING:');
      
      let hodQuery = supabase
        .from('no_dues_forms')
        .select('registration_no, student_name, school_id, course_id, branch_id, status');
      
      // Apply filters if HOD is school-specific
      if (hodDept.is_school_specific && hodDept.allowed_school_ids.length > 0) {
        hodQuery = hodQuery.in('school_id', hodDept.allowed_school_ids);
      }
      
      if (hodDept.allowed_course_ids.length > 0) {
        hodQuery = hodQuery.in('course_id', hodDept.allowed_course_ids);
      }
      
      if (hodDept.allowed_branch_ids.length > 0) {
        hodQuery = hodQuery.in('branch_id', hodDept.allowed_branch_ids);
      }
      
      const { data: hodStudents, error: hodError } = await hodQuery;
      
      if (hodError) {
        console.error('❌ Error testing HOD filter:', hodError.message);
      } else {
        console.log(`HOD should see ${hodStudents.length} students:`);
        hodStudents.slice(0, 5).forEach(student => {
          console.log(`  ${student.registration_no}: ${student.student_name} (${student.status})`);
        });
      }
    }
    
    // 6. Check HOD dashboard implementation
    console.log('\n🖥️ CHECKING HOD DASHBOARD IMPLEMENTATION:');
    
    // Look for HOD dashboard files
    const hodFiles = [
      'src/app/hod/page.js',
      'src/app/hod/dashboard/page.js',
      'src/components/hod/',
      'src/hooks/useHOD.js',
      'src/lib/hodService.js'
    ];
    
    hodFiles.forEach(filePath => {
      const fullPath = path.join(__dirname, '..', filePath);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ Found: ${filePath}`);
      } else {
        console.log(`❌ Missing: ${filePath}`);
      }
    });
    
    console.log('\n🎯 HOD PERMISSIONS ANALYSIS COMPLETE!');
    console.log('Now we know exactly what the HOD should see and how to filter properly');
    
  } catch (error) {
    console.error('💥 Analysis error:', error);
  }
}

analyzeHODPermissions();
