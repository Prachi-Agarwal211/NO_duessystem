const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTypes() {
    console.log('--- Table Column Types ---');

    // We'll use a query to the information_schema if possible, otherwise we'll try to infer
    const { data, error } = await supabase.rpc('get_table_info', { t_name: 'no_dues_forms' });

    if (error) {
        console.log('RPC get_table_info failed, trying information_schema via query...');
        // Supabase usually doesn't allow direct queries to information_schema via API unless configured
        // So let's try to just insert a garbage value and see the error? No, that's messy.

        // Let's try to query one record and check the typeof
        const { data: f } = await supabase.from('no_dues_forms').select('*').limit(1);
        if (f && f.length > 0) {
            console.log('typeof id:', typeof f[0].id);
            console.log('value of id:', f[0].id);
        }
    } else {
        console.log(data);
    }
}

checkTypes();
