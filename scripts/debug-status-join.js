
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStatusJoin() {
    console.log('Testing no_dues_status join with profiles...');

    // 1. Get a valid form_id from no_dues_status
    const { data: statusCheck, error: checkError } = await supabase
        .from('no_dues_status')
        .select('form_id')
        .limit(1);

    if (checkError || !statusCheck || statusCheck.length === 0) {
        console.error('Could not find any status entries to test with.');
        return;
    }

    const formId = statusCheck[0].form_id;
    console.log('Using form_id:', formId);

    // 2. Try the failing query
    const { data, error } = await supabase
        .from('no_dues_status')
        .select(`
      id,
      department_name,
      status,
      action_by_user_id,
      profiles (
        full_name
      )
    `)
        .eq('form_id', formId);

    if (error) {
        console.error('❌ JOIN FAILED:', error.message);
        console.error('Details:', error);
    } else {
        console.log('✅ JOIN SUCCESSFUL');
        console.log('Data:', JSON.stringify(data, null, 2));
    }
}

testStatusJoin();
