/**
 * Fix Chat API Issues
 * Run this script to diagnose and fix chat-related API issues
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables. Please check your .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixChatIssues() {
    console.log('🔧 FIXING CHAT SYSTEM ISSUES\n');

    // 1. Check no_dues_messages table structure
    console.log('1️⃣ Checking no_dues_messages table...');
    const { data: messagesTable, error: messagesError } = await supabase
        .from('no_dues_messages')
        .select('*', { count: 'exact', head: true });

    if (messagesError) {
        console.error('❌ Error accessing no_dues_messages:', messagesError.message);
        console.log('   💡 Run the SQL fix script first: scripts/complete-database-fix.sql');
    } else {
        console.log('✅ no_dues_messages table is accessible');
    }

    // 2. Check for any existing messages
    console.log('\n2️⃣ Checking existing messages...');
    const { data: messages, error: fetchError } = await supabase
        .from('no_dues_messages')
        .select('id, form_id, department_name, sender_type, sender_name, sender_id, message, created_at')
        .limit(5);

    if (fetchError) {
        console.error('❌ Error fetching messages:', fetchError.message);
    } else {
        console.log(`✅ Found ${messages?.length || 0} messages in database`);
        if (messages && messages.length > 0) {
            console.log('   Sample message:', {
                id: messages[0].id,
                form_id: messages[0].form_id,
                department: messages[0].department_name,
                sender_type: messages[0].sender_type,
                sender_id: messages[0].sender_id
            });
        }
    }

    // 3. Test inserting a test message
    console.log('\n3️⃣ Testing message insertion...');

    // First, get a valid form_id
    const { data: forms, error: formError } = await supabase
        .from('no_dues_forms')
        .select('id')
        .limit(1);

    if (formError || !forms || forms.length === 0) {
        console.log('⚠️ No forms found to test with. Skipping insert test.');
    } else {
        const testFormId = forms[0].id;

        const testMessage = {
            form_id: testFormId,
            department_name: 'test_department',
            message: 'Test message from fix script',
            sender_type: 'student',
            sender_name: 'Test Student',
            sender_id: 'test-student-123'
        };

        const { data: inserted, error: insertError } = await supabase
            .from('no_dues_messages')
            .insert(testMessage)
            .select()
            .single();

        if (insertError) {
            console.error('❌ Failed to insert test message:', insertError.message);
            console.log('   Error details:', JSON.stringify(insertError, null, 2));
        } else {
            console.log('✅ Test message inserted successfully');
            console.log('   Message ID:', inserted.id);

            // Clean up test message
            await supabase
                .from('no_dues_messages')
                .delete()
                .eq('id', inserted.id);
            console.log('   Test message cleaned up');
        }
    }

    // 4. Check RLS policies
    console.log('\n4️⃣ Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase
        .rpc('get_policies', { table_name: 'no_dues_messages' });

    if (policyError) {
        console.log('⚠️ Could not fetch policies (RPC not available):', policyError.message);
    } else {
        console.log('✅ RLS policies found:', policies?.length || 0);
    }

    // 5. Verify realtime is enabled
    console.log('\n5️⃣ Checking Realtime configuration...');
    console.log('   ℹ️  Ensure no_dues_messages table is enabled in Supabase Realtime');
    console.log('   Go to: Database > Replication > Realtime > no_dues_messages');

    console.log('\n✅ Chat system diagnostic complete!');
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Run the SQL fix script in Supabase SQL Editor');
    console.log('   2. Enable Realtime for no_dues_messages table in Supabase Dashboard');
    console.log('   3. Restart your Next.js application');
    console.log('   4. Test chat functionality');
}

fixChatIssues().catch(console.error);