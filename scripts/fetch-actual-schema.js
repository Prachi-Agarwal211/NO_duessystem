const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getActualSchema() {
    console.log('🔍 Fetching actual schema for support_tickets...');

    // Try to query information_schema directly
    // Note: This requires the service role to have access, which it often does in Supabase unless explicitly revoked.
    const { data: columns, error } = await supabase
        .from('columns') // This is a trick to query the 'columns' view in information_schema if exposed via PostgREST
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'support_tickets')
        .filter('table_schema', 'eq', 'public');

    if (error) {
        console.log('PostgREST direct information_schema access failed. Trying alternative...');

        // Alternative: Try to fetch a single record and use Object.keys (if any data exists)
        // If no data exists, we can try to "force" an error by selecting a non-existent column
        const { error: errorWithValidColumns } = await supabase
            .from('support_tickets')
            .select('non_existent_column_for_debug_purposes');

        if (errorWithValidColumns) {
            console.log('\n❌ Could not fetch columns directly. Here is the error metadata which might contain hints:');
            console.error('Error:', errorWithValidColumns.message);
            console.error('Hint:', errorWithValidColumns.hint);
        }
    } else {
        console.log('✅ Found columns:');
        console.table(columns);
    }
}

getActualSchema();
