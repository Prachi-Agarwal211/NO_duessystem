// Script to approve 6 departments for student 22BCOM1367, leaving 1 pending
// Run: node scripts/approve-6-departments.js

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function approve6Departments() {
    try {
        const registrationNo = '22BCOM1367';

        // Step 1: Find the form
        console.log('🔍 Finding form for registration:', registrationNo);
        const { data: forms, error: formError } = await supabase
            .from('no_dues_forms')
            .select('id, registration_no, student_name, status')
            .eq('registration_no', registrationNo);

        if (formError) throw formError;
        if (!forms || forms.length === 0) {
            console.log('❌ No form found for registration:', registrationNo);
            return;
        }

        const form = forms[0];
        console.log('✅ Found form:', form.id, '- Student:', form.student_name, '- Current Status:', form.status);

        // Step 2: Get current department statuses
        console.log('📋 Fetching department statuses...');
        const { data: statuses, error: statusError } = await supabase
            .from('no_dues_status')
            .select('id, department_name, status')
            .eq('form_id', form.id);

        if (statusError) throw statusError;

        console.log('Current departments:');
        statuses.forEach(s => console.log(`  - ${s.department_name}: ${s.status}`));

        // Count approved
        const approvedCount = statuses.filter(s => s.status === 'approved').length;
        const pendingStatuses = statuses.filter(s => s.status === 'pending');

        console.log(`\n📊 Approved: ${approvedCount}, Pending: ${pendingStatuses.length}`);

        if (approvedCount >= 6) {
            console.log('⚠️ Already has 6+ approved departments');
            return;
        }

        // Step 3: Approve 6 departments (leave 1 pending)
        const toApprove = pendingStatuses.slice(0, 6 - approvedCount);
        console.log(`\n🎯 Approving ${toApprove.length} departments...`);

        const { data: updateResult, error: updateError } = await supabase
            .from('no_dues_status')
            .update({
                status: 'approved',
                action_at: new Date().toISOString(),
                action_by_user_id: 'system-auto-approve'
            })
            .in('id', toApprove.map(s => s.id))
            .select();

        if (updateError) throw updateError;

        console.log('✅ Approved departments:');
        updateResult.forEach(s => console.log(`  - ${s.department_name}`));

        // Step 4: Verify final status
        console.log('\n🔍 Verifying final status...');
        const { data: finalStatuses, error: finalError } = await supabase
            .from('no_dues_status')
            .select('department_name, status')
            .eq('form_id', form.id);

        if (finalError) throw finalError;

        console.log('\n📊 Final Department Status:');
        finalStatuses.forEach(s => console.log(`  - ${s.department_name}: ${s.status}`));

        const finalApproved = finalStatuses.filter(s => s.status === 'approved').length;
        const finalPending = finalStatuses.filter(s => s.status === 'pending').length;

        console.log(`\n✅ Total Approved: ${finalApproved}, Pending: ${finalPending}`);

        if (finalApproved === 6 && finalPending === 1) {
            console.log('\n🎉 6 departments approved, 1 pending - Certificate should trigger!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

approve6Departments();
