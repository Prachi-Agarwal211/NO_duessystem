const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkProfiles() {
    const { data: p, error: pe } = await supabase.from('profiles').select('*').limit(1);
    if (pe) console.error(pe);
    else if (p.length > 0) console.log(Object.keys(p[0]).join(', '));
    else console.log('No records in profiles');
}

checkProfiles();
