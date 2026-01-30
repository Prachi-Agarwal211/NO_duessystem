
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('Trying fallback to process.env without path...');
    require('dotenv').config();
}

console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Found' : 'Missing');
console.log('KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectSchema() {
    console.log('Inspecting no_dues_messages schema...');

    // We can't query information_schema directly easily with JS client unless we have raw SQL function
    // But we can infer foreign keys by trying to join

    // 1. Check no_dues_messages
    const { data: messages, error: msgError } = await supabase
        .from('no_dues_messages')
        .select('sender_id')
        .limit(1);

    if (msgError) {
        console.log('Error querying messages:', msgError.message);
    } else {
        console.log('Messages sample:', messages);
        if (messages.length > 0) {
            const senderId = messages[0].sender_id;
            console.log('Checking sender_id type:', typeof senderId, senderId);

            // Try to join with profiles
            const { error: joinError } = await supabase
                .from('no_dues_messages')
                .select('sender_id, profiles(full_name)')
                .limit(1);

            if (joinError) {
                console.log('❌ no_dues_messages -> profiles JOIN FAILED:', joinError.message);
                console.log('   Likely missing Foreign Key from sender_id to profiles.id');
            } else {
                console.log('✅ no_dues_messages -> profiles JOIN SUCCESS');
            }
        }
    }

    // 2. Check no_dues_status
    console.log('\nInspecting no_dues_status schema...');
    const { data: statuses, error: statusError } = await supabase
        .from('no_dues_status')
        .select('action_by_user_id')
        .limit(1);

    if (statusError) {
        console.log('Error querying status:', statusError.message);
    } else {
        console.log('Status sample:', statuses);
        if (statuses.length > 0) {
            const actionBy = statuses[0].action_by_user_id;
            console.log('Checking action_by_user_id type:', typeof actionBy, actionBy);

            // Try to join with profiles
            const { error: joinError } = await supabase
                .from('no_dues_status')
                .select('action_by_user_id, profiles(full_name)')
                .limit(1);

            if (joinError) {
                console.log('❌ no_dues_status -> profiles JOIN FAILED:', joinError.message);
                console.log('   Likely missing Foreign Key from action_by_user_id to profiles.id');
            } else {
                console.log('✅ no_dues_status -> profiles JOIN SUCCESS');
            }
        }
    }
}

inspectSchema();
