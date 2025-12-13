/**
 * COMPLETE HOD ACCOUNTS VERIFICATION SCRIPT
 * 
 * This script performs comprehensive verification of:
 * 1. Auth users existence and confirmation status
 * 2. Profiles table synchronization
 * 3. Scoping configuration (school_ids, course_ids, branch_ids)
 * 4. Department mapping validation
 * 5. Data integrity checks
 * 6. Login readiness verification
 * 
 * Usage: node scripts/verify-hod-accounts-complete.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Create Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '═'.repeat(70));
  log(title, 'bright');
  console.log('═'.repeat(70) + '\n');
}

async function verifyHODAccounts() {
  try {
    section('🚀 STARTING COMPLETE HOD ACCOUNTS VERIFICATION');

    // Verify environment
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      log('❌ ERROR: Missing environment variables', 'red');
      log('   Check .env.local file exists and contains:', 'yellow');
      log('   - NEXT_PUBLIC_SUPABASE_URL', 'yellow');
      log('   - SUPABASE_SERVICE_ROLE_KEY', 'yellow');
      process.exit(1);
    }

    log('✅ Environment variables loaded', 'green');
    log(`   Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`, 'cyan');

    // ================================================================
    // PART 1: FETCH ALL DATA
    // ================================================================
    section('📊 PART 1: FETCHING DATABASE RECORDS');

    log('Fetching auth users...', 'cyan');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;
    log(`✅ Found ${authUsers.users.length} auth users`, 'green');

    log('Fetching profiles...', 'cyan');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    if (profilesError) throw profilesError;
    log(`✅ Found ${profiles.length} profiles`, 'green');

    log('Fetching departments...', 'cyan');
    const { data: departments, error: deptsError } = await supabase
      .from('departments')
      .select('*')
      .order('display_order');
    if (deptsError) throw deptsError;
    log(`✅ Found ${departments.length} departments`, 'green');

    log('Fetching schools...', 'cyan');
    const { data: schools, error: schoolsError } = await supabase
      .from('config_schools')
      .select('*')
      .eq('is_active', true);
    if (schoolsError) throw schoolsError;
    log(`✅ Found ${schools.length} schools`, 'green');

    log('Fetching courses...', 'cyan');
    const { data: courses, error: coursesError } = await supabase
      .from('config_courses')
      .select('*')
      .eq('is_active', true);
    if (coursesError) throw coursesError;
    log(`✅ Found ${courses.length} courses`, 'green');

    log('Fetching branches...', 'cyan');
    const { data: branches, error: branchesError } = await supabase
      .from('config_branches')
      .select('*')
      .eq('is_active', true);
    if (branchesError) throw branchesError;
    log(`✅ Found ${branches.length} branches`, 'green');

    // ================================================================
    // PART 2: ANALYZE HOD ACCOUNTS
    // ================================================================
    section('🔍 PART 2: ANALYZING HOD ACCOUNTS (school_hod department)');

    const hodProfiles = profiles.filter(p => p.department_name === 'school_hod');
    log(`Found ${hodProfiles.length} HOD profiles`, 'cyan');

    if (hodProfiles.length === 0) {
      log('⚠️  WARNING: No HOD profiles found!', 'yellow');
      log('   Run: node scripts/create-all-hod-accounts.js', 'yellow');
    }

    const results = {
      total: hodProfiles.length,
      withAuth: 0,
      emailConfirmed: 0,
      hasSchool: 0,
      hasCourses: 0,
      correctScoping: 0,
      canLogin: 0,
      issues: []
    };

    // Create lookup maps
    const authUserMap = new Map(authUsers.users.map(u => [u.id, u]));
    const schoolMap = new Map(schools.map(s => [s.id, s]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    console.log('\n' + '─'.repeat(70));
    log('DETAILED HOD ANALYSIS:', 'bright');
    console.log('─'.repeat(70));

    for (const hod of hodProfiles) {
      console.log(`\n📧 ${hod.email}`);
      log(`   Name: ${hod.full_name}`, 'cyan');
      
      // Check 1: Auth user exists
      const authUser = authUserMap.get(hod.id);
      if (authUser) {
        results.withAuth++;
        log(`   ✅ Auth user exists`, 'green');
        
        // Check 2: Email confirmed
        if (authUser.email_confirmed_at) {
          results.emailConfirmed++;
          log(`   ✅ Email confirmed (${new Date(authUser.email_confirmed_at).toLocaleDateString()})`, 'green');
        } else {
          log(`   ❌ Email NOT confirmed`, 'red');
          results.issues.push({ email: hod.email, issue: 'Email not confirmed' });
        }
      } else {
        log(`   ❌ NO AUTH USER FOUND`, 'red');
        results.issues.push({ email: hod.email, issue: 'Missing auth user' });
      }

      // Check 3: School scoping
      if (hod.school_ids && hod.school_ids.length > 0) {
        results.hasSchool++;
        const hodSchools = hod.school_ids
          .map(id => schoolMap.get(id)?.name || 'Unknown')
          .join(', ');
        log(`   ✅ School(s): ${hodSchools}`, 'green');
      } else {
        log(`   ⚠️  No school assigned (sees all schools)`, 'yellow');
      }

      // Check 4: Course scoping
      if (hod.course_ids && hod.course_ids.length > 0) {
        results.hasCourses++;
        const hodCourses = hod.course_ids
          .map(id => courseMap.get(id)?.name || 'Unknown')
          .join(', ');
        log(`   ✅ Course(s): ${hodCourses} (${hod.course_ids.length})`, 'green');
      } else {
        log(`   ⚠️  No courses assigned (sees all courses)`, 'yellow');
      }

      // Check 5: Branch scoping
      if (hod.branch_ids === null) {
        log(`   ✅ Branch scope: ALL (NULL = sees all branches in courses)`, 'green');
        results.correctScoping++;
      } else if (hod.branch_ids && hod.branch_ids.length > 0) {
        log(`   ✅ Branch scope: ${hod.branch_ids.length} specific branches`, 'green');
        results.correctScoping++;
      } else {
        log(`   ⚠️  Branch scope: EMPTY (sees nothing)`, 'yellow');
        results.issues.push({ email: hod.email, issue: 'Empty branch_ids array' });
      }

      // Check 6: Active status
      if (hod.is_active) {
        log(`   ✅ Status: Active`, 'green');
      } else {
        log(`   ❌ Status: Inactive`, 'red');
        results.issues.push({ email: hod.email, issue: 'Profile inactive' });
      }

      // Check 7: Can login
      const canLogin = authUser && authUser.email_confirmed_at && hod.is_active;
      if (canLogin) {
        results.canLogin++;
        log(`   ✅ CAN LOGIN ✓`, 'bright');
      } else {
        log(`   ❌ CANNOT LOGIN`, 'red');
      }
    }

    // ================================================================
    // PART 3: SYNC VERIFICATION
    // ================================================================
    section('🔄 PART 3: AUTH ↔ PROFILES SYNC VERIFICATION');

    const hodAuthUsers = authUsers.users.filter(u => 
      u.email.startsWith('hod.') || 
      u.user_metadata?.department_name === 'school_hod'
    );

    log(`HOD auth users: ${hodAuthUsers.length}`, 'cyan');
    log(`HOD profiles: ${hodProfiles.length}`, 'cyan');

    // Check for orphaned auth users (auth without profile)
    const orphanedAuth = hodAuthUsers.filter(au => 
      !profiles.find(p => p.id === au.id)
    );

    if (orphanedAuth.length > 0) {
      log(`\n⚠️  ORPHANED AUTH USERS (${orphanedAuth.length}):`, 'yellow');
      orphanedAuth.forEach(au => {
        log(`   - ${au.email} (ID: ${au.id.substring(0, 8)}...)`, 'yellow');
        results.issues.push({ 
          email: au.email, 
          issue: 'Auth user without profile' 
        });
      });
    } else {
      log(`✅ No orphaned auth users`, 'green');
    }

    // Check for orphaned profiles (profile without auth)
    const orphanedProfiles = hodProfiles.filter(p => 
      !authUserMap.has(p.id)
    );

    if (orphanedProfiles.length > 0) {
      log(`\n❌ ORPHANED PROFILES (${orphanedProfiles.length}):`, 'red');
      orphanedProfiles.forEach(p => {
        log(`   - ${p.email} (ID: ${p.id.substring(0, 8)}...)`, 'red');
        results.issues.push({ 
          email: p.email, 
          issue: 'Profile without auth user' 
        });
      });
    } else {
      log(`✅ No orphaned profiles`, 'green');
    }

    // ================================================================
    // PART 4: DEPARTMENT VALIDATION
    // ================================================================
    section('🏢 PART 4: DEPARTMENT VALIDATION');

    const departmentNames = new Set(departments.map(d => d.name));
    log(`Valid departments (${departments.length}):`, 'cyan');
    departments.forEach(d => {
      log(`   ${d.display_order}. ${d.name} → ${d.display_name}`, 'cyan');
    });

    // Check if all HODs have valid department_name
    const invalidDepts = hodProfiles.filter(p => 
      !departmentNames.has(p.department_name)
    );

    if (invalidDepts.length > 0) {
      log(`\n❌ INVALID DEPARTMENT NAMES (${invalidDepts.length}):`, 'red');
      invalidDepts.forEach(p => {
        log(`   - ${p.email}: "${p.department_name}"`, 'red');
        results.issues.push({ 
          email: p.email, 
          issue: `Invalid department_name: ${p.department_name}` 
        });
      });
    } else {
      log(`\n✅ All HODs have valid department_name`, 'green');
    }

    // ================================================================
    // PART 5: SCHOOL DISTRIBUTION
    // ================================================================
    section('🎓 PART 5: HOD DISTRIBUTION BY SCHOOL');

    const schoolDistribution = new Map();
    hodProfiles.forEach(hod => {
      if (hod.school_ids && hod.school_ids.length > 0) {
        hod.school_ids.forEach(schoolId => {
          const schoolName = schoolMap.get(schoolId)?.name || 'Unknown';
          if (!schoolDistribution.has(schoolName)) {
            schoolDistribution.set(schoolName, []);
          }
          schoolDistribution.get(schoolName).push(hod.email);
        });
      }
    });

    if (schoolDistribution.size > 0) {
      log('HODs by School:', 'cyan');
      for (const [school, hods] of schoolDistribution.entries()) {
        log(`\n📚 ${school}`, 'bright');
        hods.forEach(email => log(`   • ${email}`, 'cyan'));
        log(`   Total: ${hods.length} HOD(s)`, 'green');
      }
    } else {
      log('⚠️  No school-specific HODs found', 'yellow');
    }

    // ================================================================
    // PART 6: STATISTICS SUMMARY
    // ================================================================
    section('📊 PART 6: VERIFICATION STATISTICS');

    const stats = [
      { label: 'Total HOD Profiles', value: results.total, color: 'cyan' },
      { label: 'With Auth User', value: results.withAuth, color: results.withAuth === results.total ? 'green' : 'yellow' },
      { label: 'Email Confirmed', value: results.emailConfirmed, color: results.emailConfirmed === results.total ? 'green' : 'yellow' },
      { label: 'Has School Assignment', value: results.hasSchool, color: 'cyan' },
      { label: 'Has Course Assignment', value: results.hasCourses, color: 'cyan' },
      { label: 'Correct Scoping', value: results.correctScoping, color: 'cyan' },
      { label: 'Can Login', value: results.canLogin, color: results.canLogin === results.total ? 'green' : 'red' },
      { label: 'Total Issues', value: results.issues.length, color: results.issues.length === 0 ? 'green' : 'red' }
    ];

    stats.forEach(stat => {
      const percentage = results.total > 0 ? ((stat.value / results.total) * 100).toFixed(1) : '0.0';
      log(`${stat.label.padEnd(30)}: ${stat.value.toString().padStart(3)} / ${results.total} (${percentage}%)`, stat.color);
    });

    // ================================================================
    // PART 7: ISSUES REPORT
    // ================================================================
    if (results.issues.length > 0) {
      section('⚠️  PART 7: ISSUES FOUND');
      
      log(`Total Issues: ${results.issues.length}`, 'red');
      console.log('');
      
      results.issues.forEach((issue, index) => {
        log(`${index + 1}. ${issue.email}`, 'yellow');
        log(`   Issue: ${issue.issue}`, 'red');
      });

      console.log('\n' + '─'.repeat(70));
      log('RECOMMENDED ACTIONS:', 'bright');
      console.log('─'.repeat(70));

      if (orphanedAuth.length > 0) {
        log('\n1. Fix orphaned auth users (have auth, missing profile):', 'yellow');
        log('   Run this SQL in Supabase:', 'cyan');
        orphanedAuth.forEach(au => {
          console.log(`
   -- For ${au.email}
   INSERT INTO profiles (id, email, full_name, role, department_name, is_active)
   VALUES (
     '${au.id}',
     '${au.email}',
     '${au.user_metadata?.full_name || 'HOD Name'}',
     'department',
     'school_hod',
     true
   );`);
        });
      }

      if (results.emailConfirmed < results.total) {
        log('\n2. Confirm emails for HODs:', 'yellow');
        log('   Go to Supabase Dashboard → Authentication → Users', 'cyan');
        log('   Click each user → Confirm Email', 'cyan');
      }

    } else {
      section('✅ PART 7: NO ISSUES FOUND');
      log('All HOD accounts are properly configured!', 'green');
    }

    // ================================================================
    // PART 8: LOGIN READINESS
    // ================================================================
    section('🔐 PART 8: LOGIN READINESS CHECK');

    const readyToLogin = hodProfiles.filter(hod => {
      const authUser = authUserMap.get(hod.id);
      return authUser && authUser.email_confirmed_at && hod.is_active;
    });

    log(`HODs Ready to Login: ${readyToLogin.length} / ${hodProfiles.length}`, 
      readyToLogin.length === hodProfiles.length ? 'green' : 'yellow');

    if (readyToLogin.length > 0) {
      log('\n✅ These HODs can login now:', 'green');
      readyToLogin.forEach(hod => {
        log(`   • ${hod.email}`, 'cyan');
      });
      log(`\n📝 Login URL: https://your-domain.vercel.app/staff/login`, 'cyan');
      log(`🔑 Default Password: Test@1234`, 'cyan');
    }

    const notReady = hodProfiles.filter(hod => {
      const authUser = authUserMap.get(hod.id);
      return !authUser || !authUser.email_confirmed_at || !hod.is_active;
    });

    if (notReady.length > 0) {
      log(`\n⚠️  These HODs CANNOT login yet (${notReady.length}):`, 'yellow');
      notReady.forEach(hod => {
        const authUser = authUserMap.get(hod.id);
        const reasons = [];
        if (!authUser) reasons.push('No auth user');
        if (authUser && !authUser.email_confirmed_at) reasons.push('Email not confirmed');
        if (!hod.is_active) reasons.push('Profile inactive');
        log(`   • ${hod.email} → ${reasons.join(', ')}`, 'red');
      });
    }

    // ================================================================
    // FINAL SUMMARY
    // ================================================================
    section('✅ VERIFICATION COMPLETE');

    const overallHealth = (results.canLogin / results.total * 100).toFixed(1);
    log(`Overall System Health: ${overallHealth}%`, 
      overallHealth === '100.0' ? 'green' : 'yellow');

    if (results.issues.length === 0 && readyToLogin.length === results.total) {
      log('\n🎉 ALL SYSTEMS GO!', 'green');
      log('   All HOD accounts are properly configured and ready to use.', 'green');
    } else {
      log(`\n⚠️  ACTION REQUIRED`, 'yellow');
      log(`   ${results.issues.length} issue(s) need to be resolved.`, 'yellow');
      log(`   ${notReady.length} HOD(s) cannot login yet.`, 'yellow');
    }

    console.log('\n' + '═'.repeat(70) + '\n');

  } catch (error) {
    log('\n❌ VERIFICATION FAILED', 'red');
    log(`Error: ${error.message}`, 'red');
    if (error.stack) {
      log('\nStack trace:', 'red');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run verification
verifyHODAccounts()
  .then(() => {
    log('✅ Verification script completed successfully\n', 'green');
    process.exit(0);
  })
  .catch((error) => {
    log(`❌ Script failed: ${error.message}\n`, 'red');
    process.exit(1);
  });