require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDashboardApi() {
    console.log('🔍 Testing Admin Dashboard Query...');

    try {
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, role')
            .eq('role', 'admin')
            .limit(1)
            .single();

        if (!profile) {
            console.error('❌ No admin user found for testing');
            return;
        }

        console.log(`👤 Testing with admin user: ${profile.id}`);

        const { data, error } = await supabaseAdmin
            .from('no_dues_forms')
            .select(`
        id,
        student_name,
        registration_no,
        no_dues_status!inner (
          id,
          department_name,
          status,
          profiles!no_dues_status_action_by_user_id_fkey (
            full_name
          )
        )
      `)
            .limit(1);

        if (error) {
            console.error('❌ Dashboard Query Failed:', error.message);
            console.error('   Hint:', error.hint);
            console.error('   Details:', error.details);
        } else {
            console.log('✅ Dashboard Query Successful');
            console.log('📊 Sample Data:', JSON.stringify(data?.[0], null, 2));
        }

    } catch (err) {
        console.error('💥 Execution Error:', err.message);
    }
}

testDashboardApi();
