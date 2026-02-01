const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testDetailFetch() {
    // 1. Get a valid form ID from the dashboard first
    console.log('🔍 Finding a valid form ID...');
    const { data: statusRecords } = await supabase
        .from('no_dues_status')
        .select('form_id, no_dues_forms!inner(id, student_name)')
        .limit(1);

    if (!statusRecords || statusRecords.length === 0) {
        console.log('No records found in no_dues_status');
        return;
    }

    const id = statusRecords[0].no_dues_forms.id;
    const name = statusRecords[0].no_dues_forms.student_name;
    console.log(`Testing with Form ID: ${id} (${name})`);

    // 2. Mimic the student detail API query
    console.log('\n🔍 Mimicking Student Detail API query...');
    const { data, error } = await supabase
        .from('no_dues_forms')
        .select(`
        id,
        student_name,
        registration_no,
        admission_year,
        passing_year,
        parent_name,
        school,
        course,
        branch,
        contact_no,
        alumni_profile_link,
        certificate_url,
        status,
        created_at,
        updated_at,
        reapplication_count,
        student_reply_message,
        last_reapplied_at
      `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('❌ Query Failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Error Details:', error.details);
        console.error('Error Hint:', error.hint);
    } else {
        console.log('✅ Query Successful!');
        console.log('Data:', JSON.stringify(data, null, 2));
    }
}

testDetailFetch();
