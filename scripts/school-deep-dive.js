
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deepDive() {
    console.log('🕵️ School Deep Dive Diagnostic...\n');

    // 1. Raw Count (Ignore filters)
    const { count: rawCount, error: err1 } = await supabaseAdmin
        .from('config_schools')
        .select('*', { count: 'exact', head: true });

    console.log(`Raw Total Rows: ${rawCount}`);
    if (err1) console.error('Raw Error:', err1.message);

    // 2. Active Count
    const { count: activeCount, error: err2 } = await supabaseAdmin
        .from('config_schools')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

    console.log(`Active Rows (is_active=true): ${activeCount}`);
    if (err2) console.error('Active Error:', err2.message);

    // 3. Inspect Schema/Data types of first row
    const { data: sample, error: err3 } = await supabaseAdmin
        .from('config_schools')
        .select('*')
        .limit(1);

    if (sample?.[0]) {
        console.log('\n--- Sample Row ---');
        console.log(JSON.stringify(sample[0], null, 2));
        console.log('is_active type:', typeof sample[0].is_active);
    } else {
        console.log('\n❌ NO DATA IN TABLE!');
    }

    // 4. Try fetching WITHOUT the order-by (just in case)
    const { data: noOrder, error: err4 } = await supabaseAdmin
        .from('config_schools')
        .select('id, name');

    console.log(`\nFetch without filters/order: ${noOrder?.length || 0} rows`);

}

deepDive();
