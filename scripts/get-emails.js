const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getEmails() {
    const { data, error } = await supabase
        .from('profiles')
        .select('email, role')
        .limit(10);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

getEmails();
