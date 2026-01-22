const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCounts() {
    const { count: sdCount } = await supabase.from('student_data').select('*', { count: 'exact', head: true });
    console.log('student_data count:', sdCount);

    const { count: formCount } = await supabase.from('no_dues_forms').select('*', { count: 'exact', head: true });
    console.log('no_dues_forms count:', formCount);
}

checkCounts().catch(console.error);
