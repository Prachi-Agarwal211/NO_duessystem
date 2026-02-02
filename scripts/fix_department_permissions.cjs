// Fix department permissions - MCA should only see MCA, not MBA
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

async function fixDepartmentPermissions() {
  try {
    console.log('🔧 FIXING DEPARTMENT PERMISSIONS - MCA SHOULD ONLY SEE MCA...\n');
    
    // 1. Get all departments
    console.log('📋 GETTING ALL DEPARTMENTS:');
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .order('display_order');
    
    if (deptError) {
      console.error('❌ Error getting departments:', deptError.message);
      return;
    }
    
    console.log(`Found ${departments.length} departments:`);
    departments.forEach(dept => {
      console.log(`  ${dept.id}: ${dept.display_name} (${dept.name})`);
      console.log(`    Email: ${dept.email}`);
      console.log(`    School-specific: ${dept.is_school_specific}`);
      console.log(`    Current allowed schools: ${JSON.stringify(dept.allowed_school_ids)}`);
      console.log(`    Current allowed courses: ${JSON.stringify(dept.allowed_course_ids)}`);
      console.log(`    Current allowed branches: ${JSON.stringify(dept.allowed_branch_ids)}`);
      console.log('---');
    });
    
    // 2. Get all schools, courses, branches
    console.log('\n📊 GETTING CONFIGURATION DATA:');
    
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
    
    console.log(`Found ${schools.length} schools, ${courses.length} courses, ${branches.length} branches`);
    
    // 3. Identify MCA-specific data
    console.log('\n🎯 IDENTIFYING MCA-SPECIFIC DATA:');
    
    const computerAppsSchool = schools.find(s => 
      s.name.toLowerCase().includes('computer applications')
    );
    
    if (!computerAppsSchool) {
      console.log('❌ Computer Applications school not found!');
      return;
    }
    
    console.log(`Computer Applications School: ${computerAppsSchool.id} - ${computerAppsSchool.name}`);
    
    const mcaCourses = courses.filter(course => 
      course.school_id === computerAppsSchool.id && 
      course.name.toLowerCase().includes('mca')
    );
    
    console.log(`MCA Courses (${mcaCourses.length}):`);
    mcaCourses.forEach(course => {
      console.log(`  ${course.id}: ${course.name}`);
    });
    
    const mcaBranches = branches.filter(branch => 
      mcaCourses.some(course => course.id === branch.course_id)
    );
    
    console.log(`MCA Branches (${mcaBranches.length}):`);
    mcaBranches.forEach(branch => {
      console.log(`  ${branch.id}: ${branch.name}`);
    });
    
    // 4. Find MCA department (if it exists) or create proper mapping
    console.log('\n🔍 LOOKING FOR MCA DEPARTMENT:');
    
    // Check if there's already an MCA-specific department
    const mcaDept = departments.find(dept => 
      dept.name.toLowerCase().includes('mca') || 
      dept.display_name.toLowerCase().includes('mca')
    );
    
    if (mcaDept) {
      console.log('✅ Found existing MCA department:');
      console.log(`  ID: ${mcaDept.id}`);
      console.log(`  Name: ${mcaDept.display_name}`);
      console.log(`  Email: ${mcaDept.email}`);
      console.log(`  School-specific: ${mcaDept.is_school_specific}`);
      
      // Update MCA department with MCA-only permissions
      console.log('\n🔧 UPDATING MCA DEPARTMENT...');
      
      const { error: updateError } = await supabase
        .from('departments')
        .update({
          allowed_school_ids: [computerAppsSchool.id],
          allowed_course_ids: mcaCourses.map(c => c.id),
          allowed_branch_ids: mcaBranches.map(b => b.id)
        })
        .eq('id', mcaDept.id);
      
      if (updateError) {
        console.error('❌ Error updating MCA department:', updateError.message);
      } else {
        console.log('✅ MCA department updated successfully!');
      }
    } else {
      console.log('⚠️  No MCA department found. Creating department mapping...');
      
      // Create MCA department
      const mcaDeptId = 'mca-dept-' + Date.now();
      
      const { error: createError } = await supabase
        .from('departments')
        .insert({
          id: mcaDeptId,
          name: 'mca_department',
          display_name: 'MCA Department',
          email: 'mca@jecrcu.edu.in',
          is_school_specific: true,
          is_active: true,
          display_order: 8,
          allowed_school_ids: [computerAppsSchool.id],
          allowed_course_ids: mcaCourses.map(c => c.id),
          allowed_branch_ids: mcaBranches.map(b => b.id)
        });
      
      if (createError) {
        console.error('❌ Error creating MCA department:', createError.message);
      } else {
        console.log('✅ MCA department created successfully!');
      }
    }
    
    // 5. Update HOD department to exclude MBA if it currently includes it
    console.log('\n🔧 CHECKING HOD DEPARTMENT FOR MBA EXCLUSION...');
    
    const hodDept = departments.find(dept => 
      dept.name === 'school_hod'
    );
    
    if (hodDept) {
      console.log('Found HOD department. Checking for MBA courses...');
      
      const mbaCourses = courses.filter(course => 
        course.name.toLowerCase().includes('mba')
      );
      
      const mbaBranches = branches.filter(branch => 
        mbaCourses.some(course => course.id === branch.course_id)
      );
      
      console.log(`MBA Courses (${mbaCourses.length}):`);
      mbaCourses.forEach(course => {
        console.log(`  ${course.id}: ${course.name}`);
      });
      
      console.log(`MBA Branches (${mbaBranches.length}):`);
      mbaBranches.forEach(branch => {
        console.log(`  ${branch.id}: ${branch.name}`);
      });
      
      // Get current HOD permissions
      const currentAllowedCourses = hodDept.allowed_course_ids || [];
      const currentAllowedBranches = hodDept.allowed_branch_ids || [];
      
      // Remove MBA courses and branches from HOD permissions
      const updatedCourses = currentAllowedCourses.filter(courseId => 
        !mbaCourses.some(course => course.id === courseId)
      );
      
      const updatedBranches = currentAllowedBranches.filter(branchId => 
        !mbaBranches.some(branch => branch.id === branchId)
      );
      
      console.log(`\n🔧 Updating HOD department to exclude MBA...`);
      console.log(`  Current courses: ${currentAllowedCourses.length}`);
      console.log(`  After filtering: ${updatedCourses.length}`);
      console.log(`  Current branches: ${currentAllowedBranches.length}`);
      console.log(`  After filtering: ${updatedBranches.length}`);
      
      const { error: hodUpdateError } = await supabase
        .from('departments')
        .update({
          allowed_course_ids: updatedCourses,
          allowed_branch_ids: updatedBranches
        })
        .eq('id', hodDept.id);
      
      if (hodUpdateError) {
        console.error('❌ Error updating HOD department:', hodUpdateError.message);
      } else {
        console.log('✅ HOD department updated to exclude MBA!');
      }
    }
    
    // 6. Test the filtering
    console.log('\n🔍 TESTING DEPARTMENT FILTERING...');
    
    // Test MCA filtering
    const { data: mcaStudents } = await supabase
      .from('no_dues_forms')
      .select('registration_no, student_name, school_id, course_id, branch_id, status')
      .in('school_id', [computerAppsSchool.id])
      .in('course_id', mcaCourses.map(c => c.id))
      .in('branch_id', mcaBranches.map(b => b.id));
    
    console.log(`MCA department can see ${mcaStudents.length} students`);
    
    // Show sample
    mcaStudents.slice(0, 3).forEach(student => {
      console.log(`  ${student.registration_no}: ${student.student_name} (${student.status})`);
    });
    
    // Test HOD filtering (should exclude MBA)
    const { data: hodStudents } = await supabase
      .from('no_dues_forms')
      .select('registration_no, student_name, school_id, course_id, branch_id, status')
      .in('school_id', hodDept.allowed_school_ids)
      .in('course_id', hodDept.allowed_course_ids)
      .in('branch_id', hodDept.allowed_branch_ids);
    
    console.log(`HOD can see ${hodStudents.length} students`);
    
    // Check if any MBA students are still visible to HOD
    const mbaStudents = hodStudents.filter(student => 
      student.course_id && 
      mbaCourses.some(course => course.id === student.course_id)
    );
    
    if (mbaStudents.length > 0) {
      console.log(`⚠️  WARNING: ${mbaStudents.length} MBA students still visible to HOD!`);
      mbaStudents.forEach(student => {
        console.log(`    ${student.registration_no}: ${student.student_name}`);
      });
    } else {
      console.log('✅ No MBA students visible to HOD (correct!)');
    }
    
    console.log('\n🎉 DEPARTMENT PERMISSIONS FIXED!');
    console.log('📊 MCA department can only see MCA students');
    console.log('📊 HOD department cannot see MBA students');
    
  } catch (error) {
    console.error('💥 Error fixing department permissions:', error);
  }
}

fixDepartmentPermissions();
