const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function detailedSyncCheck() {
    const { data: form, error } = await supabase
        .from('no_dues_forms')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!form) {
        console.log('No forms found.');
        return;
    }

    console.log('--- FORM DATA ---');
    console.log(`Registration No: ${form.registration_no}`);
    console.log(`Alumni Link In Form: "${form.alumni_profile_link}"`);

    const { data: student, error: sErr } = await supabase
        .from('student_data')
        .select('*')
        .eq('registration_no', form.registration_no)
        .single();

    if (!student) {
        console.log('No matching student_data record found.');
        return;
    }

    console.log('--- MASTER DATA ---');
    console.log(`Alumni Link In Master: "${student.alumni_profile_link}"`);

    if (form.alumni_profile_link === student.alumni_profile_link) {
        console.log('✅ Match confirmed.');
    } else {
        console.log('❌ Mismatch detected.');

        console.log('Attempting to trigger sync by updating the form record...');
        const { error: uErr } = await supabase
            .from('no_dues_forms')
            .update({ alumni_profile_link: form.alumni_profile_link }) // "Touch" the record
            .eq('id', form.id);

        if (uErr) {
            console.log(`Update error: ${uErr.message}`);
        } else {
            console.log('Form touched. Re-checking master data...');
            const { data: updatedStudent } = await supabase
                .from('student_data')
                .select('alumni_profile_link')
                .eq('registration_no', form.registration_no)
                .single();
            console.log(`Updated Master Link: "${updatedStudent.alumni_profile_link}"`);
            if (form.alumni_profile_link === updatedStudent.alumni_profile_link) {
                console.log('✅ SYNC NOW WORKING! The trigger is active.');
            } else {
                console.log('❌ SYNC STILL BROKEN! Trigger investigation required.');
            }
        }
    }
}

detailedSyncCheck().catch(console.error);
