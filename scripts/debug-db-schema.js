// Check Triggers and Foreign Keys on no_dues_messages
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchemaDetails() {
    console.log('🔍 INSPECTING DB SCHEMA FOR TYPE MISMATCH SOURCES\n');

    // 1. Check Columns Types
    console.log('📋 Columns in no_dues_messages:');
    // We can't query information_schema directly with supabase-js easily unless we use rpc
    // But we can try to infer from error messages or use a known rpc if available.
    // Since we don't have a generic SQL runner, we have to deduce.

    // However, if we can't run SQL, we can't "list triggers" easily via the JS client 
    // unless 'get_triggers' RPC exists.

    // Let's try to verify if it's a trigger by disabling them? No, we can't do that.

    // Let's try to identify WHICH column is causing it.
    // function to insert with variations

    console.log('\n🧪 Testing Insert Variations to isolate the column...');

    const { data: form } = await supabase.from('no_dues_forms').select('id').limit(1).single();
    if (!form) { console.log('No form found.'); return; }
    const formId = form.id;

    // Test 1: Minimal insert
    const minimalMsg = {
        form_id: formId,
        department_name: 'hostel',
        message: 'Debug Test 1',
        sender_type: 'student',
        sender_name: 'Debug',
        // sender_id left out?
    };

    console.log('   Test 1 (Minimal):');
    const { error: err1 } = await supabase.from('no_dues_messages').insert(minimalMsg);
    if (err1) console.log('   ❌ Failed:', err1.message);
    else console.log('   ✅ Success');

    // Test 2: With sender_id
    const withSender = {
        ...minimalMsg,
        message: 'Debug Test 2',
        sender_id: 'some-text-id'
    };
    console.log('   Test 2 (With text sender_id):');
    const { error: err2 } = await supabase.from('no_dues_messages').insert(withSender);
    if (err2) console.log('   ❌ Failed:', err2.message);
    else console.log('   ✅ Success');

    // Test 3: Check reapply status update (Since reapply is also failing)
    // The reapply function updates no_dues_status
    console.log('\n🧪 Testing no_dues_status update (Reapply flow)...');
    const { error: statusErr } = await supabase
        .from('no_dues_status')
        .update({ status: 'pending' }) // minimal update
        .eq('form_id', formId)
        .eq('department_name', 'hostel');

    if (statusErr) console.log('   ❌ Update Failed:', statusErr.message);
    else console.log('   ✅ Update Success');

    // If update fails, check if it's the action_by_user_id column
    console.log('   Test 4 (Update action_by_user_id):');
    const { error: actionErr } = await supabase
        .from('no_dues_status')
        .update({ action_by_user_id: null })
        .eq('form_id', formId)
        .eq('department_name', 'hostel');

    if (actionErr) console.log('   ❌ Update action_by_user_id Failed:', actionErr.message);
    else console.log('   ✅ Update action_by_user_id Success');

    console.log('\n' + '='.repeat(60));
}

checkSchemaDetails().catch(console.error);
