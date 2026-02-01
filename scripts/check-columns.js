const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkColumns() {
    console.log('--- no_dues_forms ---');
    const { data: f, error: fe } = await supabase.from('no_dues_forms').select('*').limit(1);
    if (fe) console.error(fe);
    else if (f.length > 0) console.log(Object.keys(f[0]).join(', '));
    else console.log('Empty table');

    console.log('\n--- no_dues_status ---');
    const { data: s, error: se } = await supabase.from('no_dues_status').select('*').limit(1);
    if (se) console.error(se);
    else if (s.length > 0) console.log(Object.keys(s[0]).join(', '));
    else console.log('Empty table');
}

checkColumns();
