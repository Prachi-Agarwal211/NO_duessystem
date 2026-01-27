// Deep analysis script - check all forms with all departments approved but status != completed
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deepAnalysis() {
    console.log('='.repeat(70));
    console.log('DEEP ANALYSIS: NO DUES FORM LIFECYCLE');
    console.log('='.repeat(70));

    // Step 1: Get all forms with their statuses
    console.log('\n📋 Step 1: Fetching all forms...');
    const { data: forms, error: formsError } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no, status, final_certificate_generated, certificate_url')
        .order('created_at', { ascending: false })
        .limit(20);

    if (formsError) {
        console.log('❌ Error:', formsError.message);
        return;
    }

    console.log(`Found ${forms.length} forms\n`);

    // Step 2: For each form, check if all departments are approved
    console.log('📋 Step 2: Checking each form\'s department statuses...\n');

    const issues = [];

    for (const form of forms) {
        const { data: statuses } = await supabase
            .from('no_dues_status')
            .select('department_name, status')
            .eq('form_id', form.id);

        const total = statuses?.length || 0;
        const approved = statuses?.filter(s => s.status === 'approved').length || 0;
        const pending = statuses?.filter(s => s.status === 'pending').length || 0;
        const rejected = statuses?.filter(s => s.status === 'rejected').length || 0;

        const allApproved = total > 0 && approved === total;
        const shouldBeCompleted = allApproved && form.status !== 'completed';
        const shouldHaveCert = form.status === 'completed' && !form.final_certificate_generated;

        let statusIcon = '✅';
        if (shouldBeCompleted) statusIcon = '🔴';
        else if (shouldHaveCert) statusIcon = '🟡';
        else if (form.status === 'pending' || form.status === 'in_progress') statusIcon = '🔵';

        console.log(`${statusIcon} ${form.registration_no}`);
        console.log(`   Form Status: ${form.status}`);
        console.log(`   Departments: ${approved}/${total} approved, ${pending} pending, ${rejected} rejected`);
        console.log(`   Certificate: ${form.final_certificate_generated ? '✅ Generated' : '❌ Not generated'}`);

        if (shouldBeCompleted) {
            console.log(`   🔴 ISSUE: All departments approved but status is "${form.status}" (should be "completed")`);
            issues.push({
                type: 'STATUS_NOT_COMPLETED',
                formId: form.id,
                regNo: form.registration_no,
                currentStatus: form.status,
                approved, total
            });
        }

        if (shouldHaveCert) {
            console.log(`   🟡 ISSUE: Status is completed but certificate not generated`);
            issues.push({
                type: 'CERT_NOT_GENERATED',
                formId: form.id,
                regNo: form.registration_no
            });
        }

        console.log('');
    }

    // Step 3: Summary
    console.log('='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));

    const statusNotCompleted = issues.filter(i => i.type === 'STATUS_NOT_COMPLETED');
    const certNotGenerated = issues.filter(i => i.type === 'CERT_NOT_GENERATED');

    console.log(`\n❌ Forms with all depts approved but status != completed: ${statusNotCompleted.length}`);
    statusNotCompleted.forEach(i => {
        console.log(`   - ${i.regNo}: ${i.currentStatus} (${i.approved}/${i.total} approved)`);
    });

    console.log(`\n🟡 Forms completed but certificate not generated: ${certNotGenerated.length}`);
    certNotGenerated.forEach(i => {
        console.log(`   - ${i.regNo}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('END OF ANALYSIS');
    console.log('='.repeat(70));
}

deepAnalysis().catch(console.error);
