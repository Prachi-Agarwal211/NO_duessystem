#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔄 RESETTING ALL FORMS TO PENDING');
console.log('='.repeat(60));

async function resetAllFormsToPending() {
  try {
    // Confirm before proceeding
    const confirm = process.argv.includes('--force') || 
                   process.argv.includes('-f') ||
                   (await askYesNo('Are you sure you want to reset all forms to pending?'));
    
    if (!confirm) {
      console.log('✅ Operation cancelled');
      return;
    }

    console.log('\n📋 Gathering form data...');
    
    // Get all forms
    const { data: forms, error: formsError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status');

    if (formsError) {
      console.log('❌ Error fetching forms:', formsError.message);
      return;
    }

    console.log(`Found ${forms.length} forms`);

    // Reset all department statuses to pending
    console.log('\n🔧 Resetting department statuses...');
    
    const { error: statusError } = await supabaseAdmin
      .from('no_dues_status')
      .update({
        status: 'pending',
        action_at: null,
        action_by_user_id: null,
        rejection_reason: null
      })
      .neq('status', 'pending'); // Only update non-pending statuses

    if (statusError) {
      console.log('❌ Error resetting department statuses:', statusError.message);
      return;
    }

    // Reset form statuses to pending
    console.log('🔧 Resetting form statuses...');
    
    const { error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .update({
        status: 'pending',
        certificate_url: null,
        blockchain_hash: null,
        blockchain_tx: null,
        final_certificate_generated: false,
        rejection_context: null,
        rejection_reason: null
      })
      .neq('status', 'pending'); // Only update non-pending statuses

    if (formError) {
      console.log('❌ Error resetting form statuses:', formError.message);
      return;
    }

    // Verify the reset
    console.log('\n✅ Verification:');
    
    const { data: verifiedForms, error: verifyError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status, final_certificate_generated')
      .order('registration_no');

    if (verifyError) {
      console.log('❌ Error verifying:', verifyError.message);
    } else {
      console.log(`\nTotal forms: ${verifiedForms.length}`);
      
      // Check status distribution
      const statusCounts = {};
      verifiedForms.forEach(form => {
        statusCounts[form.status] = (statusCounts[form.status] || 0) + 1;
      });
      
      console.log('\nStatus distribution:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      
      // Check certificate generation status
      const certGenerated = verifiedForms.filter(form => form.final_certificate_generated).length;
      console.log(`\nCertificates generated: ${certGenerated}`);
    }

    // Check department statuses
    const { data: statusStats, error: statusStatsError } = await supabaseAdmin
      .from('no_dues_status')
      .select('status, count(*) as count')
      .group('status');

    if (statusStatsError) {
      console.log('❌ Error checking status stats:', statusStatsError.message);
    } else {
      console.log('\nDepartment status distribution:');
      statusStats.forEach(stat => {
        console.log(`  ${stat.status}: ${stat.count}`);
      });
    }

    console.log('\n✅ All forms have been reset to pending status');

  } catch (error) {
    console.log('❌ Script error:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Simple yes/no prompt
function askYesNo(question) {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question(`${question} (y/N): `, (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

resetAllFormsToPending().catch(console.error);
