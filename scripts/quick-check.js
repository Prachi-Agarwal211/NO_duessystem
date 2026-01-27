/**
 * Simple Database Verification Script
 */
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    console.log('Checking database...');

    try {
        // 1. Check forms table
        const { data: forms, error: e1 } = await supabase
            .from('no_dues_forms')
            .select('id, registration_no, status, is_reapplication, reapplication_count')
            .limit(3);

        if (e1) {
            console.log('FORMS ERROR:', e1.message);
        } else {
            console.log('FORMS OK - Count:', forms.length);
            forms.forEach(f => console.log('  -', f.registration_no, 'status:', f.status, 'is_reapp:', f.is_reapplication));
        }

        // 2. Check messages table
        const { count: msgCount, error: e2 } = await supabase
            .from('no_dues_messages')
            .select('*', { count: 'exact', head: true });

        if (e2) {
            console.log('MESSAGES ERROR:', e2.message);
        } else {
            console.log('MESSAGES OK - Count:', msgCount);
        }

        // 3. Test message insert
        const { data: testForm } = await supabase.from('no_dues_forms').select('id').limit(1).single();

        if (testForm) {
            const { data: msg, error: e3 } = await supabase
                .from('no_dues_messages')
                .insert([{
                    form_id: testForm.id,
                    department_name: 'hostel',
                    message: 'Test message from script',
                    sender_type: 'student',
                    sender_name: 'Test',
                    sender_id: 'test-001',
                    is_read: false
                }])
                .select()
                .single();

            if (e3) {
                console.log('INSERT ERROR:', e3.message);
                if (e3.message.includes('row-level security')) {
                    console.log('FIX NEEDED: Add RLS policy for message inserts');
                }
            } else {
                console.log('INSERT OK - Message ID:', msg.id);
                // Cleanup
                await supabase.from('no_dues_messages').delete().eq('id', msg.id);
                console.log('Cleanup done');
            }
        }

        // 4. Check history table
        const { error: e4 } = await supabase.from('no_dues_reapplication_history').select('id').limit(1);
        if (e4) {
            console.log('HISTORY ERROR:', e4.message);
        } else {
            console.log('HISTORY TABLE OK');
        }

        console.log('Done!');
    } catch (err) {
        console.log('Error:', err.message);
    }
}

check();
