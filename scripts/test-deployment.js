#!/usr/bin/env node

/**
 * JECRC No Dues System - Automated Deployment Testing
 * 
 * This script runs comprehensive tests on your deployed system:
 * 1. Tests API endpoints
 * 2. Tests database connectivity
 * 3. Tests storage buckets
 * 4. Tests authentication
 * 5. Generates detailed report
 * 
 * Prerequisites:
 * - Deployed application (Render or local)
 * - Environment variables configured
 * 
 * Usage:
 *   node scripts/test-deployment.js
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  test: (msg) => console.log(`${colors.cyan}TEST${colors.reset} ${msg}`),
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function addTest(name, status, message = '') {
  results.tests.push({ name, status, message });
  if (status === 'pass') results.passed++;
  else if (status === 'fail') results.failed++;
  else if (status === 'warning') results.warnings++;
}

// Test functions
async function testSupabaseConnection(supabase) {
  log.test('Testing Supabase connection...');
  try {
    const { data, error } = await supabase.from('departments').select('count').limit(1);
    if (error) throw error;
    log.success('Supabase connection successful');
    addTest('Supabase Connection', 'pass');
    return true;
  } catch (error) {
    log.error(`Supabase connection failed: ${error.message}`);
    addTest('Supabase Connection', 'fail', error.message);
    return false;
  }
}

async function testDatabaseTables(supabase) {
  log.test('Testing database tables...');
  
  const tables = [
    { name: 'departments', expectedCount: 10 },
    { name: 'config_schools', expectedCount: 13 },
    { name: 'config_branches', minCount: 139 },
    { name: 'profiles', minCount: 0 },
    { name: 'no_dues_forms', minCount: 0 }
  ];

  let allPassed = true;
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      
      const expected = table.expectedCount || table.minCount;
      const condition = table.expectedCount ? count === expected : count >= expected;
      
      if (condition) {
        log.success(`Table '${table.name}': ${count} rows`);
        addTest(`Table: ${table.name}`, 'pass', `${count} rows`);
      } else {
        log.error(`Table '${table.name}': Expected ${table.expectedCount ? '=' : '>='} ${expected}, got ${count}`);
        addTest(`Table: ${table.name}`, 'fail', `Expected ${expected}, got ${count}`);
        allPassed = false;
      }
    } catch (error) {
      log.error(`Table '${table.name}' error: ${error.message}`);
      addTest(`Table: ${table.name}`, 'fail', error.message);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function testStorageBuckets(supabase) {
  log.test('Testing storage buckets...');
  
  const expectedBuckets = ['no-dues-files', 'alumni-screenshots', 'certificates'];
  let allPassed = true;
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) throw error;
    
    for (const bucketName of expectedBuckets) {
      const bucket = buckets.find(b => b.name === bucketName);
      
      if (bucket) {
        log.success(`Bucket '${bucketName}' exists (${bucket.public ? 'public' : 'private'})`);
        addTest(`Bucket: ${bucketName}`, 'pass', bucket.public ? 'public' : 'private');
      } else {
        log.error(`Bucket '${bucketName}' not found`);
        addTest(`Bucket: ${bucketName}`, 'fail', 'Not found');
        allPassed = false;
      }
    }
  } catch (error) {
    log.error(`Storage bucket test failed: ${error.message}`);
    addTest('Storage Buckets', 'fail', error.message);
    return false;
  }
  
  return allPassed;
}

async function testDatabaseFunctions(supabase) {
  log.test('Testing database functions...');
  
  const functions = [
    { name: 'get_form_statistics', test: async () => {
      const { data, error } = await supabase.rpc('get_form_statistics');
      return { success: !error, data, error };
    }},
    { name: 'get_department_workload', test: async () => {
      const { data, error } = await supabase.rpc('get_department_workload');
      return { success: !error, data, error };
    }},
    { name: 'get_manual_entry_statistics', test: async () => {
      const { data, error } = await supabase.rpc('get_manual_entry_statistics');
      return { success: !error, data, error };
    }}
  ];

  let allPassed = true;
  
  for (const func of functions) {
    try {
      const result = await func.test();
      
      if (result.success) {
        log.success(`Function '${func.name}' working`);
        addTest(`Function: ${func.name}`, 'pass');
      } else {
        log.error(`Function '${func.name}' failed: ${result.error?.message}`);
        addTest(`Function: ${func.name}`, 'fail', result.error?.message);
        allPassed = false;
      }
    } catch (error) {
      log.error(`Function '${func.name}' error: ${error.message}`);
      addTest(`Function: ${func.name}`, 'fail', error.message);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function testAdminAccount(supabase) {
  log.test('Testing admin account...');
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .limit(1);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      log.success(`Admin account exists: ${data[0].email}`);
      addTest('Admin Account', 'pass', data[0].email);
      return true;
    } else {
      log.warning('No admin account found');
      addTest('Admin Account', 'warning', 'No admin account found');
      return false;
    }
  } catch (error) {
    log.error(`Admin account test failed: ${error.message}`);
    addTest('Admin Account', 'fail', error.message);
    return false;
  }
}

async function testAPIEndpoint(url) {
  log.test(`Testing API endpoint: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const isOk = response.ok || response.status === 401; // 401 is OK for protected routes
    
    if (isOk) {
      log.success(`API endpoint responded: ${response.status}`);
      addTest(`API: ${url}`, 'pass', `Status: ${response.status}`);
      return true;
    } else {
      log.error(`API endpoint failed: ${response.status}`);
      addTest(`API: ${url}`, 'fail', `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    log.error(`API endpoint error: ${error.message}`);
    addTest(`API: ${url}`, 'fail', error.message);
    return false;
  }
}

function generateReport() {
  const total = results.passed + results.failed + results.warnings;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════════╗
║              DEPLOYMENT TEST REPORT                           ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.green}✓ Passed:   ${results.passed}${colors.reset}
${colors.red}✗ Failed:   ${results.failed}${colors.reset}
${colors.yellow}⚠ Warnings: ${results.warnings}${colors.reset}
${colors.blue}━ Total:    ${total}${colors.reset}

Pass Rate: ${passRate >= 80 ? colors.green : colors.red}${passRate}%${colors.reset}

Detailed Results:
─────────────────────────────────────────────────────────────────
`);

  results.tests.forEach((test, index) => {
    const icon = test.status === 'pass' ? '✓' : test.status === 'fail' ? '✗' : '⚠';
    const color = test.status === 'pass' ? colors.green : test.status === 'fail' ? colors.red : colors.yellow;
    console.log(`${color}${icon}${colors.reset} ${test.name}${test.message ? ` - ${test.message}` : ''}`);
  });

  console.log(`
─────────────────────────────────────────────────────────────────
`);

  if (results.failed === 0) {
    console.log(`${colors.green}🎉 All critical tests passed! Your deployment is ready for production.${colors.reset}`);
  } else if (results.failed <= 2) {
    console.log(`${colors.yellow}⚠ Some tests failed. Review the issues above and fix them.${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Multiple tests failed. Your deployment needs attention before going live.${colors.reset}`);
  }
  
  console.log();
}

// Main test runner
async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  JECRC No Dues System - Deployment Testing                   ║
║  Running comprehensive tests on your deployment...            ║
╚════════════════════════════════════════════════════════════════╝
  `);

  try {
    // Get credentials
    log.info('Gathering test configuration...\n');
    
    const supabaseUrl = await question('Enter your Supabase URL: ');
    const supabaseKey = await question('Enter your Supabase Anon Key: ');
    const appUrl = await question('Enter your App URL (e.g., https://your-app.onrender.com): ');
    
    if (!supabaseUrl || !supabaseKey) {
      log.error('Supabase credentials are required!');
      process.exit(1);
    }

    console.log('\n' + colors.cyan + '━'.repeat(64) + colors.reset);
    console.log(colors.cyan + 'Starting tests...' + colors.reset);
    console.log(colors.cyan + '━'.repeat(64) + colors.reset + '\n');

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Run tests
    await testSupabaseConnection(supabase);
    await testDatabaseTables(supabase);
    await testStorageBuckets(supabase);
    await testDatabaseFunctions(supabase);
    await testAdminAccount(supabase);

    // Test API endpoints if URL provided
    if (appUrl) {
      console.log('\n');
      await testAPIEndpoint(`${appUrl}/api/health`);
      await testAPIEndpoint(`${appUrl}/api/admin/stats`);
      await testAPIEndpoint(`${appUrl}/api/student/check-eligibility`);
    }

    // Generate report
    console.log('\n' + colors.cyan + '━'.repeat(64) + colors.reset + '\n');
    generateReport();

  } catch (error) {
    log.error(`Test execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run tests
runTests();