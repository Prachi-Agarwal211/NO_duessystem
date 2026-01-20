const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchDatabaseSchema() {
  console.log('🔍 Fetching actual database schema from Supabase...');
  console.log('Database URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  try {
    // Get all tables in public schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
      .order('table_name');

    if (tablesError) {
      console.error('❌ Error fetching tables:', tablesError);
      return;
    }

    console.log(`✅ Found ${tables.length} tables in public schema:`);
    
    // For each table, get columns, data types, and constraints
    for (const table of tables) {
      console.log(`\n=== ${table.table_name} ===`);
      
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', table.table_name)
        .order('ordinal_position');

      if (columnsError) {
        console.error('❌ Error fetching columns:', columnsError);
        continue;
      }

      console.log('Columns:');
      columns.forEach(column => {
        const nullable = column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = column.column_default ? `DEFAULT ${column.column_default}` : '';
        console.log(`- ${column.column_name}: ${column.data_type} ${nullable} ${defaultVal}`);
      });

      // Check for primary key
      const { data: constraints, error: constraintsError } = await supabase
        .from('information_schema.table_constraints')
        .select('*')
        .eq('table_schema', 'public')
        .eq('table_name', table.table_name)
        .in('constraint_type', ['PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY']);

      if (!constraintsError && constraints.length > 0) {
        console.log('\nConstraints:');
        constraints.forEach(constraint => {
          console.log(`- ${constraint.constraint_type}: ${constraint.constraint_name}`);
        });
      }
    }

    // Check the specific tables we care about
    const importantTables = ['no_dues_forms', 'config_schools', 'config_courses', 'config_branches', 'departments', 'no_dues_status'];
    console.log('\n=== Important Tables Verification ===');
    
    for (const tableName of importantTables) {
      const exists = tables.some(table => table.table_name === tableName);
      console.log(`- ${tableName}: ${exists ? '✅ Exists' : '❌ Missing'}`);
    }

    // Check for any active forms in no_dues_forms
    const { data: formCount, error: countError } = await supabase
      .from('no_dues_forms')
      .select('count', { count: 'exact', head: true });

    if (!countError) {
      console.log(`\nTotal forms in no_dues_forms: ${formCount}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fetchDatabaseSchema();
