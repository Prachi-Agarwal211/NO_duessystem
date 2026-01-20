// Script to fetch Supabase database schema
// Run this script locally where your .env file is accessible

import { createClient } from '@supabase/supabase-js';

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchSchema() {
  console.log('Connecting to Supabase database...');
  
  try {
    // Fetch all tables from the public schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return;
    }

    console.log('\n=== DATABASE TABLES ===');
    tables.forEach(table => {
      console.log(`• ${table.table_name}`);
    });

    console.log('\n=== TABLE SCHEMAS ===');
    
    // Fetch schema for each table
    for (const table of tables) {
      console.log(`\n--- ${table.table_name.toUpperCase()} ---`);
      
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', table.table_name)
        .order('ordinal_position');
        
      if (columnsError) {
        console.error(`Error fetching columns for ${table.table_name}:`, columnsError);
        continue;
      }
      
      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  ${col.column_name}: ${col.data_type} ${nullable}${defaultValue}`);
      });
    }

    // Fetch relationships/constraints
    console.log('\n=== RELATIONSHIPS ===');
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .in('constraint_type', ['FOREIGN KEY']);
      
    if (constraintsError) {
      console.error('Error fetching constraints:', constraintsError);
    } else {
      constraints.forEach(constraint => {
        console.log(`• ${constraint.constraint_name}: ${constraint.table_name} -> referenced table info`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Also try to fetch using Supabase's pg_meta extension if available
async function fetchWithPgMeta() {
  console.log('\n\n=== ATTEMPTING PG_META QUERY ===');
  
  try {
    // Alternative approach using raw SQL
    const { data, error } = await supabase.rpc('pg_tables');
    
    if (error) {
      console.log('pg_tables RPC not available, trying alternative methods...');
    } else {
      console.log('Tables via pg_tables:', data);
    }
  } catch (err) {
    console.log('Alternative method failed:', err.message);
  }
}

// Run the schema fetch
fetchSchema()
  .then(fetchWithPgMeta)
  .catch(console.error);