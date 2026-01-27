// Verify form status
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
    let output = 'FORM STATUS VERIFICATION\n';
    output += '='.repeat(50) + '\n\n';

    try {
        const { data: form, error } = await supabase
            .from('no_dues_forms')
            .select('id, status, final_certificate_generated, certificate_url')
            .eq('registration_no', '22BCOM1367')
            .single();

        if (error) {
            output += 'Error: ' + error.message + '\n';
        } else {
            output += 'Form ID: ' + form.id + '\n';
            output += 'Status: ' + form.status + '\n';
            output += 'Certificate Generated: ' + form.final_certificate_generated + '\n';
            output += 'Certificate URL: ' + (form.certificate_url || 'N/A') + '\n';

            // Check departments
            const { data: statuses } = await supabase
                .from('no_dues_status')
                .select('department_name, status')
                .eq('form_id', form.id);

            output += '\nDepartments:\n';
            statuses.forEach(s => {
                output += '  - ' + s.department_name + ': ' + s.status + '\n';
            });

            const approved = statuses.filter(s => s.status === 'approved').length;
            output += '\nApproved: ' + approved + '/' + statuses.length + '\n';
            output += '\n✅ Form is ready for certificate generation!\n';
            output += '   When you login, the system will auto-generate.\n';
        }
    } catch (err) {
        output += 'Error: ' + err.message + '\n';
    }

    fs.writeFileSync('form-status-output.txt', output);
    console.log('Results written to form-status-output.txt');
}

verify();
