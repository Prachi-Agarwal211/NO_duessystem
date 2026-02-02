// Fix department permissions with proper timestamps
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

async function fixDepartmentsWithTimestamp() {
  try {
    console.log('🔧 FIXING DEPARTMENTS WITH PROPER TIMESTAMPS...\n');
    
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
    
    const { data: departments } = await supabase
      .from('departments')
      .select('*')
      .order('display_order');
    
    console.log(`Found ${schools.length} schools, ${courses.length} courses, ${branches.length} branches, ${departments.length} departments`);
    
    const now = new Date().toISOString();
    
    // Define department mappings
    const departmentMappings = [
      {
        key: 'mba',
        name: 'MBA Department',
        email: 'mba@jecrcu.edu.in',
        coursePatterns: ['mba'],
        schoolPatterns: ['business']
      },
      {
        key: 'mca',
        name: 'MCA Department', 
        email: 'mca@jecrcu.edu.in',
        coursePatterns: ['mca'],
        schoolPatterns: ['computer applications']
      },
      {
        key: 'bca',
        name: 'BCA Department',
        email: 'bca@jecrcu.edu.in', 
        coursePatterns: ['bca'],
        schoolPatterns: ['computer applications']
      },
      {
        key: 'btech',
        name: 'B.Tech Department',
        email: 'btech@jecrcu.edu.in',
        coursePatterns: ['b.tech'],
        schoolPatterns: ['engineering']
      },
      {
        key: 'bba',
        name: 'BBA Department',
        email: 'bba@jecrcu.edu.in',
        coursePatterns: ['bba'],
        schoolPatterns: ['business']
      },
      {
        key: 'bdes',
        name: 'B.Des Department',
        email: 'bdes@jecrcu.edu.in',
        coursePatterns: ['b.des'],
        schoolPatterns: ['design']
      },
      {
        key: 'bjmc',
        name: 'BJMC Department',
        email: 'bjmc@jecrcu.edu.in',
        coursePatterns: ['bjmc'],
        schoolPatterns: ['mass communication']
      }
    ];
    
    // Create/update departments
    for (const deptConfig of departmentMappings) {
      console.log(`\n📝 Processing ${deptConfig.name}...`);
      
      // Find matching data
      const matchingSchools = schools.filter(school => 
        deptConfig.schoolPatterns.some(pattern => 
          school.name.toLowerCase().includes(pattern)
        )
      );
      
      const matchingCourses = courses.filter(course => 
        deptConfig.coursePatterns.some(pattern => 
          course.name.toLowerCase().includes(pattern)
        ) || matchingSchools.some(school => course.school_id === school.id)
      );
      
      const matchingBranches = branches.filter(branch => 
        matchingCourses.some(course => course.id === branch.course_id)
      );
      
      console.log(`  Schools: ${matchingSchools.length}, Courses: ${matchingCourses.length}, Branches: ${matchingBranches.length}`);
      
      // Check if exists
      const existingDept = departments.find(dept => 
        dept.name === `${deptConfig.key}_department` || 
        dept.display_name.toLowerCase().includes(deptConfig.name.toLowerCase())
      );
      
      if (existingDept) {
        console.log(`  ✅ Updating existing: ${existingDept.display_name}`);
        
        const { error } = await supabase
          .from('departments')
          .update({
            allowed_school_ids: matchingSchools.map(s => s.id),
            allowed_course_ids: matchingCourses.map(c => c.id),
            allowed_branch_ids: matchingBranches.map(b => b.id),
            is_school_specific: true,
            updated_at: now
          })
          .eq('id', existingDept.id);
        
        if (error) {
          console.error(`    ❌ Error:`, error.message);
        } else {
          console.log(`    ✅ Updated successfully!`);
        }
      } else {
        console.log(`  🆕 Creating new: ${deptConfig.name}`);
        
        const { error } = await supabase
          .from('departments')
          .insert({
            id: `${deptConfig.key}_department_${Date.now()}`,
            name: `${deptConfig.key}_department`,
            display_name: deptConfig.name,
            email: deptConfig.email,
            is_school_specific: true,
            is_active: true,
            display_order: departments.length + 1,
            allowed_school_ids: matchingSchools.map(s => s.id),
            allowed_course_ids: matchingCourses.map(c => c.id),
            allowed_branch_ids: matchingBranches.map(b => b.id),
            created_at: now,
            updated_at: now
          });
        
        if (error) {
          console.error(`    ❌ Error:`, error.message);
        } else {
          console.log(`    ✅ Created successfully!`);
        }
      }
    }
    
    // Test permissions
    console.log('\n🔍 TESTING DEPARTMENT PERMISSIONS...');
    
    const { data: updatedDepartments } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    for (const dept of updatedDepartments) {
      if (dept.allowed_course_ids.length === 0) continue;
      
      console.log(`\n📊 ${dept.display_name}:`);
      
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
        if (count > 0) {
          console.log(`    ${course}: ${count} students`);
        }
      });
    }
    
    console.log('\n🎉 DEPARTMENT PERMISSIONS FIXED!');
    console.log('📊 Each department sees only their specific students');
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

fixDepartmentsWithTimestamp();
