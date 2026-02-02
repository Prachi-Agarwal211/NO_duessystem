// Fix HOD permissions properly with actual database relationships
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

async function fixHODProperly() {
  try {
    console.log('🔧 FIXING HOD PERMISSIONS PROPERLY...\n');
    
    // 1. Get all schools, courses, branches
    console.log('📊 GETTING ALL SCHOOLS:');
    const { data: schools, error: schoolsError } = await supabase
      .from('config_schools')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (schoolsError) {
      console.error('❌ Error getting schools:', schoolsError.message);
      return;
    }
    
    console.log(`Found ${schools.length} active schools:`);
    schools.forEach(school => {
      console.log(`  ${school.id}: ${school.name}`);
    });
    
    console.log('\n📚 GETTING ALL COURSES:');
    const { data: courses, error: coursesError } = await supabase
      .from('config_courses')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (coursesError) {
      console.error('❌ Error getting courses:', coursesError.message);
      return;
    }
    
    console.log(`Found ${courses.length} active courses:`);
    courses.forEach(course => {
      const school = schools.find(s => s.id === course.school_id);
      console.log(`  ${course.id}: ${course.name} (School: ${school ? school.name : 'Unknown'})`);
    });
    
    console.log('\n🌿 GETTING ALL BRANCHES:');
    const { data: branches, error: branchesError } = await supabase
      .from('config_branches')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (branchesError) {
      console.error('❌ Error getting branches:', branchesError.message);
      return;
    }
    
    console.log(`Found ${branches.length} active branches:`);
    branches.forEach(branch => {
      const course = courses.find(c => c.id === branch.course_id);
      const school = course ? schools.find(s => s.id === course.school_id) : null;
      console.log(`  ${branch.id}: ${branch.name} (Course: ${course ? course.name : 'Unknown'}, School: ${school ? school.name : 'Unknown'})`);
    });
    
    // 2. Get current HOD department
    console.log('\n👨‍🏫 GETTING HOD DEPARTMENT:');
    const { data: hodDept, error: hodError } = await supabase
      .from('departments')
      .select('*')
      .eq('name', 'school_hod')
      .single();
    
    if (hodError) {
      console.error('❌ Error getting HOD department:', hodError.message);
      return;
    }
    
    console.log('Current HOD department:');
    console.log(`  ID: ${hodDept.id}`);
    console.log(`  Name: ${hodDept.display_name}`);
    console.log(`  School-specific: ${hodDept.is_school_specific}`);
    console.log(`  Current allowed schools: ${JSON.stringify(hodDept.allowed_school_ids)}`);
    console.log(`  Current allowed courses: ${JSON.stringify(hodDept.allowed_course_ids)}`);
    console.log(`  Current allowed branches: ${JSON.stringify(hodDept.allowed_branch_ids)}`);
    
    // 3. Determine what HOD should have access to
    // HOD (Head of Department) should see all academic schools
    const academicSchools = schools.filter(school => 
      school.name.toLowerCase().includes('engineering') ||
      school.name.toLowerCase().includes('computer') ||
      school.name.toLowerCase().includes('business') ||
      school.name.toLowerCase().includes('design') ||
      school.name.toLowerCase().includes('mass communication') ||
      school.name.toLowerCase().includes('sciences')
    );
    
    const academicSchoolIds = academicSchools.map(s => s.id);
    
    // Get courses and branches for these schools
    const academicCourses = courses.filter(course => 
      academicSchoolIds.includes(course.school_id)
    );
    
    const academicBranches = branches.filter(branch => 
      academicCourses.some(course => course.id === branch.course_id)
    );
    
    console.log('\n🎯 HOD SHOULD HAVE ACCESS TO:');
    console.log(`Schools (${academicSchoolIds.length}):`);
    academicSchools.forEach(school => {
      console.log(`  ${school.id}: ${school.name}`);
    });
    
    console.log(`\nCourses (${academicCourses.length}):`);
    academicCourses.forEach(course => {
      const school = schools.find(s => s.id === course.school_id);
      console.log(`  ${course.id}: ${course.name} (School: ${school ? school.name : 'Unknown'})`);
    });
    
    console.log(`\nBranches (${academicBranches.length}):`);
    academicBranches.forEach(branch => {
      const course = courses.find(c => c.id === branch.course_id);
      const school = course ? schools.find(s => s.id === course.school_id) : null;
      console.log(`  ${branch.id}: ${branch.name} (Course: ${course ? course.name : 'Unknown'}, School: ${school ? school.name : 'Unknown'})`);
    });
    
    // 4. Update HOD department with proper permissions
    console.log('\n🔧 UPDATING HOD DEPARTMENT...');
    
    const { error: updateError } = await supabase
      .from('departments')
      .update({
        allowed_school_ids: academicSchoolIds,
        allowed_course_ids: academicCourses.map(c => c.id),
        allowed_branch_ids: academicBranches.map(b => b.id)
      })
      .eq('id', hodDept.id);
    
    if (updateError) {
      console.error('❌ Error updating HOD permissions:', updateError.message);
      return;
    }
    
    console.log('✅ HOD permissions updated successfully!');
    
    // 5. Verify the update
    console.log('\n🔍 VERIFYING UPDATED PERMISSIONS:');
    const { data: updatedHod } = await supabase
      .from('departments')
      .select('*')
      .eq('id', hodDept.id)
      .single();
    
    console.log('Updated HOD department:');
    console.log(`  Allowed schools: ${updatedHod.allowed_school_ids.length} schools`);
    console.log(`  Allowed courses: ${updatedHod.allowed_course_ids.length} courses`);
    console.log(`  Allowed branches: ${updatedHod.allowed_branch_ids.length} branches`);
    
    // 6. Test what students HOD can now see
    console.log('\n🔍 TESTING HOD FILTERING AFTER UPDATE:');
    
    const { data: hodStudents, error: hodStudentsError } = await supabase
      .from('no_dues_forms')
      .select('registration_no, student_name, school_id, course_id, branch_id, status')
      .in('school_id', updatedHod.allowed_school_ids)
      .in('course_id', updatedHod.allowed_course_ids)
      .in('branch_id', updatedHod.allowed_branch_ids);
    
    if (hodStudentsError) {
      console.error('❌ Error testing HOD filter:', hodStudentsError.message);
    } else {
      console.log(`HOD can now see ${hodStudents.length} students`);
      
      // Show status breakdown
      const statusCounts = {};
      hodStudents.forEach(student => {
        statusCounts[student.status] = (statusCounts[student.status] || 0) + 1;
      });
      
      console.log('Status breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }
    
    console.log('\n🎉 HOD PERMISSIONS FIXED!');
    console.log('📊 HOD can now only see students from their designated schools/courses/branches');
    
  } catch (error) {
    console.error('💥 Error fixing HOD permissions:', error);
  }
}

fixHODProperly();
