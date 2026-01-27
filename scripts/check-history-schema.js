// Check no_dues_reapplication_history schema
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkHistorySchema() {
    console.log('🔍 CHECKING REAPPLICATION HISTORY SCHEMA\n');

    // Get a valid form ID
    const { data: form } = await supabase.from('no_dues_forms').select('id').limit(1).single();
    if (!form) { console.log('No form found.'); return; }

    // Try to insert a dummy history record
    console.log('🧪 Testing Insert into no_dues_reapplication_history...');

    const historyRecord = {
        form_id: form.id,
        reapplication_number: 999,
        department_name: 'test_dept',
        student_reply_message: 'Debug Test'
    };

    const { error } = await supabase.from('no_dues_reapplication_history').insert(historyRecord);

    if (error) {
        console.log('   ❌ Insert Failed:', error.message);
        if (error.message.includes('uuid = text')) {
            console.log('   ⚠️  Confirmed: form_id type mismatch in history table too!');
        }
    } else {
        console.log('   ✅ Insert Success');
        // Clean up
        await supabase.from('no_dues_reapplication_history').delete().eq('reapplication_number', 999);
    }
}

checkHistorySchema().catch(console.error);
