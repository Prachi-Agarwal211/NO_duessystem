const { createClient } = require('@supabase/supabase-js');
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

async function testFeatures() {
  console.log('Testing JECRC No Dues System Features...\n');

  // Test 1: Database Connection
  console.log('1. Testing Database Connection...');
  try {
    const { data, error } = await supabase.from('departments').select('count');
    if (error) {
      console.error('   ❌ Database connection failed:', error.message);
    } else {
      console.log('   ✅ Database connection successful');
    }
  } catch (err) {
    console.error('   ❌ Database connection error:', err.message);
  }

  // Test 2: Storage Buckets
  console.log('\n2. Testing Storage Buckets...');
  const buckets = ['alumni-screenshots', 'certificates'];
  for (const bucketName of buckets) {
    try {
      const { data, error } = await supabase.storage.getBucket(bucketName);
      if (error) {
        console.error(`   ❌ Bucket '${bucketName}' not found:`, error.message);
      } else {
        console.log(`   ✅ Bucket '${bucketName}' exists`);
      }
    } catch (err) {
      console.error(`   ❌ Error checking bucket '${bucketName}':`, err.message);
    }
  }

  // Test 3: Email Service Configuration
  console.log('\n3. Testing Email Service Configuration...');
  if (process.env.RESEND_API_KEY) {
    console.log('   ✅ RESEND_API_KEY is configured');
    if (process.env.RESEND_FROM) {
      console.log('   ✅ RESEND_FROM is configured');
    } else {
      console.log('   ⚠️  RESEND_FROM not configured (using default)');
    }
  } else {
    console.log('   ❌ RESEND_API_KEY not configured');
  }

  // Test 4: Environment Variables
  console.log('\n4. Testing Environment Variables...');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RESEND_API_KEY',
    'JWT_SECRET'
  ];

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName} is configured`);
    } else {
      console.log(`   ❌ ${varName} is missing`);
    }
  }

  // Test 5: PDF Generation Library
  console.log('\n5. Testing PDF Generation Library...');
  try {
    const { jsPDF } = require('jspdf');
    const pdf = new jsPDF();
    console.log('   ✅ jsPDF library is available');
  } catch (err) {
    console.log('   ❌ jsPDF library not found:', err.message);
  }

  console.log('\n✅ Feature testing completed!');
  console.log('\nNext Steps:');
  console.log('1. Execute the database schema in Supabase Dashboard');
  console.log('2. Set up storage buckets and policies');
  console.log('3. Run the application: npm run dev');
  console.log('4. Test the full application flow');
}

testFeatures();