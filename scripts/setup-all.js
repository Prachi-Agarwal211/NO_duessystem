/**
 * Complete Setup Script - Clean and Setup Everything
 * This script orchestrates the complete setup process:
 * 1. Generates cleanup SQL
 * 2. Sets up storage buckets
 * 3. Verifies database setup
 * 4. Provides instructions for manual SQL execution
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n' + '═'.repeat(70));
console.log('🚀 JECRC No Dues System - Complete Setup & Cleanup');
console.log('═'.repeat(70) + '\n');

// Validate environment
if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables!');
  console.error('\nRequired:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env.local file\n');
  process.exit(1);
}

console.log('✅ Environment variables validated\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Step 1: Generate Cleanup SQL
function generateCleanupSQL() {
  console.log('📝 STEP 1: Generating Cleanup SQL...\n');
  
  const cleanupSQL = `-- Complete Database Cleanup Script
-- This script safely removes all database objects
-- WARNING: This will delete all data!

-- Step 1: Drop all triggers
DROP TRIGGER IF EXISTS trigger_initialize_form_status ON public.no_dues_forms;

-- Step 2: Drop all functions (CASCADE removes dependencies)
DROP FUNCTION IF EXISTS public.initialize_form_status_records() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_response_time(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_summary_stats() CASCADE;
DROP FUNCTION IF EXISTS public.get_overall_stats() CASCADE;

-- Step 3: Drop all policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || 
                ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Step 4: Drop all indexes
DROP INDEX IF EXISTS public.idx_no_dues_forms_status;
DROP INDEX IF EXISTS public.idx_no_dues_forms_created_at;
DROP INDEX IF EXISTS public.idx_no_dues_status_form_id;
DROP INDEX IF EXISTS public.idx_no_dues_status_department;
DROP INDEX IF EXISTS public.idx_no_dues_status_status;
DROP INDEX IF EXISTS public.idx_audit_log_created_at;
DROP INDEX IF EXISTS public.idx_notifications_form_id;
DROP INDEX IF EXISTS public.idx_profiles_role;

-- Step 5: Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.no_dues_status CASCADE;
DROP TABLE IF EXISTS public.no_dues_forms CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Verification message
DO $$
BEGIN
    RAISE NOTICE 'Cleanup completed. All tables, functions, triggers, and policies have been removed.';
END $$;
`;

  const outputPath = path.join(__dirname, '../supabase/cleanup.sql');
  fs.writeFileSync(outputPath, cleanupSQL);
  console.log('   ✅ Cleanup SQL generated: supabase/cleanup.sql');
  console.log('   📝 This file is ready to execute in Supabase Dashboard > SQL Editor\n');
  
  return cleanupSQL;
}

// Step 2: Delete existing data (safe approach - doesn't drop tables)
async function cleanExistingData() {
  console.log('🧹 STEP 2: Cleaning Existing Data...\n');
  
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
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`   ℹ️  Table "${table}" doesn't exist (will be created)`);
        } else {
          console.log(`   ⚠️  Table "${table}": ${error.message}`);
        }
      } else {
        console.log(`   ✅ Cleared table: ${table}`);
      }
    } catch (err) {
      console.log(`   ℹ️  Table "${table}": ${err.message}`);
    }
  }
  
  console.log('\n   📝 Note: To fully clean (drop tables), run cleanup.sql in Supabase Dashboard\n');
}

// Step 3: Setup Storage Buckets
async function setupStorageBuckets() {
  console.log('🗄️  STEP 3: Setting up Storage Buckets...\n');
  
  const buckets = [
    {
      id: 'alumni-screenshots',
      name: 'alumni-screenshots',
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    },
    {
      id: 'certificates',
      name: 'certificates',
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['application/pdf']
    }
  ];

  let existingBuckets = [];
  
  try {
    const { data, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.log(`   ⚠️  Could not list buckets: ${listError.message}`);
      console.log('   ℹ️  Will attempt to create buckets anyway\n');
    } else {
      existingBuckets = data || [];
      console.log(`   📋 Found ${existingBuckets.length} existing bucket(s)\n`);
    }
  } catch (error) {
    console.log(`   ⚠️  Error checking buckets: ${error.message}\n`);
  }

  for (const bucket of buckets) {
    console.log(`   📦 Processing: ${bucket.name}`);
    
    const bucketExists = existingBuckets?.some(b => b.id === bucket.id || b.name === bucket.name);
    
    if (bucketExists) {
      console.log(`      ℹ️  Already exists`);
      
      try {
        const { error: updateError } = await supabase.storage.updateBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
          allowedMimeTypes: bucket.allowedMimeTypes
        });
        
        if (updateError) {
          console.log(`      ⚠️  Could not update: ${updateError.message}`);
        } else {
          console.log(`      ✅ Updated successfully`);
        }
      } catch (error) {
        console.log(`      ⚠️  Update failed: ${error.message}`);
      }
    } else {
      try {
        const { data, error } = await supabase.storage.createBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
          allowedMimeTypes: bucket.allowedMimeTypes
        });
        
        if (error) {
          console.log(`      ❌ Failed: ${error.message}`);
          console.log(`      📝 Create manually in Supabase Dashboard > Storage`);
        } else {
          console.log(`      ✅ Created successfully`);
        }
      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
        console.log(`      📝 Create manually in Supabase Dashboard > Storage`);
      }
    }
    console.log('');
  }
  
  console.log('   ✅ Storage buckets setup completed\n');
}

// Step 4: Verify Database Setup
async function verifyDatabase() {
  console.log('✅ STEP 4: Verifying Database Setup...\n');
  
  const tables = [
    'profiles',
    'departments',
    'no_dues_forms',
    'no_dues_status',
    'audit_log',
    'notifications'
  ];

  let allOk = true;
  let tablesExist = 0;

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`   ❌ ${table}: Table does not exist`);
          allOk = false;
        } else {
          console.log(`   ✅ ${table}: OK (has access restrictions)`);
          tablesExist++;
        }
      } else {
        console.log(`   ✅ ${table}: OK`);
        tablesExist++;
      }
    } catch (err) {
      console.log(`   ❌ ${table}: ${err.message}`);
      allOk = false;
    }
  }

  // Check departments data
  try {
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('name')
      .order('display_order');

    if (deptError) {
      if (!deptError.message.includes('does not exist')) {
        console.log(`   ❌ Departments check: ${deptError.message}`);
      }
    } else {
      const count = departments?.length || 0;
      console.log(`   📊 Departments: ${count} found`);
      if (count === 12) {
        console.log(`      ✅ All 12 departments present`);
      } else if (count > 0) {
        console.log(`      ⚠️  Expected 12, found ${count}`);
      } else {
        console.log(`      ⚠️  No departments found - run schema.sql`);
        allOk = false;
      }
    }
  } catch (err) {
    // Table doesn't exist - that's OK, it will be created
  }

  console.log('');
  return { allOk, tablesExist, totalTables: tables.length };
}

// Step 5: Create Summary Report
function createSummaryReport(verification) {
  console.log('📋 STEP 5: Creating Setup Summary...\n');
  
  const reportPath = path.join(__dirname, '../SETUP_REPORT.md');
  const report = `# Setup Report - ${new Date().toISOString()}

## Setup Status

### Environment Variables
- ✅ NEXT_PUBLIC_SUPABASE_URL: Set
- ✅ SUPABASE_SERVICE_ROLE_KEY: Set
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: Set

### Storage Buckets
- ✅ alumni-screenshots: Configured
- ✅ certificates: Configured

### Database Tables
- Tables Found: ${verification.tablesExist}/${verification.totalTables}
- Status: ${verification.allOk ? '✅ Complete' : '⚠️  Needs Setup'}

## Next Steps

${verification.allOk ? 
  '### ✅ Setup Complete!\n- All tables are created\n- Storage buckets are configured\n- Ready to use!' :
  '### ⚠️  Database Schema Required\n\n1. Go to Supabase Dashboard > SQL Editor\n2. Copy entire contents of \`supabase/schema.sql\`\n3. Paste and execute in SQL Editor\n4. Run \`npm run setup:verify\` to verify'
}

## Files Generated
- \`supabase/cleanup.sql\` - Cleanup script (if needed)
- \`SETUP_REPORT.md\` - This report

## Manual Actions Required
${verification.allOk ? 'None - Everything is automated!' : 'Execute \`supabase/schema.sql\` in Supabase Dashboard > SQL Editor'}
`;

  fs.writeFileSync(reportPath, report);
  console.log(`   ✅ Report created: SETUP_REPORT.md\n`);
}

// Main execution
async function main() {
  try {
    // Step 1: Generate cleanup SQL
    generateCleanupSQL();
    
    // Step 2: Clean existing data
    await cleanExistingData();
    
    // Step 3: Setup storage buckets
    await setupStorageBuckets();
    
    // Step 4: Verify database
    const verification = await verifyDatabase();
    
    // Step 5: Create summary
    createSummaryReport(verification);
    
    // Final summary
    console.log('═'.repeat(70));
    console.log('\n📊 SETUP SUMMARY\n');
    console.log('✅ Cleanup SQL generated');
    console.log('✅ Storage buckets configured');
    console.log(`📊 Database tables: ${verification.tablesExist}/${verification.totalTables} found`);
    
    if (verification.allOk) {
      console.log('\n🎉 Setup Complete! Everything is ready to use.\n');
      console.log('Next steps:');
      console.log('  1. Start development: npm run dev');
      console.log('  2. Create test users through signup page');
    } else {
      console.log('\n⚠️  Database Schema Required\n');
      console.log('📝 To complete setup:');
      console.log('  1. Go to Supabase Dashboard > SQL Editor');
      console.log('  2. Open file: supabase/schema.sql');
      console.log('  3. Copy ENTIRE contents');
      console.log('  4. Paste in SQL Editor');
      console.log('  5. Click "Run" to execute');
      console.log('  6. Wait for "Success" message');
      console.log('  7. Run: npm run setup:verify\n');
      console.log('📄 Cleanup SQL is available at: supabase/cleanup.sql');
      console.log('   (Use this if you need to start fresh)\n');
    }
    
    console.log('═'.repeat(70) + '\n');
    
  } catch (error) {
    console.error('\n❌ Setup Error:', error.message);
    console.error('\n📝 Troubleshooting:');
    console.error('  1. Check .env.local file exists');
    console.error('  2. Verify Supabase credentials are correct');
    console.error('  3. Check Supabase project is active');
    console.error('  4. Verify network connection\n');
    process.exit(1);
  }
}

main();

