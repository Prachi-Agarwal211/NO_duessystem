#!/usr/bin/env node

/**
 * JECRC NO DUES SYSTEM - COMPLETE SYSTEM ANALYZER
 * 
 * This script analyzes your ENTIRE system and generates a comprehensive report:
 * - Database structure and data
 * - Staff accounts and their assignments
 * - Forms and their status
 * - Trigger definitions
 * - API endpoints
 * - Current issues
 * 
 * USAGE:
 * node scripts/analyze-complete-system.js
 * 
 * REQUIREMENTS:
 * - .env.local must have SUPABASE_SERVICE_ROLE_KEY
 * - Node.js 18+
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'bright');
  console.log('='.repeat(70));
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeSystem() {
  try {
    section('🔍 JECRC NO DUES SYSTEM - COMPLETE ANALYSIS');
    log(`Started: ${new Date().toISOString()}`, 'cyan');

    // 1. DATABASE STRUCTURE
    await analyzeDatabaseStructure();

    // 2. CONFIGURATION DATA
    await analyzeConfigurationData();

    // 3. STAFF ACCOUNTS
    await analyzeStaffAccounts();

    // 4. STUDENT FORMS
    await analyzeStudentForms();

    // 5. DEPARTMENT WORKFLOW
    await analyzeDepartmentWorkflow();

    // 6. TRIGGER ANALYSIS
    await analyzeTriggers();

    // 7. ISSUES DETECTION
    await detectIssues();

    // 8. RECOMMENDATIONS
    generateRecommendations();

    section('✅ ANALYSIS COMPLETE');
    log(`Finished: ${new Date().toISOString()}`, 'cyan');

  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

async function analyzeDatabaseStructure() {
  section('1️⃣  DATABASE STRUCTURE');

  // Check for required tables
  const requiredTables = [
    'profiles',
    'departments',
    'config_schools',
    'config_courses',
    'config_branches',
    'no_dues_forms',
    'no_dues_status',
    'email_queue',
    'support_tickets',
    'audit_log'
  ];

  log('\n📊 Table Existence Check:', 'blue');
  for (const table of requiredTables) {
    const { data, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      log(`  ❌ ${table} - MISSING or INACCESSIBLE`, 'red');
    } else {
      log(`  ✅ ${table} - EXISTS`, 'green');
    }
  }

  // Check no_dues_forms columns
  log('\n🔍 Critical Column Check:', 'blue');
  const { data: formSample } = await supabase
    .from('no_dues_forms')
    .select('*')
    .limit(1)
    .single();

  if (formSample) {
    const hasManualEntry = 'is_manual_entry' in formSample;
    const hasManualStatus = 'manual_status' in formSample;
    const hasManualCertUrl = 'manual_certificate_url' in formSample;

    log(`  no_dues_forms.is_manual_entry: ${hasManualEntry ? '❌ PRESENT (REMOVE!)' : '✅ Removed'}`, hasManualEntry ? 'red' : 'green');
    log(`  no_dues_forms.manual_status: ${hasManualStatus ? '❌ PRESENT (REMOVE!)' : '✅ Removed'}`, hasManualStatus ? 'red' : 'green');
    log(`  no_dues_forms.manual_certificate_url: ${hasManualCertUrl ? '❌ PRESENT (REMOVE!)' : '✅ Removed'}`, hasManualCertUrl ? 'red' : 'green');
  }

  // Check profiles columns
  const { data: profileSample } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
    .single();

  if (profileSample) {
    const hasAssignedDeptIds = 'assigned_department_ids' in profileSample;
    log(`  profiles.assigned_department_ids: ${hasAssignedDeptIds ? '✅ Present' : '❌ MISSING (REQUIRED!)'}`, hasAssignedDeptIds ? 'green' : 'red');
  }
}

async function analyzeConfigurationData() {
  section('2️⃣  CONFIGURATION DATA');

  // Count schools, courses, branches
  const { count: schoolCount } = await supabase
    .from('config_schools')
    .select('*', { count: 'exact', head: true });

  const { count: courseCount } = await supabase
    .from('config_courses')
    .select('*', { count: 'exact', head: true });

  const { count: branchCount } = await supabase
    .from('config_branches')
    .select('*', { count: 'exact', head: true });

  const { data: departments } = await supabase
    .from('departments')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  log('\n📚 Academic Structure:', 'blue');
  log(`  Schools: ${schoolCount}`, 'cyan');
  log(`  Courses: ${courseCount}`, 'cyan');
  log(`  Branches: ${branchCount}`, 'cyan');

  log('\n🏢 Active Departments:', 'blue');
  departments.forEach(dept => {
    log(`  ${dept.display_order}. ${dept.display_name} (${dept.name})`, 'cyan');
  });
}

async function analyzeStaffAccounts() {
  section('3️⃣  STAFF ACCOUNTS ANALYSIS');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('role');

  if (!profiles || profiles.length === 0) {
    log('  ❌ No staff accounts found!', 'red');
    return;
  }

  log('\n👥 All Profiles:', 'blue');
  log(`  Total: ${profiles.length}`, 'cyan');
  log(`  Admins: ${profiles.filter(p => p.role === 'admin').length}`, 'cyan');
  log(`  Department Staff: ${profiles.filter(p => p.role === 'department').length}`, 'cyan');

  log('\n👤 Staff Details:', 'blue');
  for (const profile of profiles) {
    log(`\n  ${profile.full_name} (${profile.email})`, 'bright');
    log(`    Role: ${profile.role}`, 'cyan');
    log(`    Department Name: ${profile.department_name || 'N/A'}`, 'cyan');
    
    if (profile.assigned_department_ids) {
      log(`    Assigned Dept UUIDs: ${JSON.stringify(profile.assigned_department_ids)}`, 'green');
      
      // Resolve UUIDs to names
      const { data: depts } = await supabase
        .from('departments')
        .select('name, display_name')
        .in('id', profile.assigned_department_ids);
      
      if (depts && depts.length > 0) {
        log(`    Resolved: ${depts.map(d => d.display_name).join(', ')}`, 'green');
      } else {
        log(`    ⚠️  INVALID UUIDs - No matching departments!`, 'yellow');
      }
    } else {
      log(`    ❌ No assigned_department_ids (CANNOT APPROVE/REJECT!)`, 'red');
    }

    if (profile.department_name === 'school_hod') {
      log(`    School IDs: ${JSON.stringify(profile.school_ids || [])}`, 'cyan');
      log(`    Course IDs: ${JSON.stringify(profile.course_ids || [])}`, 'cyan');
      log(`    Branch IDs: ${JSON.stringify(profile.branch_ids || [])}`, 'cyan');
    }
  }
}

async function analyzeStudentForms() {
  section('4️⃣  STUDENT FORMS ANALYSIS');

  const { data: forms, count: totalForms } = await supabase
    .from('no_dues_forms')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);

  log('\n📝 Form Statistics:', 'blue');
  log(`  Total Forms: ${totalForms}`, 'cyan');

  // Count by status
  const { count: pendingCount } = await supabase
    .from('no_dues_forms')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: completedCount } = await supabase
    .from('no_dues_forms')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  const { count: rejectedCount } = await supabase
    .from('no_dues_forms')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejected');

  log(`  Pending: ${pendingCount}`, 'yellow');
  log(`  Completed: ${completedCount}`, 'green');
  log(`  Rejected: ${rejectedCount}`, 'red');

  log('\n📋 Recent Forms (Last 10):', 'blue');
  forms?.forEach((form, index) => {
    log(`\n  ${index + 1}. ${form.registration_no} - ${form.student_name}`, 'bright');
    log(`     Status: ${form.status}`, form.status === 'completed' ? 'green' : form.status === 'rejected' ? 'red' : 'yellow');
    log(`     School: ${form.school}`, 'cyan');
    log(`     Course: ${form.course}`, 'cyan');
    log(`     Created: ${new Date(form.created_at).toLocaleString()}`, 'cyan');
  });
}

async function analyzeDepartmentWorkflow() {
  section('5️⃣  DEPARTMENT WORKFLOW ANALYSIS');

  const { data: departments } = await supabase
    .from('departments')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  log('\n📊 Workload by Department:', 'blue');
  
  for (const dept of departments) {
    const { data: statuses } = await supabase
      .from('no_dues_status')
      .select('status')
      .eq('department_name', dept.name);

    const pending = statuses?.filter(s => s.status === 'pending').length || 0;
    const approved = statuses?.filter(s => s.status === 'approved').length || 0;
    const rejected = statuses?.filter(s => s.status === 'rejected').length || 0;

    log(`\n  ${dept.display_name}:`, 'bright');
    log(`    Pending: ${pending}`, 'yellow');
    log(`    Approved: ${approved}`, 'green');
    log(`    Rejected: ${rejected}`, 'red');
    log(`    Total: ${statuses?.length || 0}`, 'cyan');
  }

  // Check for forms missing status rows
  log('\n🔍 Status Row Integrity Check:', 'blue');
  // Note: Custom RPC function might not exist, so we skip this check
  
  // Alternative check using raw query
  const { data: forms } = await supabase
    .from('no_dues_forms')
    .select('id, registration_no');

  let missingStatusRows = 0;
  const expectedDeptCount = departments.length;

  for (const form of forms || []) {
    const { count } = await supabase
      .from('no_dues_status')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', form.id);

    if (count < expectedDeptCount) {
      missingStatusRows++;
      log(`  ⚠️  ${form.registration_no}: Has ${count}/${expectedDeptCount} status rows`, 'yellow');
    }
  }

  if (missingStatusRows === 0) {
    log(`  ✅ All forms have complete status rows (${expectedDeptCount} each)`, 'green');
  } else {
    log(`  ❌ ${missingStatusRows} forms have incomplete status rows!`, 'red');
  }
}

async function analyzeTriggers() {
  section('6️⃣  DATABASE TRIGGERS');

  // We can't directly query pg_trigger from Supabase client,
  // so we'll use a custom query
  const { data: triggers, error } = await supabase
    .rpc('get_trigger_info')
    .catch(() => ({ data: null, error: { message: 'RPC not available' } }));

  if (error || !triggers) {
    log('\n⚠️  Cannot query triggers directly from Supabase client', 'yellow');
    log('   To check triggers, run COMPLETE_DATABASE_DIAGNOSTIC.sql in Supabase SQL Editor', 'cyan');
    return;
  }

  log('\n🔧 Active Triggers:', 'blue');
  triggers.forEach(trigger => {
    log(`  • ${trigger.trigger_name} on ${trigger.table_name}`, 'cyan');
  });
}

async function detectIssues() {
  section('7️⃣  ISSUE DETECTION');

  const issues = [];

  // Check 1: Manual entry columns
  const { data: formSample } = await supabase
    .from('no_dues_forms')
    .select('*')
    .limit(1)
    .single();

  if (formSample && 'is_manual_entry' in formSample) {
    issues.push({
      severity: 'CRITICAL',
      issue: 'Manual entry columns still exist in no_dues_forms',
      impact: 'Form submission will fail with 500 error',
      fix: 'Run EMERGENCY_FIX_RUN_THIS_NOW.sql'
    });
  }

  // Check 2: assigned_department_ids missing
  const { data: profileSample } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
    .single();

  if (profileSample && !('assigned_department_ids' in profileSample)) {
    issues.push({
      severity: 'CRITICAL',
      issue: 'profiles.assigned_department_ids column missing',
      impact: 'Staff cannot approve/reject applications',
      fix: 'Run EMERGENCY_FIX_RUN_THIS_NOW.sql'
    });
  }

  // Check 3: Staff without UUID assignments
  const { data: staffWithoutUUIDs } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('role', 'department')
    .is('assigned_department_ids', null);

  if (staffWithoutUUIDs && staffWithoutUUIDs.length > 0) {
    issues.push({
      severity: 'HIGH',
      issue: `${staffWithoutUUIDs.length} staff accounts missing UUID assignments`,
      impact: 'These staff cannot approve/reject applications',
      fix: 'Run Phase 2 (Staff Account Fix) from COMPLETE_SYSTEM_ARCHITECTURE_AND_FIX_PLAN.md',
      details: staffWithoutUUIDs.map(s => `  - ${s.full_name} (${s.email})`).join('\n')
    });
  }

  // Check 4: Forms without status rows
  const { data: forms } = await supabase
    .from('no_dues_forms')
    .select('id, registration_no')
    .limit(100);

  const { data: departments } = await supabase
    .from('departments')
    .select('*')
    .eq('is_active', true);

  const expectedDeptCount = departments.length;
  const formsWithMissingStatus = [];

  for (const form of forms || []) {
    const { count } = await supabase
      .from('no_dues_status')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', form.id);

    if (count < expectedDeptCount) {
      formsWithMissingStatus.push(form.registration_no);
    }
  }

  if (formsWithMissingStatus.length > 0) {
    issues.push({
      severity: 'MEDIUM',
      issue: `${formsWithMissingStatus.length} forms missing status rows`,
      impact: 'These forms won\'t appear in staff dashboards',
      fix: 'Run Phase 3 (Fix Missing Status Rows) from COMPLETE_SYSTEM_ARCHITECTURE_AND_FIX_PLAN.md',
      details: formsWithMissingStatus.slice(0, 10).join(', ') + (formsWithMissingStatus.length > 10 ? '...' : '')
    });
  }

  // Display issues
  if (issues.length === 0) {
    log('\n✅ No critical issues detected!', 'green');
  } else {
    log('\n⚠️  ISSUES FOUND:', 'red');
    issues.forEach((issue, index) => {
      log(`\n${index + 1}. [${issue.severity}] ${issue.issue}`, issue.severity === 'CRITICAL' ? 'red' : issue.severity === 'HIGH' ? 'yellow' : 'cyan');
      log(`   Impact: ${issue.impact}`, 'yellow');
      log(`   Fix: ${issue.fix}`, 'green');
      if (issue.details) {
        log(`   Details:\n${issue.details}`, 'cyan');
      }
    });
  }

  return issues;
}

function generateRecommendations() {
  section('8️⃣  RECOMMENDATIONS');

  log('\n📝 Immediate Actions:', 'blue');
  log('  1. Run COMPLETE_DATABASE_DIAGNOSTIC.sql in Supabase SQL Editor', 'cyan');
  log('  2. Run EMERGENCY_FIX_RUN_THIS_NOW.sql to fix critical errors', 'cyan');
  log('  3. Test form submission to verify it works', 'cyan');

  log('\n📝 Short-term Actions:', 'blue');
  log('  1. Link all staff accounts to department UUIDs', 'cyan');
  log('  2. Verify all forms have 7 status rows', 'cyan');
  log('  3. Test complete workflow with test accounts', 'cyan');

  log('\n📝 Long-term Actions:', 'blue');
  log('  1. Create remaining staff accounts (IT, Hostel, Alumni, Accounts, Registrar)', 'cyan');
  log('  2. Import 9th convocation students', 'cyan');
  log('  3. Set up email monitoring', 'cyan');
  log('  4. Enable cron job for stats refresh', 'cyan');
}

// Run the analyzer
analyzeSystem();