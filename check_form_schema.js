const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'no_dues_forms' });
    if (error) {
        console.log('RPC get_table_columns failed, trying a mock select...');
        const { data: mockData, error: mockError } = await supabase.from('no_dues_forms').select('*').limit(1);
        if (mockError) {
            console.log('Error:', mockError.message);
        } else if (mockData && mockData.length > 0) {
            console.log('Columns found in first row:', Object.keys(mockData[0]));
        } else {
            console.log('Table is empty, cannot detect columns via select.');
        }
    } else {
        console.log('Columns from RPC:', data);
    }
}

checkSchema().catch(console.error);
