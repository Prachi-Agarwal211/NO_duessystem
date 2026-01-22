const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLastForm() {
    const { data, error } = await supabase
        .from('no_dues_forms')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('Last Form ID:', data[0].id);
        console.log('Registration No:', data[0].registration_no);
        console.log('Alumni Profile Link:', data[0].alumni_profile_link);
        console.log('All non-null fields:', Object.keys(data[0]).filter(k => data[0][k] !== null));
    } else {
        console.log('No forms found.');
    }
}

checkLastForm().catch(console.error);
