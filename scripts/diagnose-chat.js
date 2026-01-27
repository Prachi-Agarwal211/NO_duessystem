/**
 * Diagnose sender_id constraint issue
 */
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
    // Get table info by trying different sender_id values
    const { data: testForm } = await supabase.from('no_dues_forms').select('id').limit(1).single();

    if (!testForm) {
        console.log('No forms found');
        return;
    }

    console.log('Form ID:', testForm.id);

    // Try with NULL sender_id
    const { data: m1, error: e1 } = await supabase
        .from('no_dues_messages')
        .insert([{
            form_id: testForm.id,
            department_name: 'hostel',
            message: 'Test with NULL sender_id',
            sender_type: 'student',
            sender_name: 'Test',
            sender_id: null,
            is_read: false
        }])
        .select()
        .single();

    if (e1) {
        console.log('NULL sender_id error:', e1.message);
    } else {
        console.log('NULL sender_id SUCCESS! ID:', m1.id);
        await supabase.from('no_dues_messages').delete().eq('id', m1.id);
    }

    // Try without sender_id at all
    const { data: m2, error: e2 } = await supabase
        .from('no_dues_messages')
        .insert([{
            form_id: testForm.id,
            department_name: 'hostel',
            message: 'Test without sender_id field',
            sender_type: 'student',
            sender_name: 'Test',
            is_read: false
        }])
        .select()
        .single();

    if (e2) {
        console.log('No sender_id field error:', e2.message);
    } else {
        console.log('No sender_id field SUCCESS! ID:', m2.id);
        await supabase.from('no_dues_messages').delete().eq('id', m2.id);
    }

    console.log('Done');
}

diagnose();
