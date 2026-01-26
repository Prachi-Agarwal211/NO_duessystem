
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHostelRequests() {
    console.log('--- HOSTEL DASHBOARD CHECK ---');

    // 1. Get the Hostel Dept Name variants used in DB
    const { data: deptNames } = await supabase
        .from('no_dues_status')
        .select('department_name')
        .ilike('department_name', 'hostel');

    console.log(`Found ${deptNames?.length || 0} rows in no_dues_status matching "hostel"`);

    if (deptNames?.length > 0) {
        // Group by status
        const { data: stats } = await supabase
            .from('no_dues_status')
            .select('status, count')
            .ilike('department_name', 'hostel')
        //.select('status', { count: 'exact' }) // Grouping not easy via simple select, let's just fetch all and counts
    }

    // Better approach: Count by status
    const statuses = ['pending', 'approved', 'rejected'];
    for (const status of statuses) {
        const { count, error } = await supabase
            .from('no_dues_status')
            .select('*', { count: 'exact', head: true })
            .ilike('department_name', 'hostel')
            .eq('status', status);

        console.log(`- ${status.toUpperCase()}: ${count !== null ? count : 'Error'}`);
        if (error) console.error(error);
    }

    // 2. Check specific request details if any
    const { data: requests } = await supabase
        .from('no_dues_status')
        .select('id, student_id, status, department_name, created_at')
        .ilike('department_name', 'hostel')
        .limit(5);

    if (requests?.length > 0) {
        console.log('\nSample Requests:');
        requests.forEach(r => {
            console.log(`ID: ${r.id} | Status: ${r.status} | Dept: "${r.department_name}" | Created: ${r.created_at}`);
        });
    } else {
        console.log('\n❌ NO REQUESTS FOUND for Hostel department.');
    }

    console.log('--- END CHECK ---');
}

checkHostelRequests();
