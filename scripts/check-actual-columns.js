/**
 * Check actual columns in Supabase by querying sample data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log('🔍 Checking actual columns by querying data...\n');

    // Check no_dues_forms columns
    const { data: forms } = await supabase.from('no_dues_forms').select('*').limit(1);
    if (forms && forms.length > 0) {
        console.log('📋 no_dues_forms columns:');
        console.log(Object.keys(forms[0]).map(k => `   - ${k}`).join('\n'));
    }

    // Check no_dues_status columns
    const { data: status } = await supabase.from('no_dues_status').select('*').limit(1);
    if (status && status.length > 0) {
        console.log('\n📋 no_dues_status columns:');
        console.log(Object.keys(status[0]).map(k => `   - ${k}`).join('\n'));
    }

    // Check no_dues_messages columns
    const { data: messages } = await supabase.from('no_dues_messages').select('*').limit(1);
    if (messages && messages.length > 0) {
        console.log('\n📋 no_dues_messages columns:');
        console.log(Object.keys(messages[0]).map(k => `   - ${k}`).join('\n'));
    } else {
        console.log('\n⚠️  no_dues_messages table is empty - this is why chat is failing!');
        console.log('   The table exists but has no rows. Check if INSERT is working.');
    }

    // Check student_data columns
    const { data: students } = await supabase.from('student_data').select('*').limit(1);
    if (students && students.length > 0) {
        console.log('\n📋 student_data columns:');
        console.log(Object.keys(students[0]).map(k => `   - ${k}`).join('\n'));
    }
}

checkColumns().catch(console.error);
