const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugForm() {
    console.log('🔍 Debugging Form TEST2025...\n');

    // 1. Check if form exists
    const { data: forms, error: formError } = await supabase
        .from('no_dues_forms')
        .select('*')
        .eq('registration_no', 'TEST2025');

    if (formError) {
        console.error('❌ Error fetching form:', formError.message);
        return;
    }

    if (!forms || forms.length === 0) {
        console.log('❌ Form TEST2025 NOT FOUND in database.');
        return;
    }

    const form = forms[0];
    console.log(`✅ Form found: ${form.id} (Student: ${form.student_name})`);

    // 2. Check status records
    const { data: statuses, error: statusError } = await supabase
        .from('no_dues_status')
        .select('*')
        .eq('form_id', form.id);

    if (statusError) {
        console.error('❌ Error fetching status:', statusError.message);
        return;
    }

    console.log(`📊 Found ${statuses.length} status records.`);

    if (statuses.length === 0) {
        console.log('⚠️  No status records found! Trigger likely failed.');
        console.log('🛠️  Attempting to fix...');

        // Fetch departments
        const { data: departments } = await supabase.from('departments').select('name');

        if (!departments || departments.length === 0) {
            console.log('❌ No departments found! Cannot create status records.');
            return;
        }

        const statusInserts = departments.map(d => ({
            form_id: form.id,
            department_name: d.name,
            status: 'pending'
        }));

        const { error: insertError } = await supabase
            .from('no_dues_status')
            .insert(statusInserts);

        if (insertError) {
            console.error('❌ Failed to insert status records:', insertError.message);
        } else {
            console.log('✅ Successfully inserted status records!');
        }
    } else {
        statuses.forEach(s => {
            console.log(`   - ${s.department_name}: ${s.status}`);
        });
    }
}

debugForm().catch(console.error);
