/**
 * Test if we can insert into no_dues_messages
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log('🔍 Testing message insert...\n');

    // Get first form_id
    const { data: forms } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no')
        .limit(1);

    if (!forms || forms.length === 0) {
        console.log('❌ No forms found');
        return;
    }

    const formId = forms[0].id;
    console.log(`📝 Using form_id: ${formId}`);

    // Try to insert a test message
    const testMessage = {
        form_id: formId,  // This is UUID in no_dues_forms
        department_name: 'Library',
        message: 'Test message - please delete',
        sender_type: 'department',
        sender_name: 'Test User',
        sender_id: 'test-user-id',
        is_read: false
    };

    console.log('Attempting insert with data:', JSON.stringify(testMessage, null, 2));

    const { data, error } = await supabase
        .from('no_dues_messages')
        .insert([testMessage])
        .select()
        .single();

    if (error) {
        console.error('❌ Insert failed:', JSON.stringify(error, null, 2));
        console.log('\n💡 Possible issues:');
        console.log('   - RLS policies blocking insert');
        console.log('   - Foreign key constraint violation');
        console.log('   - Type mismatch (form_id is TEXT in no_dues_messages but UUID in no_dues_forms)');
    } else {
        console.log('✅ Message inserted successfully!');
        console.log('Inserted data:', JSON.stringify(data, null, 2));

        // Clean up - delete the test message
        if (data?.id) {
            await supabase.from('no_dues_messages').delete().eq('id', data.id);
            console.log('🗑️  Test message deleted');
        }
    }
}

testInsert().catch(console.error);
