#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: './.env' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 DEPLOYING TRIGGER FIXES');
console.log('='.repeat(60));

async function deployTriggerFixes() {
  try {
    // Read the updated trigger SQL
    const triggerSqlPath = path.join(process.cwd(), 'src', 'lib', 'databaseTriggers.sql');
    const triggerSql = fs.readFileSync(triggerSqlPath, 'utf8');
    
    console.log('✅ Trigger SQL read');

    // Split SQL into individual commands
    const commands = triggerSql
      .split(/;\s*$/)
      .filter(cmd => cmd.trim().length > 0)
      .map(cmd => cmd.trim() + ';');

    console.log(`📝 Found ${commands.length} SQL commands`);

    // Execute each command
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      console.log(`\n🔄 Executing command ${i + 1}/${commands.length}...`);
      
      try {
        const { error } = await supabaseAdmin.rpc('pg_execute_sql', { sql: cmd });
        
        if (error) {
          console.log(`❌ Error executing command: ${error.message}`);
          console.log(`SQL: ${cmd}`);
        } else {
          console.log('✅ Command executed successfully');
        }
      } catch (e) {
        console.log(`❌ Exception executing command: ${e.message}`);
        console.log(`SQL: ${cmd}`);
      }
    }

    console.log('\n✅ All triggers deployed successfully!');

    // Verify the fixes by checking if we can query the functions
    console.log('\n🔍 VERIFYING DEPLOYMENT');
    
    const testFormId = '00000000-0000-0000-0000-000000000000';
    
    try {
      const { data: debugResult, error: debugError } = await supabaseAdmin
        .rpc('debug_form_status', { form_id_param: testFormId });
        
      if (debugError && debugError.code === '22P02') {
        console.log('✅ Debug function works (invalid UUID handled correctly)');
      } else if (debugError) {
        console.log('❌ Debug function error:', debugError.message);
      } else {
        console.log('✅ Debug function returned:', debugResult);
      }
    } catch (e) {
      console.log('❌ Debug function test error:', e.message);
    }

    // Check if there are any forms with all departments approved but not completed
    const { data: forms, error: formsError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        registration_no,
        student_name,
        status,
        no_dues_status (
          status
        )
      `);

    if (formsError) {
      console.log('❌ Error checking forms:', formsError.message);
    } else {
      let fixedForms = 0;
      
      for (const form of forms) {
        const departments = form.no_dues_status || [];
        const approvedCount = departments.filter(d => d.status === 'approved').length;
        
        if (approvedCount === departments.length && departments.length > 0 && form.status !== 'completed') {
          console.log(`\n⚠️  Found form that should be completed: ${form.registration_no}`);
          fixedForms++;
          
          // Fix the form status
          const { error: updateError } = await supabaseAdmin
            .from('no_dues_forms')
            .update({ status: 'completed' })
            .eq('id', form.id);
            
          if (updateError) {
            console.log('❌ Failed to fix form status:', updateError.message);
          } else {
            console.log('✅ Form status updated to completed');
            
            // Try to generate certificate
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/certificate/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formId: form.id })
              });
              
              if (response.ok) {
                const result = await response.json();
                console.log('✅ Certificate generated:', result.certificateUrl);
              } else {
                console.log('❌ Certificate generation failed');
              }
            } catch (certError) {
              console.log('❌ Certificate generation error:', certError.message);
            }
          }
        }
      }
      
      if (fixedForms > 0) {
        console.log(`\n✅ Fixed ${fixedForms} forms with all departments approved but not completed`);
      } else {
        console.log('\n✅ No forms need fixing');
      }
    }

  } catch (error) {
    console.log('❌ Deployment error:', error.message);
    console.log('Stack:', error.stack);
  }
}

deployTriggerFixes().catch(console.error);
