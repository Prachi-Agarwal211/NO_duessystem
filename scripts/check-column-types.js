// Check column types in production database
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTypes() {
    console.log('🔍 CHECKING COLUMN TYPES IN DATABASE\n');

    // Use a raw query approach through the API
    // We can't directly query information_schema, but we can infer types

    // 1. Get a form
    const { data: form, error: formError } = await supabase
        .from('no_dues_forms')
        .select('id')
        .limit(1)
        .single();

    if (formError) {
        console.log('❌ Error getting form:', formError.message);
        return;
    }

    console.log('Form ID:', form.id);
    console.log('Form ID type:', typeof form.id);

    // 2. Try direct insert with explicit UUID cast
    console.log('\n📋 Testing insert with explicit form_id...');

    const testMessage = {
        form_id: form.id,  // Pass as-is (string that looks like UUID)
        department_name: 'hostel',
        message: 'Type test ' + Date.now(),
        sender_type: 'student',
        sender_name: 'Test User',
        sender_id: 'type-check-' + Date.now(),
        is_read: false
    };

    const { data: insertResult, error: insertError } = await supabase
        .from('no_dues_messages')
        .insert(testMessage)
        .select()
        .single();

    if (insertError) {
        console.log('\n❌ INSERT FAILED:');
        console.log('   Code:', insertError.code);
        console.log('   Message:', insertError.message);
        console.log('   Hint:', insertError.hint || 'None');

        if (insertError.message.includes('uuid = text') || insertError.code === '42883') {
            console.log('\n⚠️  CONFIRMED: UUID vs TEXT type mismatch!');
            console.log('   The form_id column in no_dues_messages expects UUID,');
            console.log('   but the value is being passed as TEXT string.');
            console.log('\n🔧 SOLUTIONS:');
            console.log('   1. Change form_id column type to TEXT (recommended)');
            console.log('   2. Or ensure all inserts cast to UUID explicitly');
        }
    } else {
        console.log('\n✅ INSERT SUCCEEDED!');
        console.log('   Message ID:', insertResult.id);

        // Clean up
        await supabase.from('no_dues_messages').delete().eq('id', insertResult.id);
        console.log('   (Cleaned up test message)');
    }

    console.log('\n' + '='.repeat(60));
}

checkTypes().catch(console.error);
