
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFetch() {
    console.log('🧪 Replicating API Fetch Logic...\n');

    // 1. Fetch Schools (Exact match of route.js logic)
    const { data: schools, error: sErr } = await supabaseAdmin
        .from('config_schools')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

    console.log('--- SCHOOLS ---');
    if (sErr) console.error('Error:', sErr.message);
    else console.log(`Count: ${schools.length}`);

    // 2. Fetch Courses
    const { data: courses, error: cErr } = await supabaseAdmin
        .from('config_courses')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

    console.log('\n--- COURSES ---');
    if (cErr) console.error('Error:', cErr.message);
    else console.log(`Count: ${courses.length}`);

    // 3. Raw check for ANY school
    const { count, error: countErr } = await supabaseAdmin
        .from('config_schools')
        .select('*', { count: 'exact', head: true });

    console.log('\n--- RAW DB CHECK ---');
    console.log(`Total Schools in Table: ${count}`);
    if (countErr) console.error('Count Error:', countErr.message);

}

testFetch();
