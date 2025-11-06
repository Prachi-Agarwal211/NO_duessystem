/**
 * Complete Database Reset and Setup Script
 * This script will:
 * 1. Delete all existing data
 * 2. Drop all tables, functions, triggers, and policies
 * 3. Recreate the entire database schema
 * 4. Create storage buckets
 * 5. Verify everything is working
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// SQL script to clean everything
const CLEANUP_SQL = `
-- Drop all triggers first
DROP TRIGGER IF EXISTS trigger_initialize_form_status ON public.no_dues_forms;

-- Drop all functions
DROP FUNCTION IF EXISTS initialize_form_status_records() CASCADE;
DROP FUNCTION IF EXISTS calculate_response_time(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_admin_summary_stats() CASCADE;
DROP FUNCTION IF EXISTS get_overall_stats() CASCADE;

-- Drop all tables (with CASCADE to remove dependencies)
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.no_dues_status CASCADE;
DROP TABLE IF EXISTS public.no_dues_forms CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop all policies (they should be dropped with tables, but just in case)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;
`;

async function executeSQL(sql) {
  // Since Supabase JS client doesn't support direct SQL execution,
  // we'll use the REST API for SQL execution
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // If exec_sql RPC doesn't exist, we'll need to execute via Supabase Dashboard
      // For now, return the SQL for manual execution
      return { error: 'Direct SQL execution not available. Please use Supabase Dashboard.' };
    }

    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function resetDatabase() {
  console.log('\n🔴 STEP 1: Resetting Database...\n');
  
  try {
    // Delete all data from tables (safer than dropping)
    console.log('Deleting all data from tables...');
    
    const tables = [
      'notifications',
      'audit_log',
      'no_dues_status',
      'no_dues_forms',
      'departments',
      'profiles'
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error && !error.message.includes('does not exist')) {
          console.log(`  ⚠️  Table ${table}: ${error.message}`);
        } else {
          console.log(`  ✅ Cleared table: ${table}`);
        }
      } catch (err) {
        console.log(`  ℹ️  Table ${table} doesn't exist or already empty`);
      }
    }

    console.log('\n📝 Note: Tables need to be dropped via Supabase SQL Editor');
    console.log('    Please run the CLEANUP_SQL script in Supabase Dashboard > SQL Editor');
    
    return true;
  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    return false;
  }
}

async function loadAndExecuteSchema() {
  console.log('\n📋 STEP 2: Loading Schema...\n');
  
  try {
    const schemaPath = path.join(__dirname, '../supabase/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error(`❌ Schema file not found: ${schemaPath}`);
      return false;
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Schema file loaded successfully');
    console.log(`   File size: ${(schemaSQL.length / 1024).toFixed(2)} KB`);
    
    // Save the schema to a file for manual execution
    const outputPath = path.join(__dirname, '../supabase/schema-to-execute.sql');
    fs.writeFileSync(outputPath, schemaSQL);
    console.log(`   ✅ Schema saved to: ${outputPath}`);
    console.log('\n📝 Next Step:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Copy and paste the contents of supabase/schema.sql');
    console.log('   3. Execute the SQL script');
    
    return true;
  } catch (error) {
    console.error('❌ Error loading schema:', error.message);
    return false;
  }
}

async function setupStorageBuckets() {
  console.log('\n🗄️  STEP 3: Setting up Storage Buckets...\n');
  
  const buckets = [
    {
      id: 'certificates',
      name: 'certificates',
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['application/pdf']
    },
    {
      id: 'alumni-screenshots',
      name: 'alumni-screenshots',
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    },
    {
      id: 'avatars',
      name: 'avatars',
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    }
  ];

  for (const bucket of buckets) {
    try {
      // Check if bucket exists
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.log(`  ⚠️  Could not check bucket ${bucket.name}: ${listError.message}`);
        continue;
      }

      const exists = existingBuckets?.some(b => b.id === bucket.id || b.name === bucket.name);

      if (exists) {
        console.log(`  ℹ️  Bucket ${bucket.name} already exists`);
        
        // Try to update bucket settings
        const { error: updateError } = await supabase.storage.updateBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
          allowedMimeTypes: bucket.allowedMimeTypes
        });

        if (updateError) {
          console.log(`  ⚠️  Could not update bucket ${bucket.name}: ${updateError.message}`);
        } else {
          console.log(`  ✅ Updated bucket: ${bucket.name}`);
        }
      } else {
        // Create new bucket
        const { data, error: createError } = await supabase.storage.createBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
          allowedMimeTypes: bucket.allowedMimeTypes
        });

        if (createError) {
          console.log(`  ❌ Could not create bucket ${bucket.name}: ${createError.message}`);
          console.log(`     You may need to create it manually in Supabase Dashboard > Storage`);
        } else {
          console.log(`  ✅ Created bucket: ${bucket.name}`);
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Error setting up bucket ${bucket.name}: ${error.message}`);
      console.log(`     You may need to create it manually in Supabase Dashboard > Storage`);
    }
  }
}

async function verifySetup() {
  console.log('\n✅ STEP 4: Verifying Setup...\n');
  
  try {
    // Check tables
    const tables = ['profiles', 'departments', 'no_dues_forms', 'no_dues_status', 'audit_log', 'notifications'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.log(`  ❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`  ✅ Table ${table}: OK`);
        }
      } catch (err) {
        console.log(`  ❌ Table ${table}: ${err.message}`);
      }
    }

    // Check departments data
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('name, display_name')
      .order('display_order');

    if (deptError) {
      console.log(`  ❌ Departments check failed: ${deptError.message}`);
    } else {
      console.log(`  ✅ Departments: ${departments?.length || 0} found`);
      if (departments && departments.length === 12) {
        console.log('     All 12 departments present ✓');
      } else {
        console.log('     ⚠️  Expected 12 departments, please verify');
      }
    }

    // Check storage buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.log(`  ⚠️  Could not verify storage buckets: ${bucketError.message}`);
    } else {
      const requiredBuckets = ['certificates', 'alumni-screenshots', 'avatars'];
      const existingBucketIds = buckets?.map(b => b.id) || [];
      
      for (const required of requiredBuckets) {
        if (existingBucketIds.includes(required)) {
          console.log(`  ✅ Storage bucket ${required}: OK`);
        } else {
          console.log(`  ❌ Storage bucket ${required}: Missing`);
        }
      }
    }

    console.log('\n✅ Verification complete!\n');
  } catch (error) {
    console.error('❌ Error verifying setup:', error.message);
  }
}

async function main() {
  console.log('\n🚀 JECRC No Dues System - Complete Database Reset & Setup\n');
  console.log('═'.repeat(60));
  
  console.log('\n📋 Configuration:');
  console.log(`   Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Service Key: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}\n`);

  // Step 1: Reset database
  const resetSuccess = await resetDatabase();
  if (!resetSuccess) {
    console.log('\n⚠️  Reset had issues, but continuing...\n');
  }

  // Step 2: Load schema
  await loadAndExecuteSchema();

  // Step 3: Setup storage
  await setupStorageBuckets();

  // Step 4: Verify (will only work after schema is executed)
  console.log('\n⏳ Waiting 5 seconds before verification...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  await verifySetup();

  console.log('\n' + '═'.repeat(60));
  console.log('\n📝 NEXT STEPS:');
  console.log('\n1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Copy the entire contents of: supabase/schema.sql');
  console.log('3. Paste and execute in SQL Editor');
  console.log('4. Run this script again to verify: npm run setup:verify');
  console.log('\n✨ Setup script completed!\n');
}

main().catch(console.error);

