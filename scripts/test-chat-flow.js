// Test Chat Flow Script
// Run: node scripts/test-chat-flow.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: { persistSession: false },
        global: {
            fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
        }
    }
);

async function testChatFlow() {
    const formId = 'af65d6f9-174f-4d97-a970-d9b4dad7f522';
    const departmentName = 'Library'; // Assuming this department exists
    const testMessage = `Test message ${Date.now()}`;

    console.log(`🧪 Testing Chat Flow for Form: ${formId}, Dept: ${departmentName}`);

    // 1. Simulate Student Sending Message
    console.log('\nPlease sending message as Student...');
    const { data: msg, error: sendError } = await supabaseAdmin
        .from('no_dues_messages')
        .insert([{
            form_id: formId,
            department_name: departmentName,
            message: testMessage,
            sender_type: 'student',
            sender_name: 'Test Student',
            sender_id: 'student-test',
            is_read: false
        }])
        .select()
        .single();

    if (sendError) {
        console.error('❌ Send failed:', sendError);
        return;
    }
    console.log('✅ Message sent:', msg.id);

    // 2. Verify Unread Count
    console.log('\nChecking unread count...');
    const { count, error: countError } = await supabaseAdmin
        .from('no_dues_messages')
        .select('*', { count: 'exact', head: true })
        .eq('form_id', formId)
        .eq('department_name', departmentName)
        .eq('sender_type', 'student')
        .eq('is_read', false);

    if (countError) console.error('❌ Count failed:', countError);
    else console.log(`✅ Unread count: ${count} (Should be > 0)`);

    // 3. Mark as Read (Simulate Department Action)
    console.log('\nMarking as read by Department...');
    const { data: updated, error: readError } = await supabaseAdmin
        .from('no_dues_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('form_id', formId)
        .eq('department_name', departmentName)
        .eq('sender_type', 'student')
        .eq('is_read', false)
        .select();

    if (readError) console.error('❌ Mark read failed:', readError);
    else console.log(`✅ Marked ${updated.length} messages as read`);

    // 4. Verify Reads
    const { count: newCount } = await supabaseAdmin
        .from('no_dues_messages')
        .select('*', { count: 'exact', head: true })
        .eq('form_id', formId)
        .eq('department_name', departmentName)
        .eq('sender_type', 'student')
        .eq('is_read', false);

    // 5. Simulate Department Reply
    console.log('\nSending reply as Department...');
    const { data: replyMsg, error: replyError } = await supabaseAdmin
        .from('no_dues_messages')
        .insert([{
            form_id: formId,
            department_name: departmentName,
            message: 'This is a test reply from the department.',
            sender_type: 'department',
            sender_name: 'Librarian',
            sender_id: '861a03bd-a589-4da3-9b81-c752ba168923', // Admin UUID
            is_read: false
        }])
        .select()
        .single();

    if (replyError) console.error('❌ Reply failed:', replyError);
    else console.log('✅ Reply sent:', replyMsg.id);

    console.log('\n✅ Chat Flow Test Complete');
}

testChatFlow();
