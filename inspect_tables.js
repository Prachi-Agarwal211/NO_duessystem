// Script to fetch actual data from known Supabase tables
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

// Known tables from the application code
const KNOWN_TABLES = [
  'no_dues_forms',
  'no_dues_status', 
  'no_dues_reapplication_history',
  'student_data',
  'profiles',
  'departments',
  'config_schools',
  'config_courses', 
  'config_branches',
  'config_emails',
  'config_validation_rules',
  'config_country_codes',
  'config_reapplication_rules',
  'certificate_verifications',
  'email_logs',
  'support_tickets'
];

async function inspectTable(tableName) {
  console.log(`\n--- INSPECTING TABLE: ${tableName} ---`);
  
  try {
    // Try to get a sample row to understand the structure
    const { data, error, count, status } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
      .is('id', null); // This will return empty but show us the column structure
      
    // If the above doesn't work, try getting actual data
    if (status === 400 || error?.message?.includes('does not exist')) {
      // Try to get the table structure by requesting a single row
      const { data: sampleRow, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
        
      if (sampleError) {
        console.log(`Error querying table ${tableName}:`, sampleError.message);
        return;
      }
      
      if (sampleRow && sampleRow.length > 0) {
        console.log('Sample row structure:');
        console.log(JSON.stringify(sampleRow[0], null, 2));
      } else {
        console.log('No data found in table, but table exists');
      }
    } else {
      // Try to get table information differently
      console.log('Attempting to get table structure...');
      
      // Get the table structure by selecting all columns individually
      // This is a workaround since Supabase doesn't expose information_schema directly
      const { error: inspectError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);  // Get no rows but check if query is valid
        
      if (!inspectError) {
        console.log(`✓ Table ${tableName} exists and is accessible`);
        
        // Try to get a sample row if possible
        const { data: sample, error: sampleErr } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (sample && sample.length > 0) {
          console.log('Sample data structure:');
          console.log(JSON.stringify(sample[0], null, 2));
        } else {
          console.log('No sample data available');
        }
      } else {
        console.log(`✗ Error accessing table ${tableName}:`, inspectError.message);
      }
    }
  } catch (error) {
    console.log(`Exception querying table ${tableName}:`, error.message);
  }
}

async function fetchSchema() {
  console.log('Fetching schema for known tables...');
  console.log('Known tables:', KNOWN_TABLES);
  
  for (const tableName of KNOWN_TABLES) {
    await inspectTable(tableName);
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`Checked ${KNOWN_TABLES.length} known tables from the application.`);
  console.log('This gives us insight into the actual database structure used by the application.');
}

// Run the schema inspection
fetchSchema().catch(console.error);