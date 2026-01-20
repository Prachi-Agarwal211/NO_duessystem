// get_core_schema.js
// Script to fetch schema for core NoDues system tables

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Initialize Supabase client - using environment variables from .env.local
// Load environment variables from .env.local file
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://trzljpcupusexterxrek.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  console.log('Please make sure you have a .env.local file with your Supabase credentials');
  console.log('Current working directory:', process.cwd());
  console.log('Looking for .env.local in:', path.resolve('.env.local'));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Core tables for NoDues system
const CORE_TABLES = [
  'forms',
  'departments',
  'staff',
  'students',
  'approvals',
  'certificates',
  'email_logs',
  'messages',
  'reapplication_requests',
  'config'
];

async function getCoreSchema() {
  try {
    console.log('Connecting to Supabase database...');
    console.log('Fetching schema for core NoDues tables...\n');

    for (const tableName of CORE_TABLES) {
      console.log(`\n=== Table: ${tableName} ===`);

      try {
        // Get sample data
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(5);

        if (sampleData && sampleData.length > 0) {
          console.log('\nSample data:');
          console.log(JSON.stringify(sampleData, null, 2));

          // Infer schema from sample data since RPC is not available
          if (sampleData.length > 0) {
            console.log('\nInferred columns:');
            const firstRow = sampleData[0];
            Object.keys(firstRow).forEach(key => {
              const value = firstRow[key];
              let type = typeof value;
              if (value === null) type = 'null';
              else if (Array.isArray(value)) type = 'array';
              else if (value instanceof Date) type = 'date';
              console.log(`  - ${key}: ${type}`);
            });
          }
        } else if (sampleError) {
          console.log('\nSample data error:', sampleError.message);
        } else {
          console.log('\nNo sample data available');
        }

      } catch (error) {
        console.log(`Error with table ${tableName}:`, error.message);
      }
    }

    console.log('\n=== CORE SCHEMA FETCH COMPLETE ===\n');

  } catch (error) {
    console.error('Error in getCoreSchema:', error);
  }
}

// Run the script
getCoreSchema();