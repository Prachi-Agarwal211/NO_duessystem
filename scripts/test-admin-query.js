const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testAdminStudentsQuery() {
    console.log('🔍 Testing Admin Students API query with * selector...');
    const { data, error } = await supabase
        .from('no_dues_forms')
        .select(`
        *,
        no_dues_status (
          department_name,
          status,
          action_at,
          action_by
        )
      `)
        .limit(1);

    if (error) {
        console.error('❌ Query Failed!');
        console.error('Error:', error);
    } else {
        console.log('✅ Query Successful!');
        if (data && data.length > 0) {
            console.log('Has user_id in result:', 'user_id' in data[0]);
            console.log('Columns returned:', Object.keys(data[0]));
        }
    }
}

testAdminStudentsQuery();
