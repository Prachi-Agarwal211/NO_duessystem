// Check current state and write to file
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndWrite() {
    let output = 'CURRENT STATE OF 22BCOM1367\n';
    output += '='.repeat(50) + '\n\n';

    try {
        const { data: form } = await supabase
            .from('no_dues_forms')
            .select('id, status, final_certificate_generated, certificate_url')
            .eq('registration_no', '22BCOM1367')
            .single();

        output += 'Form ID: ' + form.id + '\n';
        output += 'Form Status: ' + form.status + '\n';
        output += 'Certificate Generated: ' + form.final_certificate_generated + '\n';
        output += 'Certificate URL: ' + (form.certificate_url || 'N/A') + '\n\n';

        const { data: statuses } = await supabase
            .from('no_dues_status')
            .select('department_name, status')
            .eq('form_id', form.id);

        output += 'Departments:\n';
        statuses.forEach(s => {
            output += '  - ' + s.department_name + ': ' + s.status + '\n';
        });

        const approved = statuses.filter(s => s.status === 'approved').length;
        output += '\nApproved: ' + approved + '/' + statuses.length + '\n';

        // Now test certificate generation
        output += '\n' + '='.repeat(50) + '\n';
        output += 'TESTING CERTIFICATE GENERATION...\n';
        output += '='.repeat(50) + '\n\n';

        // Try to trigger certificate generation
        const { triggerCertificateGeneration } = await import('./src/lib/certificateTrigger.js');
        const result = await triggerCertificateGeneration(form.id, 'test-script');

        output += 'Result: ' + JSON.stringify(result, null, 2) + '\n';

    } catch (err) {
        output += 'ERROR: ' + err.message + '\n';
        output += err.stack + '\n';
    }

    fs.writeFileSync('test-output.txt', output);
    console.log('Results written to test-output.txt');
}

checkAndWrite();
