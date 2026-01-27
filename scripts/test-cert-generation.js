// Test certificate generation for 22BCOM1367
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCertificate() {
    let output = 'CERTIFICATE GENERATION TEST\n';
    output += '='.repeat(50) + '\n\n';

    try {
        // Find the form
        const { data: form } = await supabase
            .from('no_dues_forms')
            .select('id, registration_no, status')
            .eq('registration_no', '22BCOM1367')
            .single();

        output += 'Form ID: ' + form.id + '\n';
        output += 'Registration: ' + form.registration_no + '\n';
        output += 'Current Status: ' + form.status + '\n\n';

        // Check if all departments are approved
        const { data: statuses } = await supabase
            .from('no_dues_status')
            .select('status')
            .eq('form_id', form.id);

        const approved = statuses.filter(s => s.status === 'approved').length;
        output += 'Approved: ' + approved + '/' + statuses.length + '\n\n';

        if (approved === statuses.length) {
            output += 'All departments approved! Checking certificate trigger...\n\n';

            // Try the trigger function
            const { triggerCertificateGeneration } = await import('../src/lib/certificateTrigger.js');
            output += 'Calling triggerCertificateGeneration...\n';

            const result = await triggerCertificateGeneration(form.id, 'test-script');

            output += '\nResult:\n' + JSON.stringify(result, null, 2) + '\n';

            // Check the form again
            const { data: updatedForm } = await supabase
                .from('no_dues_forms')
                .select('status, final_certificate_generated, certificate_url')
                .eq('id', form.id)
                .single();

            output += '\nAfter trigger:\n';
            output += '  Status: ' + updatedForm.status + '\n';
            output += '  Certificate Generated: ' + updatedForm.final_certificate_generated + '\n';
            output += '  Certificate URL: ' + (updatedForm.certificate_url || 'N/A') + '\n';

        } else {
            output += 'Not all departments approved. Certificate not triggered.\n';
        }

    } catch (err) {
        output += 'ERROR: ' + err.message + '\n\n';
        output += err.stack + '\n';
    }

    fs.writeFileSync('cert-test-output.txt', output);
    console.log('Results written to cert-test-output.txt');
}

testCertificate();
