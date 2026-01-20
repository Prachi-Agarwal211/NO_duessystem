#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 CHECKING pg_execute_sql FUNCTION');
console.log('='.repeat(60));

async function checkPgExecuteSql() {
  try {
    // Try to call pg_execute_sql with a simple query
    const { data, error } = await supabaseAdmin.rpc('pg_execute_sql', { 
      sql: 'SELECT NOW() as current_time' 
    });
    
    if (error) {
      console.log('❌ pg_execute_sql function does not exist');
      console.log('Error:', error.message);
      
      // Try to create the function
      console.log('\n🔧 Attempting to create pg_execute_sql function...');
      
      const createFunctionSql = `
        CREATE OR REPLACE FUNCTION public.pg_execute_sql(sql text)
        RETURNS jsonb AS $$
        DECLARE
            result jsonb;
        BEGIN
            -- Execute the SQL and return result as JSON
            EXECUTE format('SELECT to_jsonb(result.*) FROM (%s) result', sql) INTO result;
            RETURN result;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        GRANT EXECUTE ON FUNCTION public.pg_execute_sql(text) TO authenticated, anon;
      `;
      
      try {
        const { error: createError } = await supabaseAdmin.rpc('pg_execute_sql', { 
          sql: createFunctionSql 
        });
        
        if (createError) {
          console.log('❌ Failed to create pg_execute_sql function');
          console.log('Error:', createError.message);
          
          // Try alternative approach using direct query
          console.log('\n🔄 Trying alternative approach...');
          
          // Let's check if we have any other way to run SQL
          const { data: tables, error: tablesError } = await supabaseAdmin
            .from('pg_catalog.pg_tables')
            .select('tablename')
            .eq('schemaname', 'public')
            .limit(5);
            
          if (tablesError) {
            console.log('❌ Error accessing system tables:', tablesError.message);
          } else {
            console.log('✅ System tables accessible');
            console.log('Sample tables:', tables.map(t => t.tablename).join(', '));
          }
        } else {
          console.log('✅ pg_execute_sql function created successfully');
          
          // Test it again
          const { data: testData, error: testError } = await supabaseAdmin.rpc('pg_execute_sql', { 
            sql: 'SELECT NOW() as current_time' 
          });
          
          if (testError) {
            console.log('❌ Test failed:', testError.message);
          } else {
            console.log('✅ Test passed:', testData);
          }
        }
      } catch (e) {
        console.log('❌ Exception creating function:', e.message);
      }
    } else {
      console.log('✅ pg_execute_sql function exists');
      console.log('Current time:', data.current_time);
    }
    
  } catch (error) {
    console.log('❌ Script error:', error.message);
    console.log('Stack:', error.stack);
  }
}

checkPgExecuteSql().catch(console.error);
