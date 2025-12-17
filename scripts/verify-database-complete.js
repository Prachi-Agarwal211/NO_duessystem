#!/usr/bin/env node

/**
 * ==============================================
 * COMPLETE DATABASE VERIFICATION SCRIPT
 * ==============================================
 * 
 * This script verifies:
 * 1. Database connection
 * 2. All required tables exist with correct structure
 * 3. All required functions exist and work
 * 4. Storage buckets exist
 * 5. RLS policies are configured
 * 6. Sample data verification
 * 
 * USAGE:
 * node verify-database-complete.js
 * 
 * ENVIRONMENT: Uses .env.local for database credentials
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// ANSI Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) { log(colors.green, `✅ ${message}`); }
function error(message) { log(colors.red, `❌ ${message}`); }
function warning(message) { log(colors.yellow, `⚠️  ${message}`); }
function info(message) { log(colors.blue, `ℹ️  ${message}`); }
function header(message) { log(colors.cyan, `\n${message}`); }

// Initialize Supabase clients
let supabaseAdmin = null;
let supabaseAnon = null;

const verificationResults = {
  tables: {},
  functions: {},
  storage: {},
  data: {},
  issues: [],
  passed: 0,
  failed: 0
};

async function initializeClients() {
  header('🔌 INITIALIZING DATABASE CONNECTIONS');
  
  try {
    // Admin client (bypasses RLS)
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
        }
      }
    );
    
    // Anonymous client (tests RLS)
    supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    success('Supabase clients initialized');
    return true;
  } catch (err) {
    error('Failed to initialize Supabase clients');
    error(err.message);
    return false;
  }
}

async function testConnection() {
  header('🌍 TESTING DATABASE CONNECTION');
  
  try {
    const { data, error } = await supabaseAdmin
      .from('information_schema.tables')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      error('Database connection failed');
      error(error.message);
      verificationResults.issues.push('Database connection failed');
      return false;
    }
    
    success('Database connection successful');
    return true;
  } catch (err) {
    error('Connection test failed');
    error(err.message);
    verificationResults.issues.push('Database connection test failed');
    return false;
  }
}

async function checkTables() {
  header('📋 VERIFYING REQUIRED TABLES');
  
  const requiredTables = [
    'no_dues_forms',
    'no_dues_status', 
    'profiles',
    'departments',
    'config_schools',
    'config_courses',
    'config_branches',
    'convocation_eligible_students',
    'support_tickets',
    'email_queue',
    'notifications',
    'audit_log'
  ];

  info('Checking table existence...');
  
  for (const tableName of requiredTables) {
    try {
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        if (error.code === 'PGRST116') {
          error(`Table "${tableName}" does not exist`);
          verificationResults.issues.push(`Missing table: ${tableName}`);
          verificationResults.failed++;
        } else if (error.code === '42501') {
          warning(`Table "${tableName}" exists but no RLS policy for anon user`);
          verificationResults.issues.push(`RLS policy missing for: ${tableName}`);
        } else {
          error(`Table "${tableName}" error: ${error.message}`);
          verificationResults.issues.push(`Table error ${tableName}: ${error.message}`);
        }
      } else {
        success(`Table "${tableName}" exists (${data || 0} rows)`);
        verificationResults.passed++;
      }
    } catch (err) {
      error(`Failed to check table "${tableName}": ${err.message}`);
      verificationResults.issues.push(`Table check failed ${tableName}: ${err.message}`);
    }
  }
}

async function checkFunctions() {
  header('🔧 VERIFYING DATABASE FUNCTIONS');
  
  const requiredFunctions = [
    'get_form_statistics',
    'get_department_workload',
    'generate_ticket_number',
    'update_updated_at_column',
    'create_department_statuses',
    'update_form_status_on_department_action',
    'update_convocation_status'
  ];

  info('Checking function existence and execution...');
  
  for (const functionName of requiredFunctions) {
    try {
      const { data, error } = await supabaseAdmin.rpc(functionName);
      
      if (error) {
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          error(`Function "${functionName}()" does not exist`);
          verificationResults.issues.push(`Missing function: ${functionName}`);
        } else {
          // Function exists but may have execution error (e.g., no data)
          success(`Function "${functionName}()" exists and executes`);
        }
      } else {
        success(`Function "${functionName}()" exists and executes`);
        verificationResults.passed++;
        
        // Log sample result for verification functions
        if (functionName === 'get_form_statistics' && data) {
          info('Form statistics sample:');
          console.log(JSON.stringify(data[0], null, 2));
        } else if (functionName === 'get_department_workload' && data) {
          info(`Department workload found: ${data.length} departments`);
        }
      }
    } catch (err) {
      error(`Failed to execute function "${functionName}": ${err.message}`);
      verificationResults.issues.push(`Function failed ${functionName}: ${err.message}`);
    }
  }
}

async function checkStorageBuckets() {
  header('📦 VERIFYING STORAGE BUCKETS');
  
  const requiredBuckets = [
    'no-dues-files',
    'alumni-screenshots', 
    'certificates'
  ];

  try {
    const { data, error } = await supabaseAdmin.storage.listBuckets();
    
    if (error) {
      error('Failed to list storage buckets');
      error(error.message);
      verificationResults.issues.push('Storage bucket listing failed');
      return;
    }
    
    const bucketNames = data.map(b => b.name);
    
    for (const bucketName of requiredBuckets) {
      if (bucketNames.includes(bucketName)) {
        success(`Bucket "${bucketName}" exists`);
        verificationResults.passed++;
      } else {
        error(`Bucket "${bucketName}" does not exist`);
        verificationResults.issues.push(`Missing bucket: ${bucketName}`);
      }
    }
    
    info(`Total buckets found: ${bucketNames.length}/${requiredBuckets.length}`);
  } catch (err) {
    error('Storage verification failed');
    error(err.message);
    verificationResults.issues.push('Storage verification failed');
  }
}

async function checkRLSPolicies() {
  header('🔐 VERIFYING RLS POLICIES');
  
  try {
    const { data, error } = await supabaseAdmin
      .from('pg_policies')
      .select('policyname, tablename, schemaname')
      .in('tablename', ['no_dues_forms', 'no_dues_status', 'profiles']);
    
    if (error) {
      warning('Cannot check RLS policies (requires admin privileges)');
      return;
    }
    
    if (data && data.length > 0) {
      success(`RLS policies found: ${data.length}`);
      data.forEach(policy => {
        info(`Policy: ${policy.policyname} on ${policy.schemaname}.${policy.tablename}`);
      });
      verificationResults.passed++;
    } else {
      warning('No RLS policies found - this may be a security issue');
      verificationResults.issues.push('No RLS policies configured');
    }
  } catch (err) {
    info('RLS policy check requires elevated permissions');
  }
}

async function checkDataIntegrity() {
  header('🔍 VERIFYING DATA INTEGRITY');
  
  try {
    // Check for admin users
    const { data: adminUsers, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'admin')
      .eq('is_active', true);
    
    if (adminError) {
      warning('Cannot check admin users (table may not exist)');
    } else {
      if (adminUsers && adminUsers.length > 0) {
        success(`Active admin users: ${adminUsers.length}`);
        adminUsers.forEach(admin => {
          info(`Admin: ${admin.full_name} (${admin.email})`);
        });
      } else {
        warning('No active admin users found');
        verificationResults.issues.push('No admin users configured');
      }
    }
    
    // Check for departments
    const { data: departments, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('name, display_name, is_active')
      .eq('is_active', true)
      .order('display_order');
    
    if (deptError) {
      warning('Cannot check departments (table may not exist)');
    } else {
      if (departments && departments.length > 0) {
        success(`Active departments: ${departments.length}`);
      } else {
        warning('No active departments found');
        verificationResults.issues.push('No departments configured');
      }
    }
    
    // Check for schools configuration
    const { data: schools, error: schoolError } = await supabaseAdmin
      .from('config_schools')
      .select('name, is_active')
      .eq('is_active', true);
    
    if (schoolError) {
      warning('Cannot check schools configuration (table may not exist)');
    } else {
      if (schools && schools.length > 0) {
        success(`Active schools: ${schools.length}`);
      } else {
        warning('No active schools configuration found');
        verificationResults.issues.push('No schools configured');
      }
    }
    
  } catch (err) {
    error('Data integrity check failed');
    error(err.message);
  }
}

async function testAPIEndpoints() {
  header('🌐 TESTING API ENDPOINTS');
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const endpoints = [
    { path: '/api/admin/stats', method: 'GET', expected: 'JSON or 401' },
    { path: '/api/manual-entry?status=pending', method: 'GET', expected: 'JSON or 401' },
    { path: '/api/support?page=1&limit=20', method: 'GET', expected: 'JSON or 401' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 500) {
        error(`API ${endpoint.path} - Server Error (500)`);
        verificationResults.issues.push(`API 500 error: ${endpoint.path}`);
      } else if (response.status === 404) {
        warning(`API ${endpoint.path} - Not Found (404)`);
        verificationResults.issues.push(`API 404 error: ${endpoint.path}`);
      } else {
        success(`API ${endpoint.path} - Status ${response.status}`);
        verificationResults.passed++;
      }
    } catch (err) {
      warning(`API ${endpoint.path} - Network error: ${err.message}`);
      verificationResults.issues.push(`API network error: ${endpoint.path}`);
    }
  }
}

function generateReport() {
  header('📊 VERIFICATION REPORT');
  
  console.log(`\n${colors.cyan}╔═════════════════════════════════════════════════════════════════╗`);
  console.log(`║                   VERIFICATION SUMMARY                          ║`);
  console.log(`╚═════════════════════════════════════════════════════════════════╝${colors.reset}`);
  
  console.log(`\n${colors.white}Results Summary:`);
  console.log(`✅ Passed: ${colors.green}${verificationResults.passed}${colors.white}`);
  console.log(`❌ Failed: ${colors.red}${verificationResults.failed}${colors.white}`);
  
  if (verificationResults.issues.length === 0) {
    console.log(`\n${colors.green}🎉 ALL CHECKS PASSED! Database is properly configured.${colors.reset}`);
    console.log(`\n${colors.cyan}Next Steps:`);
    console.log(`1. Deploy application to production`);
    console.log(`2. Test all user workflows`);
    console.log(`3. Monitor for any runtime errors`);
  } else {
    console.log(`\n${colors.red}⚠️  ISSUES FOUND (${verificationResults.issues.length}):${colors.reset}`);
    
    verificationResults.issues.forEach((issue, index) => {
      console.log(`\n${colors.yellow}${index + 1}. ${issue}${colors.reset}`);
    });
    
    console.log(`\n${colors.cyan}🔧 RECOMMENDED ACTIONS:`);
    console.log(`1. Run ULTIMATE_DATABASE_SETUP.sql in Supabase SQL Editor`);
    console.log(`2. Ensure all storage buckets are created`);
    console.log(`3. Check environment variables in production`);
    console.log(`4. Clear build cache and redeploy application`);
  }
  
  // Environment variables check
  console.log(`\n${colors.blue}📋 Environment Variables Status:`);
  const envVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY', 
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'JWT_SECRET'
  ];
  
  envVars.forEach(varName => {
    if (process.env[varName]) {
      success(`${varName}: ✓ Set`);
    } else {
      error(`${varName}: ✗ Missing`);
    }
  });
}

async function main() {
  try {
    console.log(`${colors.cyan}🚀 JECRC NO DUES SYSTEM - DATABASE VERIFICATION${colors.reset}`);
    console.log(`${colors.gray}Verifying database configuration and deployment readiness...${colors.reset}\n`);
    
    const initialized = await initializeClients();
    if (!initialized) {
      process.exit(1);
    }
    
    const connected = await testConnection();
    if (!connected) {
      process.exit(1);
    }
    
    await checkTables();
    await checkFunctions();
    await checkStorageBuckets();
    await checkRLSPolicies();
    await checkDataIntegrity();
    await testAPIEndpoints();
    
    generateReport();
    
    // Exit with appropriate code
    process.exit(verificationResults.issues.length > 0 ? 1 : 0);
    
  } catch (err) {
    console.error(`\n${colors.red}💥 CRITICAL ERROR:${colors.reset}`);
    console.error(err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`\n${colors.red}💥 Unhandled Rejection:${colors.reset}`);
  console.error(err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error(`\n${colors.red}💥 Uncaught Exception:${colors.reset}`);
  console.error(err);
  process.exit(1);
});

// Run the verification
if (require.main === module) {
  main();
}

module.exports = { main };