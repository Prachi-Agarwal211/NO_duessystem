// Check if database triggers exist
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTriggers() {
    console.log('='.repeat(60));
    console.log('CHECKING DATABASE TRIGGERS');
    console.log('='.repeat(60));

    // Check for trigger function
    console.log('\n📋 Checking for triggers on no_dues_status...');

    try {
        // This query gets all triggers on a table
        const { data, error } = await supabase.rpc('get_triggers', {
            target_table: 'no_dues_status'
        });

        if (error) {
            console.log('❌ Could not query triggers via RPC');
            console.log('   Error:', error.message);
        } else {
            console.log('Triggers found:', data);
        }
    } catch (e) {
        console.log('❌ RPC not available:', e.message);
    }

    // Alternative: Try to find the trigger function
    console.log('\n📋 Alternative check: Looking for trigger functions...');

    // Try a simple test: Update a status and see if form status changes
    console.log('\n📋 Testing trigger behavior...');

    // Get a form with mixed statuses
    const { data: testForm } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no, status')
        .eq('status', 'in_progress')
        .limit(1)
        .single();

    if (!testForm) {
        console.log('No in_progress form to test with');
        return;
    }

    console.log('Test form:', testForm.registration_no, 'Status:', testForm.status);

    // Check all statuses
    const { data: statuses } = await supabase
        .from('no_dues_status')
        .select('department_name, status')
        .eq('form_id', testForm.id);

    console.log('Department statuses:');
    statuses.forEach(s => console.log(`  - ${s.department_name}: ${s.status}`));

    const allApproved = statuses.every(s => s.status === 'approved');

    if (allApproved) {
        console.log('\n🔴 CONFIRMED: All departments approved but form status is still "in_progress"');
        console.log('   This means the trigger is NOT working or does NOT exist!');
    } else {
        console.log('\n📋 Form has non-approved departments, trigger test inconclusive');
    }

    console.log('\n' + '='.repeat(60));
    console.log('CONCLUSION: If trigger existed and worked, form status would be "completed"');
    console.log('='.repeat(60));
}

checkTriggers().catch(console.error);
