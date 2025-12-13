/**
 * COMPLETE DATABASE CLEANUP SCRIPT
 * 
 * This script:
 * 1. Removes ALL department statuses from manual entries
 * 2. Resets convocation status to "not_started"
 * 3. Clears form_id links in convocation table
 * 4. Verifies cleanup was successful
 * 5. Provides detailed report
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  console.log('\n' + '═'.repeat(70));
  log(title, 'bright');
  console.log('═'.repeat(70) + '\n');
}

async function main() {
  try {
    section('🚀 STARTING COMPLETE DATABASE CLEANUP');

    const results = {
      manualEntriesFound: 0,
      departmentStatusesDeleted: 0,
      convocationRecordsReset: 0,
      errors: []
    };

    // ================================================================
    // STEP 1: ANALYZE MANUAL ENTRIES
    // ================================================================
    section('📊 STEP 1: Analyzing Manual Entries');

    const { data: manualEntries, error: manualError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status, is_manual_entry')
      .eq('is_manual_entry', true);

    if (manualError) {
      log(`❌ Error fetching manual entries: ${manualError.message}`, 'red');
      results.errors.push(manualError.message);
    } else {
      results.manualEntriesFound = manualEntries?.length || 0;
      log(`✅ Found ${results.manualEntriesFound} manual entries`, 'green');
      
      if (manualEntries && manualEntries.length > 0) {
        console.log('\nManual Entries:');
        manualEntries.forEach(entry => {
          console.log(`  • ${entry.registration_no} - ${entry.student_name} (${entry.status})`);
        });
      }
    }

    // ================================================================
    // STEP 2: CHECK DEPARTMENT STATUSES FOR MANUAL ENTRIES
    // ================================================================
    section('📋 STEP 2: Checking Department Statuses');

    if (manualEntries && manualEntries.length > 0) {
      const manualFormIds = manualEntries.map(e => e.id);

      const { data: existingStatuses, error: statusCheckError } = await supabase
        .from('no_dues_status')
        .select('id, form_id, department_name, status')
        .in('form_id', manualFormIds);

      if (statusCheckError) {
        log(`❌ Error checking statuses: ${statusCheckError.message}`, 'red');
        results.errors.push(statusCheckError.message);
      } else {
        const statusCount = existingStatuses?.length || 0;
        
        if (statusCount > 0) {
          log(`⚠️  Found ${statusCount} department statuses for manual entries (SHOULD BE 0)`, 'yellow');
          console.log('\nDepartment statuses to delete:');
          
          const statusByReg = {};
          existingStatuses.forEach(status => {
            const entry = manualEntries.find(e => e.id === status.form_id);
            if (entry) {
              if (!statusByReg[entry.registration_no]) {
                statusByReg[entry.registration_no] = [];
              }
              statusByReg[entry.registration_no].push(status.department_name);
            }
          });

          Object.entries(statusByReg).forEach(([reg, depts]) => {
            console.log(`  • ${reg}: ${depts.join(', ')}`);
          });
        } else {
          log('✅ No department statuses found (database is clean)', 'green');
        }
      }
    }

    // ================================================================
    // STEP 3: DELETE DEPARTMENT STATUSES FROM MANUAL ENTRIES
    // ================================================================
    section('🗑️  STEP 3: Deleting Department Statuses from Manual Entries');

    if (manualEntries && manualEntries.length > 0) {
      const manualFormIds = manualEntries.map(e => e.id);

      const { error: deleteError, count } = await supabase
        .from('no_dues_status')
        .delete({ count: 'exact' })
        .in('form_id', manualFormIds);

      if (deleteError) {
        log(`❌ Error deleting statuses: ${deleteError.message}`, 'red');
        results.errors.push(deleteError.message);
      } else {
        results.departmentStatusesDeleted = count || 0;
        if (count && count > 0) {
          log(`✅ Deleted ${count} department statuses`, 'green');
        } else {
          log('✅ No department statuses to delete (already clean)', 'green');
        }
      }
    }

    // ================================================================
    // STEP 4: RESET CONVOCATION TABLE
    // ================================================================
    section('🎓 STEP 4: Resetting Convocation Table');

    // Get current convocation records
    const { data: convocationBefore, error: convBeforeError } = await supabase
      .from('convocation_eligible_students')
      .select('registration_no, status, form_id');

    if (convBeforeError) {
      log(`❌ Error fetching convocation data: ${convBeforeError.message}`, 'red');
      results.errors.push(convBeforeError.message);
    } else {
      const totalConv = convocationBefore?.length || 0;
      const withForms = convocationBefore?.filter(c => c.form_id !== null).length || 0;
      const nonPending = convocationBefore?.filter(c => c.status !== 'not_started').length || 0;

      log(`📊 Found ${totalConv} convocation records`, 'cyan');
      log(`   • ${withForms} have form_id links`, 'cyan');
      log(`   • ${nonPending} have status other than "not_started"`, 'cyan');

      // Reset all convocation records
      const { error: resetError, count: resetCount } = await supabase
        .from('convocation_eligible_students')
        .update({ 
          status: 'not_started',
          form_id: null 
        })
        .neq('status', 'not_started'); // Only update non-pending

      if (resetError) {
        log(`❌ Error resetting convocation: ${resetError.message}`, 'red');
        results.errors.push(resetError.message);
      } else {
        results.convocationRecordsReset = resetCount || 0;
        if (resetCount && resetCount > 0) {
          log(`✅ Reset ${resetCount} convocation records to "not_started"`, 'green');
        } else {
          log('✅ All convocation records already at "not_started"', 'green');
        }
      }
    }

    // ================================================================
    // STEP 5: VERIFICATION
    // ================================================================
    section('✅ STEP 5: Verification');

    // Verify manual entries have no department statuses
    if (manualEntries && manualEntries.length > 0) {
      const manualFormIds = manualEntries.map(e => e.id);
      
      const { data: remainingStatuses, error: verifyError } = await supabase
        .from('no_dues_status')
        .select('id', { count: 'exact', head: true })
        .in('form_id', manualFormIds);

      if (verifyError) {
        log(`⚠️  Verification error: ${verifyError.message}`, 'yellow');
      } else {
        const remaining = remainingStatuses?.length || 0;
        if (remaining === 0) {
          log('✅ VERIFIED: No department statuses for manual entries', 'green');
        } else {
          log(`❌ WARNING: ${remaining} department statuses still exist!`, 'red');
        }
      }
    }

    // Verify convocation reset
    const { data: convocationAfter, error: convAfterError } = await supabase
      .from('convocation_eligible_students')
      .select('status, form_id', { count: 'exact' })
      .or('status.neq.not_started,form_id.not.is.null');

    if (convAfterError) {
      log(`⚠️  Convocation verification error: ${convAfterError.message}`, 'yellow');
    } else {
      const problematic = convocationAfter?.length || 0;
      if (problematic === 0) {
        log('✅ VERIFIED: All convocation records reset to "not_started"', 'green');
      } else {
        log(`⚠️  ${problematic} convocation records still have issues`, 'yellow');
      }
    }

    // ================================================================
    // STEP 6: SPECIFIC CHECK FOR 21BCON750
    // ================================================================
    section('🔍 STEP 6: Checking 21BCON750 Specifically');

    const { data: student21BCON750, error: studentError } = await supabase
      .from('no_dues_forms')
      .select(`
        id,
        registration_no,
        student_name,
        status,
        is_manual_entry,
        no_dues_status (
          id,
          department_name,
          status
        )
      `)
      .eq('registration_no', '21BCON750')
      .single();

    if (studentError) {
      log(`❌ Error checking 21BCON750: ${studentError.message}`, 'red');
    } else if (student21BCON750) {
      console.log('\n21BCON750 Details:');
      console.log(`  Registration: ${student21BCON750.registration_no}`);
      console.log(`  Name: ${student21BCON750.student_name}`);
      console.log(`  Status: ${student21BCON750.status}`);
      console.log(`  Manual Entry: ${student21BCON750.is_manual_entry}`);
      console.log(`  Department Statuses: ${student21BCON750.no_dues_status?.length || 0}`);
      
      if (student21BCON750.is_manual_entry && student21BCON750.no_dues_status?.length === 0) {
        log('\n✅ 21BCON750 is CORRECT (manual entry with no dept statuses)', 'green');
      } else if (student21BCON750.is_manual_entry && student21BCON750.no_dues_status?.length > 0) {
        log('\n❌ 21BCON750 still has department statuses!', 'red');
        console.log('   Departments:', student21BCON750.no_dues_status.map(s => s.department_name).join(', '));
      } else {
        log('\n⚠️  21BCON750 is NOT a manual entry', 'yellow');
      }
    }

    // ================================================================
    // FINAL SUMMARY
    // ================================================================
    section('📊 CLEANUP COMPLETE - SUMMARY');

    console.log('Results:');
    console.log(`  ✅ Manual entries found: ${results.manualEntriesFound}`);
    console.log(`  🗑️  Department statuses deleted: ${results.departmentStatusesDeleted}`);
    console.log(`  🎓 Convocation records reset: ${results.convocationRecordsReset}`);
    console.log(`  ❌ Errors encountered: ${results.errors.length}`);

    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    log('✅ DATABASE CLEANUP COMPLETE!', 'green');
    console.log('═'.repeat(70));

    console.log('\nNext Steps:');
    console.log('1. Clear browser cache/localStorage');
    console.log('2. Refresh student status page');
    console.log('3. Verify 21BCON750 shows "Admin Approved" with NO departments');
    console.log('4. Test submitting a new manual entry');
    console.log('5. Test submitting a new online form\n');

  } catch (error) {
    log(`\n❌ SCRIPT FAILED: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();