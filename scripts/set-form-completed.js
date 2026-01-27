// Set form status to completed
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setCompleted() {
    let output = 'SETTING FORM STATUS TO COMPLETED\n';
    output += '='.repeat(50) + '\n\n';

    try {
        // Get form
        const { data: form, error: getError } = await supabase
            .from('no_dues_forms')
            .select('id, status')
            .eq('registration_no', '22BCOM1367')
            .single();

        if (getError) {
            output += 'Error getting form: ' + getError.message + '\n';
            fs.writeFileSync('set-completed.txt', output);
            return;
        }

        output += 'Current Status: ' + form.status + '\n';
        output += 'Updating to completed...\n';

        // Update
        const { error: updateError } = await supabase
            .from('no_dues_forms')
            .update({ status: 'completed' })
            .eq('id', form.id);

        if (updateError) {
            output += 'Update Error: ' + updateError.message + '\n';
        } else {
            output += '✅ Status updated to completed!\n';
        }

        // Verify
        const { data: updatedForm } = await supabase
            .from('no_dues_forms')
            .select('status')
            .eq('id', form.id)
            .single();

        output += 'New Status: ' + updatedForm.status + '\n';
        output += '\n🎉 Ready for certificate generation!\n';

    } catch (err) {
        output += 'Exception: ' + err.message + '\n';
    }

    fs.writeFileSync('set-completed.txt', output);
    console.log('Done - see set-completed.txt');
}

setCompleted();
