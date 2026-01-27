// Setup test student 22BCOM1367 for certificate generation test
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupTestStudent() {
    console.log('='.repeat(60));
    console.log('🧪 SETUP TEST STUDENT 22BCOM1367');
    console.log('='.repeat(60));

    try {
        // Step 1: Find the student
        console.log('\n📋 Step 1: Finding student 22BCOM1367...');
        const { data: forms, error: formError } = await supabase
            .from('no_dues_forms')
            .select('id, registration_no, status, final_certificate_generated')
            .eq('registration_no', '22BCOM1367');

        if (formError) {
            console.log('❌ Error finding student:', formError.message);
            return;
        }

        if (!forms || forms.length === 0) {
            console.log('❌ Student 22BCOM1367 not found!');
            return;
        }

        const form = forms[0];
        console.log('✅ Found student');
        console.log('   Form ID:', form.id);
        console.log('   Current Status:', form.status);
        console.log('   Certificate Generated:', form.final_certificate_generated);

        // Step 2: Check department statuses
        console.log('\n📋 Step 2: Checking department statuses...');
        const { data: statuses, error: statusError } = await supabase
            .from('no_dues_status')
            .select('id, department_name, status')
            .eq('form_id', form.id);

        if (statusError) {
            console.log('❌ Error fetching statuses:', statusError.message);
            return;
        }

        console.log('✅ Found', statuses.length, 'departments:');
        statuses.forEach(s => {
            console.log(`   - ${s.department_name}: ${s.status}`);
        });

        // Step 3: Approve all but one department
        if (statuses.length > 0) {
            console.log('\n📋 Step 3: Setting up test scenario...');

            // Pick the last department to keep as pending
            const pendingDept = statuses[statuses.length - 1].department_name;
            const deptsToApprove = statuses.filter(s => s.department_name !== pendingDept);

            console.log(`   Will APPROVE: ${deptsToApprove.map(d => d.department_name).join(', ')}`);
            console.log(`   Will keep PENDING: ${pendingDept}`);

            // Approve all except one
            for (const dept of deptsToApprove) {
                const { error: updateError } = await supabase
                    .from('no_dues_status')
                    .update({
                        status: 'approved',
                        action_at: new Date().toISOString(),
                        action_by: 'TEST_SCRIPT'
                    })
                    .eq('id', dept.id);

                if (updateError) {
                    console.log(`❌ Failed to approve ${dept.department_name}:`, updateError.message);
                } else {
                    console.log(`✅ Approved: ${dept.department_name}`);
                }
            }

            // Step 4: Update form status to in_progress
            console.log('\n📋 Step 4: Updating form status...');
            const { error: formUpdateError } = await supabase
                .from('no_dues_forms')
                .update({
                    status: 'in_progress',
                    updated_at: new Date().toISOString()
                })
                .eq('id', form.id);

            if (formUpdateError) {
                console.log('❌ Failed to update form status:', formUpdateError.message);
            } else {
                console.log('✅ Form status set to: in_progress');
            }

            console.log('\n' + '='.repeat(60));
            console.log('🎯 TEST SCENARIO READY');
            console.log('='.repeat(60));
            console.log('\nTo test automatic certificate generation:');
            console.log('1. Login as staff/HOD for the pending department');
            console.log('2. Approve the remaining department (' + pendingDept + ')');
            console.log('3. The system should automatically generate certificate');
            console.log('\nOR manually trigger with:');
            console.log('   node scripts/trigger-cert.js ' + form.id);
            console.log('\n');
        } else {
            console.log('❌ No department statuses found for this form!');
        }

    } catch (err) {
        console.error('💥 Error:', err.message);
    }
}

setupTestStudent();
