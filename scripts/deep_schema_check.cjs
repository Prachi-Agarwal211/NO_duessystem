// Deep database schema check - what actually exists
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

async function deepSchemaCheck() {
  try {
    console.log('🔍 DEEP DATABASE SCHEMA CHECK...\n');
    
    // 1. List ALL tables in the database
    console.log('📋 LISTING ALL TABLES:');
    try {
      // Try to get table information from pg_tables
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_all_tables');
      
      if (!tablesError && tables) {
        console.log('Tables found via RPC:');
        tables.forEach(table => {
          console.log(`  ${table.table_name}`);
        });
      } else {
        console.log('❌ Could not get tables via RPC');
      }
    } catch (e) {
      console.log('⚠️  RPC method not available');
    }
    
    // Try alternative method to list tables
    console.log('\n🔍 TRYING ALTERNATIVE TABLE DISCOVERY:');
    const commonTables = [
      'no_dues_forms',
      'departments', 
      'config_schools',
      'config_courses',
      'config_branches',
      'schools',
      'courses',
      'branches',
      'users',
      'profiles',
      'applications',
      'students',
      'staff',
      'admin_users'
    ];
    
    const existingTables = [];
    
    for (const tableName of commonTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error && data !== null) {
          existingTables.push(tableName);
          console.log(`✅ ${tableName}: Accessible`);
        } else {
          console.log(`❌ ${tableName}: ${error?.message || 'Not accessible'}`);
        }
      } catch (e) {
        console.log(`❌ ${tableName}: Error - ${e.message}`);
      }
    }
    
    console.log(`\n📊 Found ${existingTables.length} accessible tables`);
    
    // 2. For each accessible table, get its structure
    console.log('\n🔍 ANALYZING TABLE STRUCTURES:');
    
    for (const tableName of existingTables) {
      console.log(`\n📋 TABLE: ${tableName}`);
      
      try {
        const { data: sample, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (sampleError) {
          console.log(`  ❌ Error: ${sampleError.message}`);
          continue;
        }
        
        if (sample && sample.length > 0) {
          const record = sample[0];
          const columns = Object.keys(record);
          
          console.log(`  📊 Columns (${columns.length}):`);
          columns.forEach((column, index) => {
            const value = record[column];
            const type = typeof value;
            const displayValue = value === null ? 'NULL' : 
                               value === '' ? 'EMPTY_STRING' :
                               typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : 
                               String(value).substring(0, 50);
            console.log(`    ${index + 1}. ${column}: ${displayValue} (${type})`);
          });
          
          // Check for relationships
          const idColumns = columns.filter(col => col.includes('_id'));
          if (idColumns.length > 0) {
            console.log(`  🔗 Potential foreign keys: ${idColumns.join(', ')}`);
          }
        }
      } catch (e) {
        console.log(`  ❌ Error analyzing ${tableName}: ${e.message}`);
      }
    }
    
    // 3. Check departments table specifically
    if (existingTables.includes('departments')) {
      console.log('\n👨‍💼 DEEP ANALYSIS OF DEPARTMENTS TABLE:');
      
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('*');
      
      if (!deptError && departments) {
        console.log(`Found ${departments.length} departments:`);
        departments.forEach((dept, index) => {
          console.log(`\n  ${index + 1}. ${dept.display_name} (${dept.name})`);
          console.log(`     ID: ${dept.id}`);
          console.log(`     Email: ${dept.email}`);
          console.log(`     School-specific: ${dept.is_school_specific}`);
          console.log(`     Active: ${dept.is_active}`);
          console.log(`     Display order: ${dept.display_order}`);
          
          // Check all fields
          Object.entries(dept).forEach(([key, value]) => {
            if (!['id', 'name', 'display_name', 'email', 'is_school_specific', 'is_active', 'display_order'].includes(key)) {
              console.log(`     ${key}: ${JSON.stringify(value)}`);
            }
          });
        });
      }
    }
    
    // 4. Check if there are any views or functions
    console.log('\n🔍 CHECKING FOR VIEWS AND FUNCTIONS:');
    
    try {
      // Try to get views
      const { data: views, error: viewsError } = await supabase
        .rpc('get_all_views');
      
      if (!viewsError && views) {
        console.log('Views found:');
        views.forEach(view => {
          console.log(`  ${view.view_name}`);
        });
      }
    } catch (e) {
      console.log('No views information available');
    }
    
    // 5. Check constraints and relationships
    console.log('\n🔗 CHECKING RELATIONSHIPS:');
    
    // Look for foreign key patterns in column names
    for (const tableName of existingTables) {
      try {
        const { data: sample, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!sampleError && sample && sample.length > 0) {
          const record = sample[0];
          const columns = Object.keys(record);
          
          const fkColumns = columns.filter(col => 
            col.endsWith('_id') && 
            col !== 'id' && 
            record[col] !== null && 
            record[col] !== ''
          );
          
          if (fkColumns.length > 0) {
            console.log(`${tableName} has potential foreign keys: ${fkColumns.join(', ')}`);
          }
        }
      } catch (e) {
        // Skip
      }
    }
    
    console.log('\n🎯 DEEP SCHEMA CHECK COMPLETE!');
    console.log('Now we have the complete picture of what actually exists in the database');
    
  } catch (error) {
    console.error('💥 Deep schema check error:', error);
  }
}

deepSchemaCheck();
