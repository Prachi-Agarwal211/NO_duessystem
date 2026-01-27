const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
    console.log('🔍 CHECKING ACTUAL DATABASE SCHEMA\n');

    // Query PostgreSQL information schema to get all tables
    const { data, error } = await supabase.rpc('get_table_info');

    if (error) {
        console.log('⚠️ RPC not available, trying direct query...\n');

        // Try listing via PostgREST introspection endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
            headers: {
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            }
        });

        const introspection = await response.json();
        console.log('Available tables/views:', Object.keys(introspection.definitions || {}));
    } else {
        console.log('Tables found:', data);
    }

    // Try each potential table directly
    console.log('\n📊 TESTING TABLE ACCESS:\n');

    const tablesToTest = [
        'students',
        'student_profiles',
        'departments',
        'clearance_requests',
        'clearance_request',
        'reapplications',
        'reapplication',
        'department_messages',
        'messages',
        'chat_messages',
        'config',
        'staff_profiles',
        'staff'
    ];

    for (const table of tablesToTest) {
        const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (!error) {
            console.log(`✅ ${table} - ${count} rows`);
        } else {
            console.log(`❌ ${table} - ${error.message}`);
        }
    }
}

checkSchema();
