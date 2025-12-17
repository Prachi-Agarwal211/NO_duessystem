#!/usr/bin/env node

/**
 * QUICK DATABASE VERIFICATION
 * Run: node scripts/quick-db-check.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 JECRC Database Verification\n');

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let issues = 0;
let passed = 0;

async function checkTable(tableName, description) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`❌ ${description} - TABLE MISSING`);
        issues++;
      } else if (error.code === '42501') {
        console.log(`⚠️  ${description} - NO RLS POLICY`);
        issues++;
      } else {
        console.log(`❌ ${description} - ERROR: ${error.message}`);
        issues++;
      }
    } else {
      console.log(`✅ ${description} - OK (${data || 0} rows)`);
      passed++;
    }
  } catch (err) {
    console.log(`❌ ${description} - FAILED: ${err.message}`);
    issues++;
  }
}

async function checkFunction(functionName, description) {
  try {
    const { data, error } = await supabase.rpc(functionName);
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log(`❌ ${description} - FUNCTION MISSING`);
        issues++;
      } else {
        console.log(`✅ ${description} - OK (but may have no data)`);
        passed++;
      }
    } else {
      console.log(`✅ ${description} - OK`);
      passed++;
      
      // Show sample data for key functions
      if (functionName === 'get_form_statistics' && data && data[0]) {
        console.log(`   📊 Sample: ${JSON.stringify(data[0])}`);
      }
    }
  } catch (err) {
    console.log(`❌ ${description} - FAILED: ${err.message}`);
    issues++;
  }
}

async function checkBuckets() {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log(`❌ Storage Buckets - ERROR: ${error.message}`);
      issues++;
      return;
    }
    
    const bucketNames = data.map(b => b.name);
    const required = ['no-dues-files', 'alumni-screenshots', 'certificates'];
    
    required.forEach(bucket => {
      if (bucketNames.includes(bucket)) {
        console.log(`✅ Bucket "${bucket}" - OK`);
        passed++;
      } else {
        console.log(`❌ Bucket "${bucket}" - MISSING`);
        issues++;
      }
    });
  } catch (err) {
    console.log(`❌ Storage Check - FAILED: ${err.message}`);
    issues++;
  }
}

async function main() {
  console.log('🔌 Checking database connection...');
  
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ DATABASE CONNECTION FAILED');
      console.log('Error:', error.message);
      console.log('\nCheck your environment variables:');
      console.log('- NEXT_PUBLIC_SUPABASE_URL');
      console.log('- SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }
    
    console.log('✅ Database connection OK\n');
  } catch (err) {
    console.log('❌ CONNECTION TEST FAILED');
    console.log('Error:', err.message);
    process.exit(1);
  }

  console.log('📋 Checking Tables:\n');
  await checkTable('no_dues_forms', 'Main Forms Table');
  await checkTable('no_dues_status', 'Department Status Table');
  await checkTable('profiles', 'User Profiles Table');
  await checkTable('departments', 'Departments Table');
  await checkTable('config_schools', 'Schools Configuration');
  await checkTable('config_courses', 'Courses Configuration');
  await checkTable('config_branches', 'Branches Configuration');
  await checkTable('convocation_eligible_students', 'Convocation Database');
  await checkTable('support_tickets', 'Support Tickets Table');

  console.log('\n🔧 Checking Functions:\n');
  await checkFunction('get_form_statistics', 'Admin Statistics Function');
  await checkFunction('get_department_workload', 'Department Workload Function');
  await checkFunction('generate_ticket_number', 'Ticket Number Generator');

  console.log('\n📦 Checking Storage:\n');
  await checkBuckets();

  console.log('\n' + '='.repeat(50));
  console.log('📊 VERIFICATION RESULTS:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${issues}`);
  
  if (issues === 0) {
    console.log('\n🎉 ALL CHECKS PASSED!');
    console.log('Database is properly configured.');
    console.log('\nNext steps:');
    console.log('1. Clear Render build cache');
    console.log('2. Redeploy application');
  } else {
    console.log('\n⚠️  ISSUES FOUND!');
    console.log(`Total issues: ${issues}`);
    console.log('\n🔧 QUICK FIX:');
    console.log('1. Run this SQL in Supabase:');
    console.log('   - Complete ULTIMATE_DATABASE_SETUP.sql');
    console.log('2. Create missing storage buckets manually');
    console.log('3. Check environment variables in Render');
  }

  console.log('\n🔗 Environment Variables Status:');
  const envVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];

  envVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: MISSING`);
    }
  });
}

main().catch(err => {
  console.error('\n💥 SCRIPT FAILED:', err.message);
  process.exit(1);
});