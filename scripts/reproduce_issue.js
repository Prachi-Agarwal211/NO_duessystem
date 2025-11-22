
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubmission() {
    const regNo = `TEST${Date.now()}`;
    console.log(`Testing with Registration No: ${regNo}`);

    // 1. Insert Form
    const { data: form, error: insertError } = await supabase
        .from('no_dues_forms')
        .insert({
            registration_no: regNo,
            student_name: 'Test Student',
            school: 'Engineering',
            contact_no: '1234567890',
            status: 'pending'
        })
        .select()
        .single();

    if (insertError) {
        console.error('Insert Error:', insertError);
        return;
    }

    console.log('Form inserted:', form);

    // 2. Wait a moment for triggers to fire
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Fetch Statuses
    const { data: statuses, error: statusError } = await supabase
        .from('no_dues_status')
        .select('*')
        .eq('form_id', form.id);

    if (statusError) {
        console.error('Status Fetch Error:', statusError);
        return;
    }

    console.log('Statuses found:', statuses.length);
    if (statuses.length > 0) {
        console.log('First status:', statuses[0]);
        const approvedCount = statuses.filter(s => s.status === 'approved').length;
        console.log(`Approved: ${approvedCount}/${statuses.length}`);
    } else {
        console.log('No statuses created!');
    }

    // 4. Fetch Form again to check status
    const { data: updatedForm } = await supabase
        .from('no_dues_forms')
        .select('status')
        .eq('id', form.id)
        .single();

    console.log('Updated Form Status:', updatedForm.status);

    // 5. Check Departments
    const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('*');

    if (deptError) {
        console.error('Departments Fetch Error:', deptError);
    } else {
        console.log('Departments count:', departments.length);
    }

    // Cleanup
    // await supabase.from('no_dues_forms').delete().eq('id', form.id);
}

testSubmission();
