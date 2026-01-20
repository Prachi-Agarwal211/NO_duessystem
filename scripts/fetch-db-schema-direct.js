import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchSchemaDirectly() {
  console.log('🔍 Fetching database schema directly from tables...');
  
  const importantTables = [
    'no_dues_forms',
    'config_schools', 
    'config_courses', 
    'config_branches', 
    'departments', 
    'no_dues_status', 
    'email_logs',
    'no_dues_reapplication_history',
    'config_reapplication_rules',
    'profiles',
    'support_tickets',
    'certificate_verifications'
  ];

  console.log(`Checking ${importantTables.length} important tables...\n`);

  for (const tableName of importantTables) {
    console.log(`=== ${tableName} ===`);
    
    try {
      // Try to select first row with all columns (will give us column names)
      const { data: sampleData, error } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST116') { // Table exists but is empty
          console.log('✅ Table exists (empty)');
          console.log('Columns: Could not determine - table is empty');
        } else if (error.code === 'PGRST205') { // Table does not exist
          console.log('❌ Table does NOT exist');
        } else {
          console.log('❌ Error:', error.message);
        }
      } else if (sampleData && sampleData.length > 0) {
        const columns = Object.keys(sampleData[0]);
        console.log('✅ Table exists with data');
        console.log('Columns:', columns.join(', '));
        
        // Get count of records
        const { count, error: countError } = await supabaseAdmin
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!countError) {
          console.log(`Records: ${count}`);
        }
      } else {
        console.log('✅ Table exists (empty)');
        console.log('Columns: Could not determine - table is empty');
      }
    } catch (e) {
      console.log('❌ Exception:', e.message);
    }
    
    console.log();
  }

  // Check if we can get any system info
  console.log('=== System Info ===');
  try {
    const { data: tables, error } = await supabaseAdmin
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (!error && tables) {
      console.log(`Total public tables: ${tables.length}`);
      console.log('All table names:', tables.map(t => t.tablename).join(', '));
    }
  } catch (e) {
    console.log('❌ Could not get table list from pg_catalog');
  }
}

fetchSchemaDirectly().catch(console.error);
