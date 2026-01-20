import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchTableDetails() {
  console.log('🔍 Fetching detailed table information...\n');

  // Get detailed info about tables with data
  const tablesToCheck = [
    'no_dues_forms',
    'config_schools', 
    'config_courses', 
    'config_branches', 
    'departments', 
    'no_dues_status', 
    'profiles'
  ];

  for (const tableName of tablesToCheck) {
    console.log(`=== ${tableName} ===`);
    
    try {
      // Get first 3 records to see data examples
      const { data: sampleData, error } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .limit(3);

      if (!error && sampleData) {
        if (sampleData.length > 0) {
          console.log(`Sample records (${sampleData.length}):`);
          sampleData.forEach((record, index) => {
            console.log(`  [${index + 1}] ${JSON.stringify(record)}`);
          });
        } else {
          console.log('Table is empty');
        }
      } else {
        console.log('Error:', error?.message);
      }
    } catch (e) {
      console.log('Exception:', e.message);
    }
    
    console.log();
  }

  // Check if config_reapplication_rules exists or if we need to create it
  console.log('=== Checking config_reapplication_rules ===');
  try {
    const { data: rulesData, error } = await supabaseAdmin
      .from('config_reapplication_rules')
      .select('*');
    
    if (error) {
      console.log('❌ Table does NOT exist -', error.message);
      console.log('ℹ️  This table should exist according to the FIXED_DATABASE_SCHEMA.sql');
    } else {
      console.log(`✅ Table exists with ${rulesData.length} records`);
      console.log('Rules:', JSON.stringify(rulesData, null, 2));
    }
  } catch (e) {
    console.log('Exception:', e.message);
  }
}

fetchTableDetails().catch(console.error);
