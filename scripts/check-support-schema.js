const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkSchema() {
    try {
        const { data, error } = await supabase
            .from('support_tickets')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error fetching support_tickets:', error);
            return;
        }

        if (data && data.length > 0) {
            const ticket = data[0];
            console.log('Sample ticket columns:');
            Object.keys(ticket).forEach(key => {
                console.log(`  ${key}: ${ticket[key]}`);
            });
        } else {
            console.log('No tickets found, checking column info via raw query?');
            // Try to get column info via information_schema (not possible via supabase)
        }

        // Also try to get column list by fetching a single row with a known column
        const { data: anyData } = await supabase
            .from('support_tickets')
            .select('id')
            .limit(1);
        console.log('Table exists?', anyData !== null);
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkSchema();