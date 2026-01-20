// fetch_live_schema.js
// Script to fetch all table schemas from Supabase database

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

async function fetchLiveSchema() {
  try {
    console.log('Connecting to Supabase database...');

    // Get all tables from public schema
    let tables = [];
    let tablesError = null;

    try {
      // Try to use RPC if available
      const result = await supabase.rpc('get_all_tables');
      tables = result.data || [];
      tablesError = result.error || null;
    } catch (error) {
      // RPC doesn't exist, use fallback method
      console.log('get_all_tables RPC not available, using alternative method');
      tables = [];
      tablesError = null;
    }

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return;
    }

    console.log('\n=== LIVE DATABASE SCHEMA ===\n');

    // If we couldn't get tables via RPC, try querying pg_tables
    if (!tables || tables.length === 0) {
      console.log('Fetching tables via pg_catalog...');
      const { data: pgTables, error: pgError } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
        .neq('tablename', 'pg_tables');

      if (pgError) {
        console.error('Error fetching tables from pg_catalog:', pgError);
        return;
      }

      // Fetch schema for each table
      for (const table of pgTables) {
        const tableName = table.tablename;
        console.log(`\n--- Table: ${tableName} ---`);

        try {
          // Get sample data (skip RPC for column info since it's not available)
          const { data: sampleData, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(3);

          if (sampleData && sampleData.length > 0) {
            console.log('Sample data:');
            console.log(JSON.stringify(sampleData, null, 2));

            // Infer schema from sample data
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
          }

        } catch (error) {
          console.log(`Could not fetch data for ${tableName}:`, error.message);
        }
      }
    } else {
      // Process tables from RPC
      for (const table of tables) {
        console.log(`\n--- Table: ${table} ---`);

        try {
          // Get sample data
          const { data: sampleData, error: sampleError } = await supabase
            .from(table)
            .select('*')
            .limit(3);

          if (sampleData) {
            console.log('Sample data:');
            console.log(JSON.stringify(sampleData, null, 2));
          }

        } catch (error) {
          console.log(`Could not fetch data for ${table}:`, error.message);
        }
      }
    }

    console.log('\n=== SCHEMA FETCH COMPLETE ===\n');

  } catch (error) {
    console.error('Error in fetchLiveSchema:', error);
  }
}

// Run the script
fetchLiveSchema();