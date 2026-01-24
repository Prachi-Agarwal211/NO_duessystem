/**
 * Get complete table schema from Supabase
 * Usage: node scripts/get-schema.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getSchema() {
    const tables = ['student_data', 'no_dues_forms', 'no_dues_status', 'departments',
        'config_schools', 'config_courses', 'config_branches'];

    const results = {};

    for (const table of tables) {
        const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact' })
            .limit(1);

        results[table] = {
            exists: !error,
            error: error?.message || null,
            columns: data && data.length > 0 ? Object.keys(data[0]) : [],
            count: count || 0
        };
    }

    console.log(JSON.stringify(results, null, 2));
}

getSchema().catch(console.error);
