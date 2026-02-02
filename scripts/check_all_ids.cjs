// Check all actual IDs from database
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

async function checkAllIDs() {
  try {
    console.log('🔍 CHECKING ALL ACTUAL IDs FROM DATABASE...\n');
    
    // 1. Get all unique school_ids and their names
    console.log('🏫 SCHOOL IDs:');
    const { data: schools, error: schoolsError } = await supabase
      .from('no_dues_forms')
      .select('school_id, school')
      .not('school_id', 'is', null);
    
    if (schoolsError) {
      console.error('❌ Error getting schools:', schoolsError.message);
    } else {
      const uniqueSchools = {};
      schools.forEach(item => {
        if (!uniqueSchools[item.school_id]) {
          uniqueSchools[item.school_id] = item.school;
        }
      });
      
      Object.entries(uniqueSchools).forEach(([id, name]) => {
        console.log(`  ${id}: ${name}`);
      });
    }
    
    // 2. Get all unique course_ids and their names
    console.log('\n📚 COURSE IDs:');
    const { data: courses, error: coursesError } = await supabase
      .from('no_dues_forms')
      .select('course_id, course')
      .not('course_id', 'is', null);
    
    if (coursesError) {
      console.error('❌ Error getting courses:', coursesError.message);
    } else {
      const uniqueCourses = {};
      courses.forEach(item => {
        if (!uniqueCourses[item.course_id]) {
          uniqueCourses[item.course_id] = item.course;
        }
      });
      
      Object.entries(uniqueCourses).forEach(([id, name]) => {
        console.log(`  ${id}: ${name}`);
      });
    }
    
    // 3. Get all unique branch_ids and their names
    console.log('\n🌿 BRANCH IDs:');
    const { data: branches, error: branchesError } = await supabase
      .from('no_dues_forms')
      .select('branch_id, branch')
      .not('branch_id', 'is', null);
    
    if (branchesError) {
      console.error('❌ Error getting branches:', branchesError.message);
    } else {
      const uniqueBranches = {};
      branches.forEach(item => {
        if (!uniqueBranches[item.branch_id]) {
          uniqueBranches[item.branch_id] = item.branch;
        }
      });
      
      Object.entries(uniqueBranches).forEach(([id, name]) => {
        console.log(`  ${id}: ${name}`);
      });
    }
    
    // 4. Check if there are separate tables for schools/courses/branches
    console.log('\n🔍 CHECKING FOR SEPARATE REFERENCE TABLES...');
    
    // Try to get from schools table if it exists
    try {
      const { data: schoolsTable, error: schoolsTableError } = await supabase
        .from('schools')
        .select('*')
        .limit(5);
      
      if (!schoolsTableError && schoolsTable) {
        console.log('✅ Found schools table:');
        schoolsTable.forEach(school => {
          console.log(`  ${school.id}: ${school.name}`);
        });
      }
    } catch (e) {
      console.log('⚠️  No separate schools table found');
    }
    
    // Try to get from courses table if it exists
    try {
      const { data: coursesTable, error: coursesTableError } = await supabase
        .from('courses')
        .select('*')
        .limit(5);
      
      if (!coursesTableError && coursesTable) {
        console.log('✅ Found courses table:');
        coursesTable.forEach(course => {
          console.log(`  ${course.id}: ${course.name}`);
        });
      }
    } catch (e) {
      console.log('⚠️  No separate courses table found');
    }
    
    // Try to get from branches table if it exists
    try {
      const { data: branchesTable, error: branchesTableError } = await supabase
        .from('branches')
        .select('*')
        .limit(5);
      
      if (!branchesTableError && branchesTable) {
        console.log('✅ Found branches table:');
        branchesTable.forEach(branch => {
          console.log(`  ${branch.id}: ${branch.name}`);
        });
      }
    } catch (e) {
      console.log('⚠️  No separate branches table found');
    }
    
    // 5. Get complete sample records to understand the full structure
    console.log('\n📄 COMPLETE SAMPLE RECORDS:');
    const { data: samples, error: samplesError } = await supabase
      .from('no_dues_forms')
      .select('*')
      .limit(3);
    
    if (samplesError) {
      console.error('❌ Error getting samples:', samplesError.message);
    } else {
      samples.forEach((record, index) => {
        console.log(`\n📝 Sample ${index + 1}:`);
        console.log(`  Registration: ${record.registration_no}`);
        console.log(`  Name: ${record.student_name}`);
        console.log(`  School ID: ${record.school_id} (${record.school})`);
        console.log(`  Course ID: ${record.course_id} (${record.course})`);
        console.log(`  Branch ID: ${record.branch_id} (${record.branch})`);
        console.log(`  Status: ${record.status}`);
        console.log(`  Certificate: ${record.final_certificate_generated}`);
      });
    }
    
    // 6. Check what programs exist in our target list
    console.log('\n🎓 ANALYZING TARGET STUDENT PROGRAMS...');
    const completedStudents = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../completed_students.json'), 'utf8')
    );
    
    const programCounts = {};
    completedStudents.forEach(enrollmentNo => {
      const match = enrollmentNo.match(/^(\d{2})([A-Z]+)(\d+)$/);
      if (match) {
        const program = match[2];
        programCounts[program] = (programCounts[program] || 0) + 1;
      }
    });
    
    console.log('Program distribution in target students:');
    Object.entries(programCounts).forEach(([program, count]) => {
      console.log(`  ${program}: ${count} students`);
    });
    
    console.log('\n🎯 ID ANALYSIS COMPLETE!');
    console.log('Now we can create proper mappings based on actual data');
    
  } catch (error) {
    console.error('💥 Analysis error:', error);
  }
}

checkAllIDs();
