#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 CHECKING RECENT APPROVALS');
console.log('='.repeat(60));

async function checkRecentApprovals() {
  try {
    // Get all forms with all departments approved but not marked as completed
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
        updated_at,
        no_dues_status (
          department_name,
          status,
          action_at,
          action_by_user_id
        )
      `)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (formsError) {
      console.log('❌ Error fetching forms:', formsError.message);
      return;
    }

    console.log(`\n📋 Found ${forms.length} forms to analyze`);

    for (const form of forms) {
      console.log(`\n🔍 Form: ${form.registration_no} (${form.student_name})`);
      console.log(`   Status: ${form.status}`);
      console.log(`   Updated: ${form.updated_at}`);
      
      const departments = form.no_dues_status || [];
      const approvedCount = departments.filter(d => d.status === 'approved').length;
      const rejectedCount = departments.filter(d => d.status === 'rejected').length;
      const pendingCount = departments.filter(d => d.status === 'pending').length;

      console.log(`   Departments: ${departments.length}`);
      console.log(`   Approved: ${approvedCount}, Rejected: ${rejectedCount}, Pending: ${pendingCount}`);

      if (approvedCount === departments.length && departments.length > 0 && form.status !== 'completed') {
        console.log('   ⚠️ ISSUE: All departments approved but form not marked as completed!');
      } else if (form.status === 'completed' && !form.final_certificate_generated) {
        console.log('   ⚠️ ISSUE: Form completed but certificate not generated!');
      } else if (form.status === 'completed' && form.final_certificate_generated && !form.certificate_url) {
        console.log('   ⚠️ ISSUE: Certificate marked as generated but no URL!');
      }
    }

    // Check the database trigger function
    console.log('\n📋 CHECKING DATABASE TRIGGER');
    
    try {
      const { data: functionData, error: functionError } = await supabaseAdmin
        .rpc('pg_proc', { proname: 'trigger_update_form_status' });
        
      if (functionError) {
        console.log('❌ Trigger function not found:', functionError.message);
      } else {
        console.log('✅ Trigger function found');
      }
    } catch (e) {
      console.log('❌ Error checking trigger function:', e.message);
    }

  } catch (error) {
    console.log('❌ Script error:', error.message);
    console.log('Stack:', error.stack);
  }
}

checkRecentApprovals().catch(console.error);
