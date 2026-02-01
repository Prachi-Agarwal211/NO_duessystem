const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkColumns() {
    const { data: f, error: fe } = await supabase.from('no_dues_forms').select('*').limit(1);
    if (fe) {
        console.error('Error fetching one row:', fe);

        // Try to get column names from a different record?
    } else if (f && f.length > 0) {
        console.log('Columns in no_dues_forms:');
        Object.keys(f[0]).forEach(key => console.log(`- "${key}"`));
    } else {
        console.log('No records in no_dues_forms');
    }
}

checkColumns();
