const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    console.log('🔍 Listing all tables in public schema...');

    const { data, error } = await supabase
        .rpc('get_tables'); // This might not work if rpc doesn't exist

    if (error) {
        console.log('RPC get_tables failed. Trying query approach...');
        const { data: tables, error: tableError } = await supabase
            .from('pg_catalog.pg_tables') // This might not be accessible via PostgREST
            .select('tablename')
            .eq('schemaname', 'public');

        if (tableError) {
            console.log('Query approach failed. Listing common tables to check existence...');
            const commonTables = ['profiles', 'no_dues_forms', 'no_dues_status', 'support_tickets', 'no_dues_messages', 'certificate_verifications'];
            for (const table of commonTables) {
                const { error: checkError } = await supabase.from(table).select('count').limit(1);
                console.log(`Table ${table}: ${checkError ? '❌ (' + checkError.message + ')' : '✅'}`);
            }
        } else {
            console.log('Tables:', tables.map(t => t.tablename).join(', '));
        }
    } else {
        console.log('Tables:', data);
    }
}

listTables();
