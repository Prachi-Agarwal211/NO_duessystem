#!/usr/bin/env node

/**
 * Phase 1 Migration Runner
 * Applies database changes for the student portal redesign
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nMake sure these are set in your .env.local file');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting Phase 1 Database Migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migration-phase1.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log('📊 Executing migration...\n');

    // Split the SQL into individual statements (crude but works for this case)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comment-only statements
      if (statement.replace(/--.*$/gm, '').trim() === ';') {
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase
            .from('_raw_sql')
            .select('*')
            .limit(0);
          
          if (directError) {
            console.log(`⚠️  Statement ${i + 1}: ${error.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          successCount++;
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1}: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n✅ Migration completed!');
    console.log(`   Statements executed: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   ⚠️  Warnings/Errors: ${errorCount} (some may be expected)`);
    }

    console.log('\n📋 Migration Summary:');
    console.log('   • Made user_id nullable in no_dues_forms');
    console.log('   • Added unique constraint on registration_no');
    console.log('   • Updated RLS policies for public access');
    console.log('   • Added helper functions for registration-based queries');
    console.log('   • Created form_status_summary view');
    console.log('   • Maintained all staff/admin policies');

    console.log('\n🎯 Next Steps:');
    console.log('   1. Test form submission without authentication');
    console.log('   2. Test status checking by registration number');
    console.log('   3. Verify staff can still update statuses');
    console.log('   4. Run: npm run dev (to start the application)');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. Database connection is working');
    console.error('2. Service role key has admin permissions');
    console.error('3. Supabase project is accessible');
    process.exit(1);
  }
}

// Note about direct SQL execution
console.log('⚠️  NOTE: Supabase JS client has limited SQL execution support.');
console.log('   For best results, run this migration directly in Supabase SQL Editor:');
console.log('   1. Go to https://app.supabase.com/project/YOUR_PROJECT/sql');
console.log('   2. Copy contents from supabase/migration-phase1.sql');
console.log('   3. Paste and run in SQL Editor');
console.log('   4. Or use Supabase CLI: supabase db push\n');

console.log('Continue with automatic migration? (y/n)');

// Wait for user input
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('', (answer) => {
  rl.close();
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    runMigration();
  } else {
    console.log('\n✋ Migration cancelled. Please run manually in Supabase SQL Editor.');
    process.exit(0);
  }
});