const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugData() {
    console.log('🚀 Starting Supabase Data Debug...');

    // 1. Check for orphaned status records (status exists but form does not)
    console.log('\n--- Orphaned Records Scan ---');
    const { data: statusRecords, error: statusError } = await supabase
        .from('no_dues_status')
        .select('id, form_id, department_name');

    if (statusError) {
        console.error('❌ Error fetching status records:', statusError);
    } else {
        console.log(`Found ${statusRecords.length} status records.`);

        // Get all unique form_ids from status table
        const statusFormIds = [...new Set(statusRecords.map(r => r.form_id))];
        console.log(`Unique form IDs in status table: ${statusFormIds.length}`);

        // Check which ones exist in no_dues_forms
        const { data: formRecords, error: formError } = await supabase
            .from('no_dues_forms')
            .select('id, registration_no, student_name');

        if (formError) {
            console.error('❌ Error fetching form records:', formError);
        } else {
            console.log(`Found ${formRecords.length} form records.`);

            const formIds = new Set(formRecords.map(f => f.id));
            const orphanedIds = statusFormIds.filter(id => !formIds.has(id));

            if (orphanedIds.length > 0) {
                console.warn(`🚨 Found ${orphanedIds.length} orphaned status records (form_id not in no_dues_forms):`);
                orphanedIds.slice(0, 10).forEach(id => {
                    const impactedDepts = statusRecords.filter(r => r.form_id === id).map(r => r.department_name);
                    console.log(`  - Form ID: ${id} (Depts: ${impactedDepts.join(', ')})`);
                });
                if (orphanedIds.length > 10) console.log('  ... and more');
            } else {
                console.log('✅ No orphaned status records found.');
            }

            // 2. Check for ID mismatches or weird formatting
            console.log('\n--- Data Quality Check ---');
            const weirdIds = formRecords.filter(f => !/^[0-9a-f-]{36}$/i.test(f.id));
            if (weirdIds.length > 0) {
                console.warn(`🚨 Found ${weirdIds.length} forms with non-UUID IDs!`);
                weirdIds.forEach(f => console.log(`  - Student: ${f.student_name}, ID: ${f.id}`));
            } else {
                console.log('✅ All form IDs match UUID format.');
            }
        }
    }

    // 3. Check specific form ID from previous sessions if any
    const targetId = 'af65d6f9-174f-4d97-a970-d9b4dad7f522';
    console.log(`\n--- Checking specific ID: ${targetId} ---`);
    const { data: targetForm } = await supabase.from('no_dues_forms').select('*').eq('id', targetId).single();
    console.log('Form data:', targetForm ? 'FOUND' : 'NOT FOUND');
}

debugData().catch(err => console.error(err));
