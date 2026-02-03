// Final verification that all forms have completed status
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

async function verifyCompletedStatus() {
  console.log('✅ FINAL VERIFICATION: ALL FORMS COMPLETED\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Check forms status
    console.log('📋 1. NO_DUES_FORMS Status:');
    const { data: forms, error: formsError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status, created_at, updated_at');

    if (formsError) {
      console.error('❌ Error:', formsError);
      return;
    }

    const formStatusCounts = {};
    forms.forEach(form => {
      formStatusCounts[form.status] = (formStatusCounts[form.status] || 0) + 1;
    });

    console.log(`   Total Forms: ${forms.length}`);
    Object.entries(formStatusCounts).forEach(([status, count]) => {
      console.log(`   ${status.toUpperCase()}: ${count}`);
    });

    // 2. Check status records
    console.log('\n📋 2. NO_DUES_STATUS Records:');
    const { data: statusRecords, error: statusError } = await supabase
      .from('no_dues_status')
      .select('form_id, department_name, status, action_at, action_by');

    if (statusError) {
      console.error('❌ Error:', statusError);
      return;
    }

    const statusCounts = {};
    statusRecords.forEach(record => {
      statusCounts[record.status] = (statusCounts[record.status] || 0) + 1;
    });

    console.log(`   Total Status Records: ${statusRecords.length}`);
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status.toUpperCase()}: ${count}`);
    });

    // 3. Department-wise breakdown
    console.log('\n📋 3. Department-wise Status:');
    const deptStatusCounts = {};
    statusRecords.forEach(record => {
      if (!deptStatusCounts[record.department_name]) {
        deptStatusCounts[record.department_name] = { approved: 0, pending: 0, rejected: 0 };
      }
      deptStatusCounts[record.department_name][record.status]++;
    });

    Object.entries(deptStatusCounts).forEach(([dept, counts]) => {
      console.log(`   ${dept.replace('_', ' ').toUpperCase()}:`);
      console.log(`     Approved: ${counts.approved}`);
      console.log(`     Pending: ${counts.pending}`);
      console.log(`     Rejected: ${counts.rejected}`);
    });

    // 4. Check unique forms with status records
    const uniqueFormIds = new Set(statusRecords.map(r => r.form_id));
    console.log(`\n📋 4. Coverage Analysis:`);
    console.log(`   Forms with status records: ${uniqueFormIds.size}`);
    console.log(`   Total forms: ${forms.length}`);
    console.log(`   Coverage: ${((uniqueFormIds.size / forms.length) * 100).toFixed(1)}%`);

    // 5. Show sample completed forms
    console.log('\n📋 5. Sample Completed Forms:');
    const completedForms = forms.filter(f => f.status === 'completed').slice(0, 10);
    completedForms.forEach((form, index) => {
      console.log(`   ${index + 1}. ${form.registration_no} - ${form.student_name} - COMPLETED`);
    });

    // 6. Check for any remaining issues
    console.log('\n📋 6. Issue Check:');
    const incompleteForms = forms.filter(f => f.status !== 'completed');
    const pendingStatusRecords = statusRecords.filter(r => r.status !== 'approved');

    if (incompleteForms.length === 0) {
      console.log('   ✅ All forms have COMPLETED status');
    } else {
      console.log(`   ❌ ${incompleteForms.length} forms are not completed`);
    }

    if (pendingStatusRecords.length === 0) {
      console.log('   ✅ All status records are APPROVED');
    } else {
      console.log(`   ❌ ${pendingStatusRecords.length} status records are not approved`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 VERIFICATION COMPLETE!');
    console.log('='.repeat(70));
    
    if (incompleteForms.length === 0 && pendingStatusRecords.length === 0) {
      console.log('✅ SUCCESS: All forms have completed status!');
      console.log('✅ SUCCESS: All status records are approved!');
      console.log('✅ Frontend will show all records as completed');
      console.log('✅ Audit trail is complete and consistent');
    } else {
      console.log('⚠️  Some issues remain - check the output above');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
verifyCompletedStatus().catch(console.error);
