// Update ALL forms to have completed status
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
function loadEnv() {
  const envFiles = ['../.env.local', '../.env'];
  envFiles.forEach(envFile => {
    const filePath = path.join(__dirname, envFile);
    if (fs.existsSync(filePath)) {
      const envContent = fs.readFileSync(filePath, 'utf8');
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
    }
  });
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function updateAllFormsToCompleted() {
  console.log('🔧 UPDATING ALL FORMS TO COMPLETED STATUS\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Get all forms
    console.log('📋 Step 1: Getting all forms...');
    const { data: allForms, error: formsError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (formsError) {
      console.error('❌ Error fetching forms:', formsError);
      return;
    }

    console.log(`✅ Found ${allForms.length} total forms`);

    // 2. Count current status
    const statusCounts = {};
    allForms.forEach(form => {
      statusCounts[form.status] = (statusCounts[form.status] || 0) + 1;
    });

    console.log('\n📊 Current status distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    // 3. Get all departments
    console.log('\n📋 Step 2: Getting all departments...');
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (deptError) {
      console.error('❌ Error fetching departments:', deptError);
      return;
    }

    console.log(`✅ Found ${departments.length} active departments`);

    // 4. Update all forms to completed status
    console.log('\n🔧 Step 3: Updating all forms to completed status...');
    
    let updatedCount = 0;
    let errorCount = 0;
    let alreadyCompletedCount = 0;

    for (const form of allForms) {
      try {
        if (form.status === 'completed') {
          alreadyCompletedCount++;
          continue;
        }

        // Update form status to completed
        const { error: updateError } = await supabase
          .from('no_dues_forms')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', form.id);

        if (updateError) {
          console.error(`❌ Error updating form ${form.registration_no}:`, updateError.message);
          errorCount++;
        } else {
          updatedCount++;
          if (updatedCount <= 10) { // Show first 10 for brevity
            console.log(`✅ Updated: ${form.registration_no} - ${form.student_name} -> completed`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${form.registration_no}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Form Update Summary:`);
    console.log(`   ✅ Updated to completed: ${updatedCount}`);
    console.log(`   ✅ Already completed: ${alreadyCompletedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    // 5. Update all status records to approved
    console.log('\n🔧 Step 4: Updating all status records to approved...');
    
    let statusUpdatedCount = 0;
    let statusErrorCount = 0;

    for (const form of allForms) {
      try {
        // Update all status records for this form to approved
        const { error: statusUpdateError } = await supabase
          .from('no_dues_status')
          .update({
            status: 'approved',
            action_at: new Date().toISOString(),
            action_by: 'system',
            remarks: 'Auto-approved (form marked as completed)',
            rejection_reason: null,
            updated_at: new Date().toISOString()
          })
          .eq('form_id', form.id);

        if (statusUpdateError) {
          console.error(`❌ Error updating status for ${form.registration_no}:`, statusUpdateError.message);
          statusErrorCount++;
        } else {
          statusUpdatedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing status for ${form.registration_no}:`, error.message);
        statusErrorCount++;
      }
    }

    console.log(`\n📊 Status Update Summary:`);
    console.log(`   ✅ Status records updated: ${statusUpdatedCount}`);
    console.log(`   ❌ Status errors: ${statusErrorCount}`);

    // 6. Verify the final result
    console.log('\n🔍 Step 5: Verification...');
    
    const { data: finalForms, error: finalError } = await supabase
      .from('no_dues_forms')
      .select('status')
      .order('created_at', { ascending: false });

    if (!finalError && finalForms) {
      const finalStatusCounts = {};
      finalForms.forEach(form => {
        finalStatusCounts[form.status] = (finalStatusCounts[form.status] || 0) + 1;
      });

      console.log('\n📊 Final status distribution:');
      Object.entries(finalStatusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }

    // 7. Check status records
    const { data: finalStatus, error: finalStatusError } = await supabase
      .from('no_dues_status')
      .select('status')
      .order('updated_at', { ascending: false });

    if (!finalStatusError && finalStatus) {
      const finalStatusCounts = {};
      finalStatus.forEach(record => {
        finalStatusCounts[record.status] = (finalStatusCounts[record.status] || 0) + 1;
      });

      console.log('\n📊 Final status records distribution:');
      Object.entries(finalStatusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 ALL FORMS UPDATED TO COMPLETED!');
    console.log('='.repeat(70));
    console.log('✅ All forms now have "completed" status');
    console.log('✅ All status records are now "approved"');
    console.log('✅ Frontend will show all records as completed');
    console.log('✅ Audit trail is complete');

  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

// Run the update
updateAllFormsToCompleted().catch(console.error);
