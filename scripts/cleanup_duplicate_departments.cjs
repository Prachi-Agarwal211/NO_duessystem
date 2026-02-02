// Clean up duplicate departments and work with existing ones
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

async function cleanupDuplicateDepartments() {
  try {
    console.log('🧹 CLEANING UP DUPLICATE DEPARTMENTS...\n');
    
    // Get all departments
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .order('display_order');
    
    if (deptError) {
      console.error('❌ Error getting departments:', deptError.message);
      return;
    }
    
    // Identify original vs duplicate departments
    const originalDepartments = [
      'school_hod',
      'library', 
      'it_department',
      'hostel',
      'accounts_department',
      'registrar',
      'alumni_association'
    ];
    
    const duplicateDepartments = departments.filter(dept => 
      !originalDepartments.includes(dept.name)
    );
    
    console.log(`Found ${duplicateDepartments.length} duplicate departments to remove:`);
    duplicateDepartments.forEach(dept => {
      console.log(`  ❌ ${dept.display_name} (${dept.name}) - ${dept.id}`);
    });
    
    // Remove duplicate departments
    if (duplicateDepartments.length > 0) {
      console.log('\n🗑️  REMOVING DUPLICATE DEPARTMENTS...');
      
      for (const dept of duplicateDepartments) {
        const { error } = await supabase
          .from('departments')
          .delete()
          .eq('id', dept.id);
        
        if (error) {
          console.error(`   ❌ Error removing ${dept.display_name}:`, error.message);
        } else {
          console.log(`   ✅ Removed ${dept.display_name}`);
        }
      }
    }
    
    // Work with original departments
    console.log('\n📋 WORKING WITH ORIGINAL DEPARTMENTS:');
    const originalDepts = departments.filter(dept => 
      originalDepartments.includes(dept.name)
    );
    
    originalDepts.forEach(dept => {
      console.log(`  ✅ ${dept.display_name} (${dept.name})`);
    });
    
    // Get configuration data
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
    
    // Update HOD department to be more specific
    console.log('\n🔧 UPDATING HOD DEPARTMENT...');
    
    const hodDept = originalDepts.find(dept => dept.name === 'school_hod');
    
    if (hodDept) {
      // HOD should see Engineering and Computer Applications (core academic)
      const coreSchools = schools.filter(school => 
        school.name.toLowerCase().includes('engineering') ||
        school.name.toLowerCase().includes('computer applications')
      );
      
      const coreCourses = courses.filter(course => 
        coreSchools.some(school => course.school_id === school.id)
      );
      
      const coreBranches = branches.filter(branch => 
        coreCourses.some(course => course.id === branch.course_id)
      );
      
      console.log(`  Core schools: ${coreSchools.length}`);
      console.log(`  Core courses: ${coreCourses.length}`);
      console.log(`  Core branches: ${coreBranches.length}`);
      
      const { error } = await supabase
        .from('departments')
        .update({
          allowed_school_ids: coreSchools.map(s => s.id),
          allowed_course_ids: coreCourses.map(c => c.id),
          allowed_branch_ids: coreBranches.map(b => b.id),
          is_school_specific: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', hodDept.id);
      
      if (error) {
        console.error('   ❌ Error updating HOD:', error.message);
      } else {
        console.log('   ✅ HOD department updated!');
      }
    }
    
    // Test final state
    console.log('\n🔍 TESTING FINAL DEPARTMENT STATE...');
    
    const { data: finalDepartments } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    console.log(`Final department count: ${finalDepartments.length}`);
    
    for (const dept of finalDepartments) {
      console.log(`\n📊 ${dept.display_name}:`);
      
      if (dept.allowed_course_ids.length === 0) {
        console.log('   Can see all students (no restrictions)');
      } else {
        const { data: deptStudents } = await supabase
          .from('no_dues_forms')
          .select('registration_no, student_name, school_id, course_id, branch_id, status')
          .in('school_id', dept.allowed_school_ids)
          .in('course_id', dept.allowed_course_ids)
          .in('branch_id', dept.allowed_branch_ids);
        
        console.log(`   Can see ${deptStudents.length} students`);
        
        // Show course breakdown for HOD
        if (dept.name === 'school_hod') {
          const courseBreakdown = {};
          deptStudents.forEach(student => {
            const course = courses.find(c => c.id === student.course_id);
            const courseName = course ? course.name : 'Unknown';
            courseBreakdown[courseName] = (courseBreakdown[courseName] || 0) + 1;
          });
          
          Object.entries(courseBreakdown).forEach(([course, count]) => {
            console.log(`     ${course}: ${count} students`);
          });
        }
      }
    }
    
    console.log('\n🎉 CLEANUP COMPLETED!');
    console.log('📊 Working with original departments only');
    console.log('📊 HOD can see Engineering and Computer Applications students');
    
  } catch (error) {
    console.error('💥 Error cleaning up departments:', error);
  }
}

cleanupDuplicateDepartments();
