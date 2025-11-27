// Comprehensive Admin Settings Diagnostic Script
// Run with: node test-schools-api.js
// This tests the entire flow from database to UI

// Simple test without node-fetch dependency
// We'll test the APIs directly in the browser console

const SUPABASE_URL = 'https://jfqlpyrgkvzbmolvaycz.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcWxweXJna3Z6Ym1vbHZheWN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA3MDY4NCwiZXhwIjoyMDc5NjQ2Njg0fQ.YM_BKEjpeThLFd6ZtxLV2fNww7N6mO_uz8FHZjtOBhs';

async function testDirectSupabase() {
  console.log('\n=== Testing Direct Supabase Query ===');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/config_schools?order=display_order.asc`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });
    
    const data = await response.json();
    console.log('✅ Direct Supabase query successful');
    console.log('Schools found:', data.length);
    console.log('Schools:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Direct Supabase query failed:', error.message);
  }
}

async function testLocalAPI() {
  console.log('\n=== Testing Local API Endpoint ===');
  try {
    const response = await fetch('http://localhost:3000/api/admin/config/schools');
    
    console.log('Status:', response.status);
    console.log('Headers:', response.headers.get('content-type'));
    
    const text = await response.text();
    console.log('Raw response:', text.substring(0, 500));
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = JSON.parse(text);
      console.log('✅ API returned JSON');
      console.log('Result:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ API returned non-JSON (HTML error page)');
    }
  } catch (error) {
    console.error('❌ Local API test failed:', error.message);
  }
}

async function runTests() {
  await testDirectSupabase();
  await testLocalAPI();
}

runTests();