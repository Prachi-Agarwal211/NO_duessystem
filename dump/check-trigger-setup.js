#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 CHECKING TRIGGER SETUP');
console.log('='.repeat(60));

async function checkTriggerSetup() {
  try {
    // Check if the form status trigger exists
    const { data: formTrigger, error: formTriggerError } = await supabaseAdmin
      .from('pg_trigger')
      .select('tgname, tgrelid::regclass, tgfoid::regproc, tgenabled')
      .eq('tgname', 'trigger_update_form_status');

    if (formTriggerError) {
      console.log('❌ Error checking form trigger:', formTriggerError.message);
    } else if (formTrigger && formTrigger.length > 0) {
      console.log('✅ Form status trigger exists');
      console.log('   Name:', formTrigger[0].tgname);
      console.log('   Table:', formTrigger[0].tgrelid);
      console.log('   Function:', formTrigger[0].tgfoid);
      console.log('   Enabled:', formTrigger[0].tgenabled);
    } else {
      console.log('❌ Form status trigger NOT found');
    }

    // Check if the department status trigger exists
    const { data: deptTrigger, error: deptTriggerError } = await supabaseAdmin
      .from('pg_trigger')
      .select('tgname, tgrelid::regclass, tgfoid::regproc, tgenabled')
      .eq('tgname', 'trigger_handle_department_status');

    if (deptTriggerError) {
      console.log('❌ Error checking department trigger:', deptTriggerError.message);
    } else if (deptTrigger && deptTrigger.length > 0) {
      console.log('\n✅ Department status trigger exists');
      console.log('   Name:', deptTrigger[0].tgname);
      console.log('   Table:', deptTrigger[0].tgrelid);
      console.log('   Function:', deptTrigger[0].tgfoid);
      console.log('   Enabled:', deptTrigger[0].tgenabled);
    } else {
      console.log('\n❌ Department status trigger NOT found');
    }

    // Check if the initialize departments trigger exists
    const { data: initTrigger, error: initTriggerError } = await supabaseAdmin
      .from('pg_trigger')
      .select('tgname, tgrelid::regclass, tgfoid::regproc, tgenabled')
      .eq('tgname', 'trigger_initialize_departments');

    if (initTriggerError) {
      console.log('❌ Error checking initialize trigger:', initTriggerError.message);
    } else if (initTrigger && initTrigger.length > 0) {
      console.log('\n✅ Initialize departments trigger exists');
      console.log('   Name:', initTrigger[0].tgname);
      console.log('   Table:', initTrigger[0].tgrelid);
      console.log('   Function:', initTrigger[0].tgfoid);
      console.log('   Enabled:', initTrigger[0].tgenabled);
    } else {
      console.log('\n❌ Initialize departments trigger NOT found');
    }

    // Check if functions exist
    console.log('\n📋 CHECKING FUNCTIONS');
    
    const functionsToCheck = [
      'check_and_trigger_certificate',
      'handle_department_status_update',
      'initialize_form_departments',
      'debug_form_status'
    ];

    for (const funcName of functionsToCheck) {
      try {
        const { data: funcData, error: funcError } = await supabaseAdmin
          .rpc('pg_proc', { proname: funcName });
          
        if (funcError) {
          console.log(`❌ Function ${funcName}: ${funcError.message}`);
        } else {
          console.log(`✅ Function ${funcName}: exists`);
        }
      } catch (e) {
        console.log(`❌ Function ${funcName}: ${e.message}`);
      }
    }

    // Check a recent form that was completed
    console.log('\n📋 CHECKING RECENT COMPLETED FORM');
    const { data: recentCompleted, error: recentError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status, final_certificate_generated, certificate_url, updated_at')
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (recentError) {
      console.log('❌ Error getting recent form:', recentError.message);
    } else {
      console.log(`✅ Recent completed form: ${recentCompleted.registration_no}`);
      console.log(`   Status: ${recentCompleted.status}`);
      console.log(`   Certificate Generated: ${recentCompleted.final_certificate_generated}`);
      console.log(`   Certificate URL: ${recentCompleted.certificate_url}`);
      
      // Check department statuses
      const { data: deptStatuses, error: deptStatusError } = await supabaseAdmin
        .from('no_dues_status')
        .select('department_name, status, action_at, action_by_user_id')
        .eq('form_id', recentCompleted.id);
        
      if (deptStatusError) {
        console.log('❌ Error getting department statuses:', deptStatusError.message);
      } else {
        console.log(`   Departments: ${deptStatuses.length}`);
        deptStatuses.forEach(dept => {
          console.log(`   - ${dept.department_name}: ${dept.status}`);
        });
      }
    }

  } catch (error) {
    console.log('❌ Script error:', error.message);
    console.log('Stack:', error.stack);
  }
}

checkTriggerSetup().catch(console.error);
