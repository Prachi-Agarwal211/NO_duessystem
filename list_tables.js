const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listTables() {
    const tables = ['student_data', 'no_dues_forms', 'config_schools', 'config_courses', 'config_branches'];
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`Error reading ${table}:`, error.message);
        } else {
            console.log(`${table}: ${count}`);
        }
    }
}

listTables().catch(console.error);
