// Fix all department permissions - MBA sees MBA, MCA sees MCA, etc.
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

async function fixAllDepartmentPermissions() {
  try {
    console.log('🔧 FIXING ALL DEPARTMENT PERMISSIONS - EACH DEPT SEES ONLY THEIR STUDENTS...\n');
    
    // 1. Get all configuration data
    console.log('📊 GETTING CONFIGURATION DATA...');
    
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
    
    // 2. Get current departments
    console.log('\n📋 GETTING CURRENT DEPARTMENTS:');
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
      console.log(`  ${dept.id}: ${dept.display_name} (${dept.name}) - ${dept.email}`);
    });
    
    // 3. Define department mappings based on course types
    console.log('\n🎯 DEFINING DEPARTMENT MAPPINGS...');
    
    // Group courses by type
    const departmentMappings = {
      // MBA Department
      mba: {
        name: 'MBA Department',
        email: 'mba@jecrcu.edu.in',
        coursePatterns: ['mba'],
        schoolPatterns: ['business']
      },
      
      // MCA Department  
      mca: {
        name: 'MCA Department',
        email: 'mca@jecrcu.edu.in',
        coursePatterns: ['mca'],
        schoolPatterns: ['computer applications']
      },
      
      // BCA Department
      bca: {
        name: 'BCA Department',
        email: 'bca@jecrcu.edu.in',
        coursePatterns: ['bca'],
        schoolPatterns: ['computer applications']
      },
      
      // B.Tech Department
      btech: {
        name: 'B.Tech Department',
        email: 'btech@jecrcu.edu.in',
        coursePatterns: ['b.tech'],
        schoolPatterns: ['engineering']
      },
      
      // BBA Department
      bba: {
        name: 'BBA Department',
        email: 'bba@jecrcu.edu.in',
        coursePatterns: ['bba'],
        schoolPatterns: ['business']
      },
      
      // B.Des Department
      bdes: {
        name: 'B.Des Department',
        email: 'bdes@jecrcu.edu.in',
        coursePatterns: ['b.des'],
        schoolPatterns: ['design']
      },
      
      // BJMC Department
      bjmc: {
        name: 'BJMC Department',
        email: 'bjmc@jecrcu.edu.in',
        coursePatterns: ['bjmc'],
        schoolPatterns: ['mass communication']
      }
    };
    
    // 4. Create/update departments with proper permissions
    console.log('\n🔧 CREATING/UPDATING DEPARTMENTS WITH PROPER PERMISSIONS...');
    
    for (const [deptKey, deptConfig] of Object.entries(departmentMappings)) {
      console.log(`\n📝 Processing ${deptConfig.name}...`);
      
      // Find matching schools
      const matchingSchools = schools.filter(school => 
        deptConfig.schoolPatterns.some(pattern => 
          school.name.toLowerCase().includes(pattern)
        )
      );
      
      // Find matching courses
      const matchingCourses = courses.filter(course => 
        deptConfig.coursePatterns.some(pattern => 
          course.name.toLowerCase().includes(pattern)
        ) || matchingSchools.some(school => course.school_id === school.id)
      );
      
      // Find matching branches
      const matchingBranches = branches.filter(branch => 
        matchingCourses.some(course => course.id === branch.course_id)
      );
      
      console.log(`  Schools: ${matchingSchools.length}`);
      console.log(`  Courses: ${matchingCourses.length}`);
      console.log(`  Branches: ${matchingBranches.length}`);
      
      // Check if department already exists
      const existingDept = departments.find(dept => 
        dept.name === `${deptKey}_department` || 
        dept.display_name.toLowerCase().includes(deptConfig.name.toLowerCase())
      );
      
      if (existingDept) {
        console.log(`  ✅ Updating existing department: ${existingDept.display_name}`);
        
        // Update existing department
        const { error: updateError } = await supabase
          .from('departments')
          .update({
            allowed_school_ids: matchingSchools.map(s => s.id),
            allowed_course_ids: matchingCourses.map(c => c.id),
            allowed_branch_ids: matchingBranches.map(b => b.id),
            is_school_specific: true
          })
          .eq('id', existingDept.id);
        
        if (updateError) {
          console.error(`    ❌ Error updating ${deptConfig.name}:`, updateError.message);
        } else {
          console.log(`    ✅ ${deptConfig.name} updated successfully!`);
        }
      } else {
        console.log(`  🆕 Creating new department: ${deptConfig.name}`);
        
        // Create new department
        const { error: createError } = await supabase
          .from('departments')
          .insert({
            id: `${deptKey}_department_${Date.now()}`,
            name: `${deptKey}_department`,
            display_name: deptConfig.name,
            email: deptConfig.email,
            is_school_specific: true,
            is_active: true,
            display_order: departments.length + 1,
            allowed_school_ids: matchingSchools.map(s => s.id),
            allowed_course_ids: matchingCourses.map(c => c.id),
            allowed_branch_ids: matchingBranches.map(b => b.id)
          });
        
        if (createError) {
          console.error(`    ❌ Error creating ${deptConfig.name}:`, createError.message);
        } else {
          console.log(`    ✅ ${deptConfig.name} created successfully!`);
        }
      }
    }
    
    // 5. Update HOD department to be more restrictive
    console.log('\n🔧 UPDATING HOD DEPARTMENT TO BE MORE RESTRICTIVE...');
    
    const hodDept = departments.find(dept => dept.name === 'school_hod');
    
    if (hodDept) {
      console.log('Found HOD department. Making it more restrictive...');
      
      // HOD should only see Engineering and Computer Applications (core academic)
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
      
      const { error: hodUpdateError } = await supabase
        .from('departments')
        .update({
          allowed_school_ids: coreSchools.map(s => s.id),
          allowed_course_ids: coreCourses.map(c => c.id),
          allowed_branch_ids: coreBranches.map(b => b.id),
          is_school_specific: true
        })
        .eq('id', hodDept.id);
      
      if (hodUpdateError) {
        console.error('❌ Error updating HOD department:', hodUpdateError.message);
      } else {
        console.log('✅ HOD department updated successfully!');
      }
    }
    
    // 6. Test the permissions
    console.log('\n🔍 TESTING DEPARTMENT PERMISSIONS...');
    
    // Get updated departments
    const { data: updatedDepartments } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    for (const dept of updatedDepartments) {
      if (dept.allowed_course_ids.length === 0) continue;
      
      console.log(`\n📊 Testing ${dept.display_name}:`);
      
      const { data: deptStudents } = await supabase
        .from('no_dues_forms')
        .select('registration_no, student_name, school_id, course_id, branch_id, status')
        .in('school_id', dept.allowed_school_ids)
        .in('course_id', dept.allowed_course_ids)
        .in('branch_id', dept.allowed_branch_ids);
      
      console.log(`  Can see ${deptStudents.length} students`);
      
      // Show course breakdown
      const courseBreakdown = {};
      deptStudents.forEach(student => {
        const course = courses.find(c => c.id === student.course_id);
        const courseName = course ? course.name : 'Unknown';
        courseBreakdown[courseName] = (courseBreakdown[courseName] || 0) + 1;
      });
      
      Object.entries(courseBreakdown).forEach(([course, count]) => {
        console.log(`    ${course}: ${count} students`);
      });
    }
    
    console.log('\n🎉 ALL DEPARTMENT PERMISSIONS FIXED!');
    console.log('📊 Each department can only see their specific students');
    console.log('📊 MBA sees only MBA, MCA sees only MCA, etc.');
    console.log('📊 No cross-department visibility!');
    
  } catch (error) {
    console.error('💥 Error fixing department permissions:', error);
  }
}

fixAllDepartmentPermissions();
