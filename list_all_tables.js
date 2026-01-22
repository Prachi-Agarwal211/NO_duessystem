const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listAllTables() {
    const { data, error } = await supabase.rpc('get_all_tables');
    if (error) {
        // If RPC fails, try generic query
        console.log('RPC get_all_tables failed, trying information_schema...');
        const { data: tables, error: tableError } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public');
        if (tableError) {
            // Fallback to manual list check
            console.log('Trying manual check of suspected tables...');
            const suspected = ['students', 'erp_data', 'alumni', 'registration_data'];
            for (const t of suspected) {
                const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
                if (count !== null) console.log(`${t}: ${count}`);
            }
        } else {
            console.log('Tables found:', tables.map(t => t.tablename));
        }
    } else {
        console.log('Tables from RPC:', data);
    }
}

listAllTables().catch(console.error);
