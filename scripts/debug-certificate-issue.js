#!/usr/bin/env node

/**
 * Debug Certificate Generation Issue
 * 
 * This script helps debug why certificates are not being generated automatically
 * after all departments approve a form.
 */

import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

console.log('✅ Environment variables loaded');
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n🔍 CERTIFICATE GENERATION DEBUG REPORT');
console.log('='.repeat(60));

async function debugCertificateIssue() {
  try {
    // 1. Check for forms that should have certificates
    console.log('\n📋 STEP 1: Finding forms that should have certificates...');
    
    const { data: forms, error: formsError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        registration_no,
        student_name,
        status,
        final_certificate_generated,
        certificate_url,
        created_at,
        no_dues_status (
          department_name,
          status,
          action_at,
          action_by_user_id
        )
      `)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (formsError) {
      console.log('❌ Error fetching forms:', formsError.message);
      return;
    }

    if (!forms || forms.length === 0) {
      console.log('⚠️ No completed forms found');
      return;
    }

    console.log(`✅ Found ${forms.length} completed forms`);

    // 2. Analyze each form
    for (const form of forms) {
      console.log(`\n🔍 Analyzing Form: ${form.registration_no} (${form.student_name})`);
      console.log(`   Status: ${form.status}`);
      console.log(`   Certificate Generated: ${form.final_certificate_generated}`);
      console.log(`   Certificate URL: ${form.certificate_url || 'None'}`);

      // Check department statuses
      const departments = form.no_dues_status || [];
      console.log(`   Departments: ${departments.length}`);
      
      const approvedCount = departments.filter(d => d.status === 'approved').length;
      const rejectedCount = departments.filter(d => d.status === 'rejected').length;
      const pendingCount = departments.filter(d => d.status === 'pending').length;

      console.log(`   Approved: ${approvedCount}, Rejected: ${rejectedCount}, Pending: ${pendingCount}`);

      // 3. Check if certificate should be generated
      if (form.status === 'completed' && !form.final_certificate_generated) {
        console.log('   ⚠️ ISSUE: Form is completed but certificate not generated!');
        
        // Check if all departments are approved
        if (approvedCount === departments.length && departments.length > 0) {
          console.log('   ✅ All departments approved - certificate should be generated');
          
          // Check for any errors in the system
          await checkCertificateGenerationAttempts(form.id);
        } else {
          console.log('   ❌ Not all departments approved - certificate should not be generated yet');
        }
      } else if (form.final_certificate_generated) {
        console.log('   ✅ Certificate already generated');
      } else {
        console.log('   ❌ Form not completed - certificate should not be generated yet');
      }
    }

    // 4. Check for failed certificate generation attempts
    console.log('\n📋 STEP 2: Checking for failed certificate generation...');
    await checkFailedAttempts();

    // 5. Check trigger functionality
    console.log('\n📋 STEP 3: Testing trigger functionality...');
    await testTriggerFunctionality();

  } catch (error) {
    console.log('❌ Debug script error:', error.message);
    console.log('Stack:', error.stack);
  }
}

async function checkCertificateGenerationAttempts(formId) {
  try {
    // Check if there are any certificate generation logs
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('certificate_generation_logs')
      .select('*')
      .eq('form_id', formId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (logsError && logsError.code !== '42P01') { // Table doesn't exist
      console.log('   ❌ Error checking certificate logs:', logsError.message);
      return;
    }

    if (logs && logs.length > 0) {
      console.log('   📝 Certificate generation attempts found:');
      logs.forEach(log => {
        console.log(`     - ${log.created_at}: ${log.status} ${log.error ? `(${log.error})` : ''}`);
      });
    } else {
      console.log('   ⚠️ No certificate generation attempts found');
      console.log('   💡 This suggests the trigger is not calling certificate generation');
    }
  } catch (error) {
    console.log('   ❌ Error checking certificate logs:', error.message);
  }
}

async function checkFailedAttempts() {
  try {
    const { data: failedForms, error: failedError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status, certificate_error, updated_at')
      .not('certificate_error', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (failedError && failedError.code !== '42703') { // Column doesn't exist
      console.log('❌ Error checking failed attempts:', failedError.message);
      return;
    }

    if (failedForms && failedForms.length > 0) {
      console.log(`⚠️ Found ${failedForms.length} forms with certificate errors:`);
      failedForms.forEach(form => {
        console.log(`   - ${form.registration_no}: ${form.certificate_error}`);
      });
    } else {
      console.log('✅ No certificate errors found');
    }
  } catch (error) {
    console.log('❌ Error checking failed attempts:', error.message);
  }
}

async function testTriggerFunctionality() {
  try {
    // Check if the trigger function exists
    const { data: triggerFunction, error: triggerError } = await supabaseAdmin
      .rpc('pg_get_functiondef', { funcname: 'update_form_status' });

    if (triggerError) {
      console.log('❌ Trigger function not found:', triggerError.message);
      return;
    }

    console.log('✅ Trigger function exists');

    // Check if trigger is enabled
    const { data: triggerInfo, error: triggerInfoError } = await supabaseAdmin
      .from('pg_trigger')
      .select('tgname, tgenabled')
      .eq('tgname', 'on_status_update');

    if (triggerInfoError) {
      console.log('❌ Error checking trigger status:', triggerInfoError.message);
      return;
    }

    if (triggerInfo && triggerInfo.length > 0) {
      console.log('✅ Trigger is enabled');
    } else {
      console.log('⚠️ Trigger may not be enabled');
    }

  } catch (error) {
    console.log('❌ Error testing trigger functionality:', error.message);
  }
}

// Run the debug script
debugCertificateIssue().catch(console.error);
