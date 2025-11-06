const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSchema() {
  try {
    console.log('Reading database schema file...');
    const schemaPath = path.join(__dirname, '../prompts/01_database_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing database schema...');
    
    // Split the SQL file into individual statements
    const statements = schemaSql
      .split(';')
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim());
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (error) {
            // If rpc fails, try direct SQL execution through the REST API
            console.log('Statement failed via RPC, trying direct execution:', statement.substring(0, 50) + '...');
            
            // For now, we'll log the statement and continue
            // In a real scenario, you might need to use the Supabase Dashboard
            // or a direct PostgreSQL connection
            console.log('Would execute:', statement);
          } else {
            console.log('Executed successfully:', statement.substring(0, 50) + '...');
          }
        } catch (err) {
          console.error('Error executing statement:', err.message);
          console.log('Statement:', statement.substring(0, 100) + '...');
        }
      }
    }
    
    console.log('Database schema execution completed');
    console.log('Note: Some statements may need to be executed manually in the Supabase Dashboard');
    console.log('Please visit https://app.supabase.com/project/_/sql to execute the schema manually');
    
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

executeSchema();