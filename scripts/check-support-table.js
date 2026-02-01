const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSupportTicketsTable() {
    console.log('🔍 Checking support_tickets table structure...');

    // Attempt to fetch one record to see columns
    const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error fetching support_tickets:', error.message);
        console.log('Maybe the table does not exist?');

        // Try to check if table exists via a simple count
        const { count, error: countError } = await supabase
            .from('support_tickets')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('❌ Table check failed:', countError.message);
        } else {
            console.log('✅ Table exists, but query failed. Count:', count);
        }
    } else {
        console.log('✅ Query Successful!');
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('Table is empty. Still fetching columns via a specific query...');
            // Try to fetch columns even if empty
            const { data: emptyData, error: emptyError } = await supabase
                .from('support_tickets')
                .select('*')
                .limit(0);

            if (emptyError) {
                console.error('❌ Failed to fetch columns:', emptyError.message);
            } else {
                // This might not return keys if empty, but worth a shot
                console.log('Success, but no data to infer columns from.');
            }
        }
    }
}

checkSupportTicketsTable();
