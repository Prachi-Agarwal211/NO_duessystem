// Deep analysis of actual Supabase database
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

async function deepDatabaseAnalysis() {
  try {
    console.log('🔍 DEEP DATABASE ANALYSIS - GETTING ACTUAL DATA...\n');
    
    // 1. List ALL tables in the database
    console.log('📋 LISTING ALL TABLES:');
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public')
        .order('table_name');
      
      if (tablesError) {
        console.error('❌ Could not access information_schema:', tablesError.message);
      } else {
        console.log('All tables found:');
        tables.forEach(table => {
          console.log(`  ${table.table_name} (${table.table_type})`);
        });
      }
    } catch (e) {
      console.log('⚠️  Could not list tables via information_schema');
    }
    
    // 2. Try to query no_dues_forms directly to see what's actually there
    console.log('\n📊 ANALYZING no_dues_forms TABLE:');
    
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting no_dues_forms:', countError.message);
      console.log('This might mean the table doesn\'t exist or we don\'t have access');
    } else {
      console.log(`✅ Total records in no_dues_forms: ${totalCount}`);
      
      if (totalCount > 0) {
        // Get sample records to see actual structure
        const { data: samples, error: samplesError } = await supabase
          .from('no_dues_forms')
          .select('*')
          .limit(3);
        
        if (samplesError) {
          console.error('❌ Error getting samples:', samplesError.message);
        } else {
          console.log('\n📄 SAMPLE RECORDS (ACTUAL STRUCTURE):');
          samples.forEach((record, index) => {
            console.log(`\n--- Sample ${index + 1} ---`);
            Object.entries(record).forEach(([key, value]) => {
              const displayValue = value === null ? 'NULL' : 
                                 value === '' ? 'EMPTY_STRING' :
                                 typeof value === 'object' ? JSON.stringify(value) : value;
              console.log(`  ${key}: ${displayValue} (${typeof value})`);
            });
          });
        }
        
        // Get all unique values for key fields
        console.log('\n🔍 ANALYZING KEY FIELDS:');
        
        // Status distribution
        const { data: statusData } = await supabase
          .from('no_dues_forms')
          .select('status');
        
        if (statusData) {
          const statusCounts = {};
          statusData.forEach(item => {
            statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
          });
          console.log('Status distribution:');
          Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
          });
        }
        
        // School IDs
        const { data: schoolData } = await supabase
          .from('no_dues_forms')
          .select('school_id, school')
          .not('school_id', 'is', null);
        
        if (schoolData && schoolData.length > 0) {
          console.log('\nSchool IDs found:');
          const uniqueSchools = {};
          schoolData.forEach(item => {
            if (!uniqueSchools[item.school_id]) {
              uniqueSchools[item.school_id] = item.school;
            }
          });
          Object.entries(uniqueSchools).forEach(([id, name]) => {
            console.log(`  ${id}: "${name}"`);
          });
        }
        
        // Course IDs
        const { data: courseData } = await supabase
          .from('no_dues_forms')
          .select('course_id, course')
          .not('course_id', 'is', null);
        
        if (courseData && courseData.length > 0) {
          console.log('\nCourse IDs found:');
          const uniqueCourses = {};
          courseData.forEach(item => {
            if (!uniqueCourses[item.course_id]) {
              uniqueCourses[item.course_id] = item.course;
            }
          });
          Object.entries(uniqueCourses).forEach(([id, name]) => {
            console.log(`  ${id}: "${name}"`);
          });
        }
        
        // Branch IDs
        const { data: branchData } = await supabase
          .from('no_dues_forms')
          .select('branch_id, branch')
          .not('branch_id', 'is', null);
        
        if (branchData && branchData.length > 0) {
          console.log('\nBranch IDs found:');
          const uniqueBranches = {};
          branchData.forEach(item => {
            if (!uniqueBranches[item.branch_id]) {
              uniqueBranches[item.branch_id] = item.branch;
            }
          });
          Object.entries(uniqueBranches).forEach(([id, name]) => {
            console.log(`  ${id}: "${name}"`);
          });
        }
      }
    }
    
    // 3. Check if our target students exist
    console.log('\n🎓 CHECKING TARGET STUDENTS:');
    const completedStudents = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../completed_students.json'), 'utf8')
    );
    
    console.log(`Checking ${completedStudents.length} target enrollment numbers...`);
    
    let foundCount = 0;
    let notFoundCount = 0;
    
    // Check first 10 to see pattern
    const sampleToCheck = completedStudents.slice(0, 10);
    
    for (const enrollmentNo of sampleToCheck) {
      const { data, error } = await supabase
        .from('no_dues_forms')
        .select('registration_no, student_name, status')
        .eq('registration_no', enrollmentNo);
      
      if (error) {
        console.log(`❌ Error checking ${enrollmentNo}: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`✅ Found ${enrollmentNo}: ${data[0].student_name} (${data[0].status})`);
        foundCount++;
      } else {
        console.log(`❌ Not found: ${enrollmentNo}`);
        notFoundCount++;
      }
    }
    
    console.log(`\nSample check: ${foundCount} found, ${notFoundCount} not found`);
    
    // 4. Check what tables we can actually access
    console.log('\n🔍 TESTING TABLE ACCESS:');
    const testTables = [
      'no_dues_forms',
      'config_schools',
      'config_courses', 
      'config_branches',
      'schools',
      'courses',
      'branches',
      'departments',
      'users',
      'profiles'
    ];
    
    for (const tableName of testTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${tableName}: ${error.message.includes('does not exist') ? 'Does not exist' : 'No access'}`);
        } else {
          console.log(`✅ ${tableName}: Accessible (${data.length} records)`);
        }
      } catch (e) {
        console.log(`❌ ${tableName}: Error - ${e.message}`);
      }
    }
    
    console.log('\n🎯 DEEP ANALYSIS COMPLETE!');
    console.log('Now we have the actual database structure and can proceed correctly.');
    
  } catch (error) {
    console.error('💥 Deep analysis error:', error);
  }
}

deepDatabaseAnalysis();
