// Check Supabase schema
const SUPABASE_URL = 'https://yjjcndurtjprbtvaikzs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqamNuZHVydGpwcmJ0dmFpa3pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA0NjUyMywiZXhwIjoyMDg0NjIyNTIzfQ.dEl7p4rlMz38ftav91485N0V8AY8fSbCx7gHqWD_6MY';

async function checkSchema() {
  console.log('Checking Supabase schema...\n');
  
  try {
    // First, let's try to get the table info
    console.log('1. Trying to fetch from profiles table...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Status text: ${response.statusText}`);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    // Try no_dues_forms table
    console.log('\n2. Trying to fetch from no_dues_forms table...');
    const formsResponse = await fetch(`${SUPABASE_URL}/rest/v1/no_dues_forms?select=*&limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    console.log(`Status: ${formsResponse.status}`);
    const formsData = await formsResponse.json();
    console.log('Response:', JSON.stringify(formsData.slice(0, 2), null, 2));
    
    // Check what tables exist using pg_catalog
    console.log('\n3. Checking tables via pg_catalog...');
    const tablesResponse = await fetch(`${SUPABASE_URL}/rest/v1/pg_tables?select=tablename&schemaname=public`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (tablesResponse.ok) {
      const tables = await tablesResponse.json();
      console.log('Tables:', JSON.stringify(tables, null, 2));
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkSchema();
