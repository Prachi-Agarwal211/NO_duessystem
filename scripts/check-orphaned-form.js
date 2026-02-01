/**
 * Check and fix orphaned form record
 * Form ID: af65d6f9-174f-4d97-a970-d9b4dad7f522
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkForm() {
    const formId = 'af65d6f9-174f-4d97-a970-d9b4dad7f522';

    console.log('🔍 Checking form:', formId);

    // Check if form exists in no_dues_forms
    const { data: form, error: formError } = await supabase
        .from('no_dues_forms')
        .select('*')
        .eq('id', formId)
        .single();

    console.log('📄 Form in no_dues_forms:', form ? 'FOUND' : 'NOT FOUND');
    if (formError) console.log('   Error:', formError.message);

    // Check if form has status records
    const { data: statusRecords, error: statusError } = await supabase
        .from('no_dues_status')
        .select('*')
        .eq('form_id', formId);

    console.log('📋 Status records count:', statusRecords?.length || 0);
    if (statusRecords?.length > 0) {
        console.log('   Departments:', statusRecords.map(r => r.department_name));
    }

    // If form doesn't exist but status records do, create the form
    if (!form && statusRecords?.length > 0) {
        console.log('⚠️ ORPHANED FORM DETECTED - status exists but form does not!');
        console.log('   This is why the API returns 404.');
        console.log('   Action needed: Either delete status records or create the form.');
    }

    // Check all forms to see if any are orphaned
    console.log('\n🔍 Scanning for all orphaned forms...');
    const { data: allStatusRecords } = await supabase
        .from('no_dues_status')
        .select('form_id')
        .distinct();

    const formIds = allStatusRecords?.map(r => r.form_id) || [];
    console.log('   Total unique form IDs in status table:', formIds.length);

    // Check which ones don't exist in forms table
    const orphanedForms = [];
    for (const fid of formIds) {
        const { data: f } = await supabase
            .from('no_dues_forms')
            .select('id')
            .eq('id', fid)
            .single();

        if (!f) {
            orphanedForms.push(fid);
        }
    }

    console.log('   Orphaned forms count:', orphanedForms.length);
    if (orphanedForms.length > 0) {
        console.log('   Orphaned form IDs:', orphanedForms);
    }
}

checkForm()
    .then(() => console.log('\n✅ Check complete'))
    .catch(err => console.error('❌ Error:', err));
