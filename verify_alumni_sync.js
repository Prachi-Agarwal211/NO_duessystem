const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifySync() {
    // Get the most recent form submission
    const { data: formData, error: formError } = await supabase
        .from('no_dues_forms')
        .select('registration_no, alumni_profile_link')
        .order('created_at', { ascending: false })
        .limit(1);

    if (formError || !formData || formData.length === 0) {
        console.log('No form submissions found to verify sync.');
        return;
    }

    const regNo = formData[0].registration_no;
    const formLink = formData[0].alumni_profile_link;

    console.log(`Checking Form: RegNo=${regNo}, Link=${formLink}`);

    // Check the master student_data table
    const { data: studentData, error: studentError } = await supabase
        .from('student_data')
        .select('registration_no, alumni_profile_link')
        .eq('registration_no', regNo)
        .single();

    if (studentError) {
        console.log(`Student record not found or error: ${studentError.message}`);
    } else {
        console.log(`Master Record: RegNo=${studentData.registration_no}, Link=${studentData.alumni_profile_link}`);
        if (formLink === studentData.alumni_profile_link) {
            console.log('✅ SYNC SUCCESSFUL: Master data matches form data.');
        } else {
            console.log('❌ SYNC FAILED: Master data does not match form data.');
        }
    }
}

verifySync().catch(console.error);
