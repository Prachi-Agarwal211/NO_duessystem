const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findData() {
    // Try to get all tables from pg_tables
    const { data: tables, error } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public');

    if (error) {
        console.error('Error listing tables:', error.message);
        return;
    }

    console.log(`Found ${tables.length} tables. Checking counts...`);

    for (const t of tables) {
        try {
            const { count, error: countError } = await supabase.from(t.tablename).select('*', { count: 'exact', head: true });
            if (countError) {
                console.log(`${t.tablename}: Error (${countError.message})`);
            } else {
                console.log(`${t.tablename}: ${count}`);
            }
        } catch (e) {
            console.log(`${t.tablename}: Exception`);
        }
    }
}

findData().catch(console.error);
