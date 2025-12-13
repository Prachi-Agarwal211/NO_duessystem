/**
 * FIND 21BCON750 - DIAGNOSTIC SCRIPT
 * Locate this student in the database and show all related data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  try {
    console.log('\n' + '═'.repeat(70));
    log('🔍 SEARCHING FOR 21BCON750', 'bright');
    console.log('═'.repeat(70) + '\n');

    // Search in no_dues_forms (without .single() to avoid error)
    const { data: forms, error: formsError } = await supabase
      .from('no_dues_forms')
      .select('*')
      .eq('registration_no', '21BCON750');

    if (formsError) {
      log(`❌ Error searching forms: ${formsError.message}`, 'red');
    } else if (!forms || forms.length === 0) {
      log('❌ 21BCON750 NOT FOUND in no_dues_forms table', 'red');
      log('\nThis student does not exist in the database.', 'yellow');
      log('Possible reasons:', 'yellow');
      log('  1. Student has not submitted any form yet', 'yellow');
      log('  2. Registration number is different (check spelling/case)', 'yellow');
      log('  3. Student data was deleted', 'yellow');
    } else {
      log(`✅ Found ${forms.length} record(s) for 21BCON750`, 'green');
      
      forms.forEach((form, index) => {
        console.log(`\n${'─'.repeat(70)}`);
        log(`RECORD #${index + 1}:`, 'cyan');
        console.log(`${'─'.repeat(70)}`);
        console.log(`ID: ${form.id}`);
        console.log(`Registration: ${form.registration_no}`);
        console.log(`Student Name: ${form.student_name}`);
        console.log(`Status: ${form.status}`);
        console.log(`Is Manual Entry: ${form.is_manual_entry}`);
        console.log(`School: ${form.school}`);
        console.log(`Course: ${form.course}`);
        console.log(`Branch: ${form.branch || 'N/A'}`);
        console.log(`Personal Email: ${form.personal_email}`);
        console.log(`College Email: ${form.college_email}`);
        console.log(`Contact: ${form.contact_no}`);
        console.log(`Manual Certificate URL: ${form.manual_certificate_url || 'N/A'}`);
        console.log(`Rejection Reason: ${form.rejection_reason || 'N/A'}`);
        console.log(`Created: ${form.created_at}`);
        console.log(`Updated: ${form.updated_at}`);
      });

      // Check department statuses
      console.log(`\n${'═'.repeat(70)}`);
      log('📋 DEPARTMENT STATUSES:', 'bright');
      console.log('═'.repeat(70));

      const formIds = forms.map(f => f.id);
      const { data: statuses, error: statusError } = await supabase
        .from('no_dues_status')
        .select('*')
        .in('form_id', formIds)
        .order('created_at', { ascending: true });

      if (statusError) {
        log(`❌ Error fetching statuses: ${statusError.message}`, 'red');
      } else if (!statuses || statuses.length === 0) {
        log('✅ No department statuses found (CORRECT for manual entry)', 'green');
      } else {
        log(`⚠️  Found ${statuses.length} department statuses:`, 'yellow');
        statuses.forEach((status, i) => {
          console.log(`\n  ${i + 1}. ${status.department_name}`);
          console.log(`     Status: ${status.status}`);
          console.log(`     Reason: ${status.rejection_reason || 'N/A'}`);
          console.log(`     Created: ${status.created_at}`);
          console.log(`     Updated: ${status.updated_at}`);
        });
      }
    }

    // Check convocation table
    console.log(`\n${'═'.repeat(70)}`);
    log('🎓 CONVOCATION DATA:', 'bright');
    console.log('═'.repeat(70));

    const { data: convocation, error: convError } = await supabase
      .from('convocation_eligible_students')
      .select('*')
      .eq('registration_no', '21BCON750');

    if (convError) {
      log(`❌ Error: ${convError.message}`, 'red');
    } else if (!convocation || convocation.length === 0) {
      log('⚠️  Not found in convocation table', 'yellow');
    } else {
      convocation.forEach(conv => {
        console.log(`\nRegistration: ${conv.registration_no}`);
        console.log(`Student Name: ${conv.student_name}`);
        console.log(`School: ${conv.school}`);
        console.log(`Admission Year: ${conv.admission_year}`);
        console.log(`Status: ${conv.status}`);
        console.log(`Form ID Link: ${conv.form_id || 'NULL'}`);
      });
    }

    // Search for similar registration numbers
    console.log(`\n${'═'.repeat(70)}`);
    log('🔎 SEARCHING FOR SIMILAR REGISTRATION NUMBERS:', 'bright');
    console.log('═'.repeat(70));

    const { data: similar, error: similarError } = await supabase
      .from('no_dues_forms')
      .select('registration_no, student_name, status, is_manual_entry')
      .ilike('registration_no', '%21BCON%')
      .limit(10);

    if (similarError) {
      log(`❌ Error: ${similarError.message}`, 'red');
    } else if (similar && similar.length > 0) {
      log(`\nFound ${similar.length} students with similar registration numbers:`, 'cyan');
      similar.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.registration_no} - ${s.student_name} (${s.status}${s.is_manual_entry ? ', Manual' : ''})`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    log('🔍 SEARCH COMPLETE', 'bright');
    console.log('═'.repeat(70) + '\n');

  } catch (error) {
    log(`\n❌ SCRIPT FAILED: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();