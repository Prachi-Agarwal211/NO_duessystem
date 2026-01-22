const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listColumns() {
    const { data: cols, error } = await supabase.rpc('get_table_columns', { table_name: 'no_dues_forms' });
    if (error) {
        console.error('Error:', error.message);
        return;
    }
    const columnNames = cols.map(c => c.column_name).join('\n');
    fs.writeFileSync('columns_out.txt', columnNames);
    console.log('Columns written to columns_out.txt');
}

listColumns().catch(console.error);
