// Verify full certificate generation cycle
// Run: node scripts/verify-full-cycle.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyFullCycle() {
    try {
        const formId = '9efc323a-0431-4d52-8744-0c7935917f36';

        console.log('🔍 Verifying full certificate generation cycle...\n');

        // Step 1: Check form status
        console.log('1️⃣ Checking form status...');
        const { data: form, error: formError } = await supabase
            .from('no_dues_forms')
            .select('id, registration_no, status, final_certificate_generated, certificate_url, blockchain_verified')
            .eq('id', formId)
            .single();

        if (formError) throw formError;

        console.log(`   Form ID: ${form.id}`);
        console.log(`   Registration: ${form.registration_no}`);
        console.log(`   Status: ${form.status}`);
        console.log(`   final_certificate_generated: ${form.final_certificate_generated}`);
        console.log(`   certificate_url: ${form.certificate_url || '❌ NULL'}`);
        console.log(`   blockchain_verified: ${form.blockchain_verified}`);

        // Step 2: Check department statuses
        console.log('\n2️⃣ Checking department statuses...');
        const { data: statuses } = await supabase
            .from('no_dues_status')
            .select('department_name, status')
            .eq('form_id', formId);

        const approved = statuses.filter(s => s.status === 'approved').length;
        const pending = statuses.filter(s => s.status === 'pending').length;

        console.log(`   Approved: ${approved}`);
        console.log(`   Pending: ${pending}`);
        console.log(`   Total: ${statuses.length}`);

        statuses.forEach(s => {
            console.log(`   - ${s.department_name}: ${s.status}`);
        });

        // Step 3: Determine what should happen
        console.log('\n3️⃣ Analysis...');
        if (approved === statuses.length && form.certificate_url) {
            console.log('✅ FULLY COMPLETE: All approved + certificate generated');
            console.log('   Student should see download button');
        } else if (approved === statuses.length && !form.certificate_url) {
            console.log('⚠️ APPROVED BUT NO CERTIFICATE: Certificate generation may have failed');
        } else if (approved < statuses.length) {
            console.log(`⏳ IN PROGRESS: ${pending} department(s) still pending`);
            console.log('   Certificate will generate when all approve');
        }

        // Step 4: Simulate what the check-status API returns
        console.log('\n4️⃣ What student dashboard shows...');
        console.log('   The dashboard checks:');
        console.log('   - allApproved (approved === total)');
        console.log('   - formData.certificate_url');
        console.log('   - Both must be true for download button to show');

        if (approved === statuses.length && form.certificate_url) {
            console.log('\n✅ Download button SHOULD be visible to student');
            console.log('   URL:', form.certificate_url);
        } else {
            console.log('\n❌ Download button NOT visible yet');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

verifyFullCycle();
