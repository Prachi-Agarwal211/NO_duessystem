const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listColumns() {
    const { data, error } = await supabase.from('no_dues_forms').select('*').limit(1);
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]).join(', '));
    } else {
        // If empty, use a different approach
        const { data: cols } = await supabase.rpc('get_table_columns', { table_name: 'no_dues_forms' });
        if (cols) {
            console.log('Columns from RPC:', cols.map(c => c.column_name).join(', '));
        }
    }
}

listColumns().catch(console.error);
