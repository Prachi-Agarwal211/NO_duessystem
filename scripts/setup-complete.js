/**
 * Complete Setup Script
 * Orchestrates the entire setup process
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please create .env.local with:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=your_url');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConnection() {
  console.log('🔌 Checking Supabase connection...');
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error && !error.message.includes('does not exist')) {
      console.log('  ✅ Connected to Supabase');
      return true;
    }
    console.log('  ✅ Connected to Supabase (tables may not exist yet)');
    return true;
  } catch (err) {
    console.error('  ❌ Connection failed:', err.message);
    return false;
  }
}

async function createStorageBuckets() {
  console.log('\n🗄️  Creating Storage Buckets...\n');
  
  const buckets = [
    {
      id: 'certificates',
      name: 'certificates',
      public: true,
      fileSizeLimit: 10485760,
      allowedMimeTypes: ['application/pdf']
    },
    {
      id: 'alumni-screenshots',
      name: 'alumni-screenshots',
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    }
  ];

  for (const bucket of buckets) {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      const exists = buckets?.some(b => b.id === bucket.id);

      if (exists) {
        console.log(`  ℹ️  Bucket "${bucket.id}" already exists`);
      } else {
        const { data, error } = await supabase.storage.createBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
          allowedMimeTypes: bucket.allowedMimeTypes
        });

        if (error) {
          console.log(`  ⚠️  Bucket "${bucket.id}": ${error.message}`);
          console.log(`     Create manually in Supabase Dashboard > Storage`);
        } else {
          console.log(`  ✅ Created bucket: ${bucket.id}`);
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Error with bucket "${bucket.id}": ${error.message}`);
    }
  }
}

async function verifyDatabase() {
  console.log('\n✅ Verifying Database Setup...\n');

  const tables = [
    'profiles',
    'departments',
    'no_dues_forms',
    'no_dues_status',
    'audit_log',
    'notifications'
  ];

  let allOk = true;

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`  ❌ ${table}: ${error.message}`);
        allOk = false;
      } else {
        console.log(`  ✅ ${table}: OK`);
      }
    } catch (err) {
      console.log(`  ❌ ${table}: ${err.message}`);
      allOk = false;
    }
  }

  // Check departments
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('name')
    .order('display_order');

  if (deptError) {
    console.log(`  ❌ Departments: ${deptError.message}`);
    allOk = false;
  } else {
    const count = departments?.length || 0;
    console.log(`  ✅ Departments: ${count} found`);
    if (count === 12) {
      console.log('     All 12 departments present ✓');
    } else {
      console.log(`     ⚠️  Expected 12, found ${count}`);
      allOk = false;
    }
  }

  return allOk;
}

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('🚀 JECRC No Dues System - Complete Setup');
  console.log('═'.repeat(70) + '\n');

  // Check connection
  const connected = await checkConnection();
  if (!connected) {
    console.error('\n❌ Cannot proceed without database connection');
    process.exit(1);
  }

  // Create storage buckets
  await createStorageBuckets();

  // Verify database
  const dbOk = await verifyDatabase();

  console.log('\n' + '═'.repeat(70));
  
  if (dbOk) {
    console.log('\n✅ Setup verification complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. If tables are missing, run schema.sql in Supabase Dashboard');
    console.log('   2. Test the application: npm run dev');
    console.log('   3. Create test users through the signup page\n');
  } else {
    console.log('\n⚠️  Database setup incomplete!');
    console.log('\n📝 Please:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Copy and execute: supabase/schema.sql');
    console.log('   3. Run this script again: npm run setup:verify\n');
  }
}

main().catch(console.error);

