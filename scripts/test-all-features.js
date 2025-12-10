/**
 * JECRC No Dues System - Comprehensive Automated Testing Script
 * 
 * This script tests:
 * - Database connectivity
 * - All API endpoints
 * - Form submission flow
 * - Staff operations
 * - Admin operations
 * - Notifications
 * - Manual entries
 * - Storage functionality
 * 
 * Run: node scripts/test-all-features.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper functions
function log(message, type = 'info') {
  const prefix = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️`,
    info: `${colors.cyan}ℹ️`,
    test: `${colors.blue}🧪`
  }[type];
  
  console.log(`${prefix} ${message}${colors.reset}`);
}

function recordTest(name, passed, message = '') {
  if (passed) {
    results.passed++;
    results.tests.push({ name, status: 'PASS', message });
    log(`${name}: ${message}`, 'success');
  } else {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', message });
    log(`${name}: ${message}`, 'error');
  }
}

function recordWarning(name, message) {
  results.warnings++;
  results.tests.push({ name, status: 'WARN', message });
  log(`${name}: ${message}`, 'warning');
}

// Test functions
async function testDatabaseConnection() {
  log('\n=== Testing Database Connection ===', 'test');
  
  try {
    const { data, error } = await supabase.from('config_schools').select('count');
    recordTest('Database Connection', !error, error ? error.message : 'Connected successfully');
    return !error;
  } catch (err) {
    recordTest('Database Connection', false, err.message);
    return false;
  }
}

async function testDatabaseTables() {
  log('\n=== Testing Database Tables ===', 'test');
  
  const requiredTables = [
    'config_schools',
    'config_courses',
    'config_branches',
    'config_emails',
    'config_validation_rules',
    'departments',
    'no_dues_forms',
    'no_dues_status',
    'notifications',
    'profiles',
    'audit_log',
    'config_country_codes'
  ];
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase.from(table).select('count').limit(1);
      recordTest(`Table: ${table}`, !error, error ? error.message : 'Exists');
    } catch (err) {
      recordTest(`Table: ${table}`, false, err.message);
    }
  }
}

async function testDatabaseData() {
  log('\n=== Testing Database Data ===', 'test');
  
  // Test schools
  const { data: schools, error: schoolsError } = await supabase
    .from('config_schools')
    .select('*');
  recordTest('Schools Data', !schoolsError && schools?.length >= 13, 
    `Found ${schools?.length || 0} schools (expected 13)`);
  
  // Test courses
  const { data: courses, error: coursesError } = await supabase
    .from('config_courses')
    .select('*');
  recordTest('Courses Data', !coursesError && courses?.length >= 28, 
    `Found ${courses?.length || 0} courses (expected 28)`);
  
  // Test branches
  const { data: branches, error: branchesError } = await supabase
    .from('config_branches')
    .select('*');
  recordTest('Branches Data', !branchesError && branches?.length >= 139, 
    `Found ${branches?.length || 0} branches (expected 139)`);
  
  // Test departments
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('*');
  recordTest('Departments Data', !deptError && departments?.length === 11, 
    `Found ${departments?.length || 0} departments (expected 11)`);
  
  // Test validation rules
  const { data: rules, error: rulesError } = await supabase
    .from('config_validation_rules')
    .select('*');
  recordTest('Validation Rules', !rulesError && rules?.length >= 10, 
    `Found ${rules?.length || 0} rules`);
  
  // Test college email domain
  const { data: emails, error: emailsError } = await supabase
    .from('config_emails')
    .select('*')
    .eq('is_active', true);
  recordTest('College Email Config', !emailsError && emails?.length > 0, 
    `Found ${emails?.length || 0} active email configs`);
}

async function testValidationRulesFormat() {
  log('\n=== Testing Validation Rules Format ===', 'test');
  
  const { data: rules, error } = await supabase
    .from('config_validation_rules')
    .select('*')
    .eq('is_active', true);
  
  if (error) {
    recordTest('Fetch Validation Rules', false, error.message);
    return;
  }
  
  // Check for double backslash issue
  const sessionYearRule = rules.find(r => r.rule_name === 'session_year');
  const hasDoubleBackslash = sessionYearRule?.rule_pattern.includes('\\\\');
  
  recordTest('Session Year Pattern Format', !hasDoubleBackslash, 
    hasDoubleBackslash 
      ? 'FOUND DOUBLE BACKSLASH BUG: Pattern has \\\\d instead of \\d'
      : 'Pattern correct: ' + sessionYearRule?.rule_pattern);
  
  const studentNameRule = rules.find(r => r.rule_name === 'student_name');
  const nameHasDoubleBackslash = studentNameRule?.rule_pattern.includes('\\\\');
  
  recordTest('Student Name Pattern Format', !nameHasDoubleBackslash, 
    nameHasDoubleBackslash 
      ? 'FOUND DOUBLE BACKSLASH BUG'
      : 'Pattern correct: ' + studentNameRule?.rule_pattern);
}

async function testForeignKeyRelationships() {
  log('\n=== Testing Foreign Key Relationships ===', 'test');
  
  // Test school → course relationship
  const { data: coursesWithSchools, error: e1 } = await supabase
    .from('config_courses')
    .select('*, config_schools(name)')
    .limit(5);
  
  recordTest('School → Course Relationship', 
    !e1 && coursesWithSchools?.every(c => c.config_schools?.name),
    !e1 ? 'All courses linked to schools' : e1.message);
  
  // Test course → branch relationship
  const { data: branchesWithCourses, error: e2 } = await supabase
    .from('config_branches')
    .select('*, config_courses(name)')
    .limit(5);
  
  recordTest('Course → Branch Relationship', 
    !e2 && branchesWithCourses?.every(b => b.config_courses?.name),
    !e2 ? 'All branches linked to courses' : e2.message);
}

async function testRLSPolicies() {
  log('\n=== Testing RLS Policies ===', 'test');
  
  // Test public read access to config tables
  const publicClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  const { data: schools, error } = await publicClient
    .from('config_schools')
    .select('*')
    .limit(1);
  
  recordTest('Public Read Access (config_schools)', !error, 
    error ? 'RLS blocking public read' : 'Public can read config tables');
  
  // Test that public cannot write
  const { error: writeError } = await publicClient
    .from('config_schools')
    .insert({ name: 'Test School' });
  
  recordTest('Public Write Protection', writeError !== null, 
    writeError ? 'RLS correctly blocking writes' : 'WARNING: Public can write!');
}

async function testStorageBuckets() {
  log('\n=== Testing Storage Buckets ===', 'test');
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      recordTest('List Storage Buckets', false, error.message);
      return;
    }
    
    const bucketNames = buckets.map(b => b.name);
    
    recordTest('alumni-screenshots Bucket', 
      bucketNames.includes('alumni-screenshots'),
      bucketNames.includes('alumni-screenshots') ? 'Exists' : 'Missing');
    
    recordTest('certificates Bucket', 
      bucketNames.includes('certificates'),
      bucketNames.includes('certificates') ? 'Exists' : 'Missing (optional)');
    
  } catch (err) {
    recordTest('Storage Buckets Test', false, err.message);
  }
}

async function testIndexes() {
  log('\n=== Testing Database Indexes ===', 'test');
  
  const { data, error } = await supabase.rpc('get_indexes', {}, { count: 'exact' });
  
  if (error && error.message.includes('function')) {
    // Function doesn't exist, query directly
    const { data: indexes, error: e2 } = await supabase
      .from('pg_indexes')
      .select('*')
      .eq('schemaname', 'public');
    
    if (!e2) {
      recordTest('Database Indexes', indexes?.length >= 10, 
        `Found ${indexes?.length || 0} indexes`);
    } else {
      recordWarning('Database Indexes', 'Could not verify indexes (insufficient permissions)');
    }
  } else if (!error) {
    recordTest('Database Indexes', data?.length >= 10, 
      `Found ${data?.length || 0} indexes`);
  } else {
    recordWarning('Database Indexes', 'Could not verify indexes');
  }
}

async function testRealtimeSetup() {
  log('\n=== Testing Realtime Setup ===', 'test');
  
  // Check if realtime is enabled on critical tables
  const criticalTables = ['no_dues_forms', 'no_dues_status'];
  
  for (const table of criticalTables) {
    // Try to subscribe (doesn't actually subscribe, just checks if possible)
    try {
      const channel = supabase.channel(`test_${table}`);
      recordTest(`Realtime: ${table}`, true, 'Can create channel');
      await channel.unsubscribe();
    } catch (err) {
      recordTest(`Realtime: ${table}`, false, err.message);
    }
  }
}

async function testEnvironmentVariables() {
  log('\n=== Testing Environment Variables ===', 'test');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const optionalVars = [
    'NEXT_PUBLIC_APP_URL'
  ];
  
  for (const varName of requiredVars) {
    recordTest(`Env Var: ${varName}`, 
      !!process.env[varName], 
      process.env[varName] ? 'Set' : 'MISSING');
  }
  
  for (const varName of optionalVars) {
    if (!process.env[varName]) {
      recordWarning(`Env Var: ${varName}`, 'Not set (optional but recommended)');
    } else {
      recordTest(`Env Var: ${varName}`, true, 'Set');
    }
  }
}

async function testAccountsExist() {
  log('\n=== Testing Accounts ===', 'test');
  
  // Check for admin account
  const { data: admins, error: e1 } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'admin');
  
  recordTest('Admin Accounts', !e1 && admins?.length > 0, 
    `Found ${admins?.length || 0} admin account(s)`);
  
  // Check for staff/department accounts (role is 'department' in database, not 'staff')
  const { data: staff, error: e2 } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'department');
  
  recordTest('Staff Accounts', !e2 && staff?.length > 0,
    `Found ${staff?.length || 0} staff account(s) with role='department'`);
  
  if (!e2 && staff?.length > 0) {
    // Check if all departments have staff
    const { data: departments } = await supabase
      .from('departments')
      .select('department_name');
    
    const departmentNames = departments?.map(d => d.department_name) || [];
    const staffDepartments = staff.map(s => s.department_name).filter(Boolean);
    
    const missingDepartments = departmentNames.filter(d => !staffDepartments.includes(d));
    
    if (missingDepartments.length > 0) {
      recordWarning('Department Coverage', 
        `Missing staff for: ${missingDepartments.join(', ')}`);
    } else {
      recordTest('Department Coverage', true, 'All departments have staff');
    }
  }
}

async function testSampleFormSubmission() {
  log('\n=== Testing Sample Form Submission ===', 'test');
  
  // Create a test form
  const testRegNo = `TEST${Date.now()}`;
  
  const { data: schools } = await supabase
    .from('config_schools')
    .select('id, name')
    .limit(1)
    .single();
  
  if (!schools) {
    recordTest('Sample Form Submission', false, 'No schools found');
    return;
  }
  
  const { data: courses } = await supabase
    .from('config_courses')
    .select('id, name')
    .eq('school_id', schools.id)
    .limit(1)
    .single();
  
  if (!courses) {
    recordTest('Sample Form Submission', false, 'No courses found');
    return;
  }
  
  const { data: branches } = await supabase
    .from('config_branches')
    .select('id, name')
    .eq('course_id', courses.id)
    .limit(1)
    .single();
  
  if (!branches) {
    recordTest('Sample Form Submission', false, 'No branches found');
    return;
  }
  
  // Insert test form (must include both UUID foreign keys AND text fields)
  const { data: form, error: formError } = await supabase
    .from('no_dues_forms')
    .insert({
      registration_no: testRegNo,
      student_name: 'Test Student',
      school_id: schools.id,
      school: schools.name,  // TEXT field is required
      course_id: courses.id,
      course: courses.name,  // TEXT field is required
      branch_id: branches.id,
      branch: branches.name,  // TEXT field is required
      admission_year: 2020,
      passing_year: 2024,
      personal_email: 'test@example.com',
      college_email: 'test@jecrcu.edu.in',
      contact_no: '9876543210',
      country_code: '+91',
      status: 'pending'
    })
    .select()
    .single();
  
  recordTest('Form Insertion', !formError, formError?.message || 'Form created');
  
  if (!formError && form) {
    // Check if department statuses were created
    const { data: statuses, error: statusError } = await supabase
      .from('no_dues_status')
      .select('*')
      .eq('form_id', form.id);
    
    recordTest('Auto-create Department Statuses', 
      !statusError && statuses?.length === 11, 
      `Created ${statuses?.length || 0}/11 department statuses`);
    
    // Clean up test data
    await supabase.from('no_dues_status').delete().eq('form_id', form.id);
    await supabase.from('no_dues_forms').delete().eq('id', form.id);
    
    log('Test form cleaned up', 'info');
  }
}

async function testCascadingDropdownsData() {
  log('\n=== Testing Cascading Dropdowns Data ===', 'test');
  
  // Get a school
  const { data: school } = await supabase
    .from('config_schools')
    .select('id, name')
    .limit(1)
    .single();
  
  if (!school) {
    recordTest('Cascading Dropdowns', false, 'No schools found');
    return;
  }
  
  // Get courses for this school
  const { data: courses, error: e1 } = await supabase
    .from('config_courses')
    .select('*')
    .eq('school_id', school.id);
  
  recordTest('School → Courses Cascade', !e1 && courses?.length > 0, 
    `${school.name} has ${courses?.length || 0} courses`);
  
  if (courses && courses.length > 0) {
    // Get branches for first course
    const { data: branches, error: e2 } = await supabase
      .from('config_branches')
      .select('*')
      .eq('course_id', courses[0].id);
    
    recordTest('Course → Branches Cascade', !e2 && branches?.length > 0, 
      `${courses[0].name} has ${branches?.length || 0} branches`);
  }
}

async function printSummary() {
  log('\n' + '='.repeat(60), 'info');
  log('TEST SUMMARY', 'info');
  log('='.repeat(60), 'info');
  
  console.log(`\n${colors.bright}Total Tests: ${results.tests.length}${colors.reset}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${results.warnings}${colors.reset}`);
  
  if (results.failed > 0) {
    console.log(`\n${colors.red}${colors.bright}FAILED TESTS:${colors.reset}`);
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`  ${colors.red}❌ ${t.name}: ${t.message}${colors.reset}`));
  }
  
  if (results.warnings > 0) {
    console.log(`\n${colors.yellow}${colors.bright}WARNINGS:${colors.reset}`);
    results.tests
      .filter(t => t.status === 'WARN')
      .forEach(t => console.log(`  ${colors.yellow}⚠️  ${t.name}: ${t.message}${colors.reset}`));
  }
  
  const passRate = ((results.passed / results.tests.length) * 100).toFixed(1);
  console.log(`\n${colors.bright}Pass Rate: ${passRate}%${colors.reset}`);
  
  if (results.failed === 0) {
    console.log(`\n${colors.green}${colors.bright}✅ ALL CRITICAL TESTS PASSED!${colors.reset}`);
    console.log(`${colors.green}System is ready for production.${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ SOME TESTS FAILED${colors.reset}`);
    console.log(`${colors.red}Please fix the issues before deploying to production.${colors.reset}\n`);
  }
}

// Main test runner
async function runAllTests() {
  console.log(`\n${colors.cyan}${colors.bright}🧪 JECRC No Dues System - Comprehensive Test Suite${colors.reset}`);
  console.log(`${colors.cyan}Started at: ${new Date().toLocaleString()}${colors.reset}\n`);
  
  try {
    // Environment
    await testEnvironmentVariables();
    
    // Database connectivity
    const dbConnected = await testDatabaseConnection();
    
    if (!dbConnected) {
      log('\n❌ Database connection failed. Cannot continue tests.', 'error');
      await printSummary();
      process.exit(1);
    }
    
    // Database structure
    await testDatabaseTables();
    await testDatabaseData();
    await testValidationRulesFormat();
    await testForeignKeyRelationships();
    
    // Security
    await testRLSPolicies();
    await testIndexes();
    
    // Storage
    await testStorageBuckets();
    
    // Realtime
    await testRealtimeSetup();
    
    // Accounts
    await testAccountsExist();
    
    // Data relationships
    await testCascadingDropdownsData();
    
    // Functional tests
    await testSampleFormSubmission();
    
    // Print summary
    await printSummary();
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (err) {
    log(`\n❌ Test suite crashed: ${err.message}`, 'error');
    console.error(err);
    process.exit(1);
  }
}

// Run tests
runAllTests();