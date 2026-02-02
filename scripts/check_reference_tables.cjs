// Check for reference tables and understand the data structure
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

async function checkReferenceTables() {
  try {
    console.log('🔍 CHECKING REFERENCE TABLES...\n');
    
    // List all tables in the database
    console.log('📋 CHECKING ALL TABLES...');
    
    // Try to get table information
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    
    if (!tablesError && tables) {
      console.log('Available tables:');
      tables.forEach(table => {
        console.log(`  ${table.table_name}`);
      });
    }
    
    // Check for common reference table names
    const possibleTables = [
      'schools', 'school', 'departments', 'department',
      'courses', 'course', 'branches', 'branch',
      'programs', 'program', 'config_schools', 'config_courses', 'config_branches'
    ];
    
    console.log('\n🔍 CHECKING POSSIBLE REFERENCE TABLES:');
    
    for (const tableName of possibleTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(3);
        
        if (!error && data && data.length > 0) {
          console.log(`✅ Found ${tableName} table:`);
          data.forEach(row => {
            console.log(`  ${JSON.stringify(row, null, 2)}`);
          });
        }
      } catch (e) {
        // Table doesn't exist, continue
      }
    }
    
    // Check if there are any other records with different IDs
    console.log('\n🔍 CHECKING FOR OTHER RECORDS WITH DIFFERENT IDs...');
    
    const { data: allRecords, error: allError } = await supabase
      .from('no_dues_forms')
      .select('school_id, course_id, branch_id, school, course, branch')
      .limit(20);
    
    if (!allError && allRecords) {
      const uniqueCombinations = {};
      
      allRecords.forEach(record => {
        const key = `${record.school_id}-${record.course_id}-${record.branch_id}`;
        if (!uniqueCombinations[key]) {
          uniqueCombinations[key] = {
            school_id: record.school_id,
            course_id: record.course_id,
            branch_id: record.branch_id,
            school: record.school,
            course: record.course,
            branch: record.branch,
            count: 0
          };
        }
        uniqueCombinations[key].count++;
      });
      
      console.log('Unique ID combinations found:');
      Object.values(uniqueCombinations).forEach(combo => {
        console.log(`  Count: ${combo.count}`);
        console.log(`  School: ${combo.school_id} (${combo.school})`);
        console.log(`  Course: ${combo.course_id} (${combo.course})`);
        console.log(`  Branch: ${combo.branch_id} (${combo.branch})`);
        console.log('---');
      });
    }
    
    // Check the CSV backup to see if it has more complete data
    console.log('\n📄 CHECKING CSV BACKUP FOR COMPLETE DATA...');
    try {
      const csvPath = path.join(__dirname, '../backups/no_dues_forms_rows.csv');
      if (fs.existsSync(csvPath)) {
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').slice(0, 6); // Header + 5 sample rows
        
        console.log('CSV Sample:');
        lines.forEach((line, index) => {
          console.log(`  ${index}: ${line.substring(0, 100)}...`);
        });
      }
    } catch (e) {
      console.log('Could not read CSV backup');
    }
    
    console.log('\n🎯 REFERENCE TABLE ANALYSIS COMPLETE!');
    
  } catch (error) {
    console.error('💥 Analysis error:', error);
  }
}

checkReferenceTables();
