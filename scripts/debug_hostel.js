
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHostelData() {
    console.log('--- DIAGNOSTIC START ---');

    // 1. Check Profiles matching "Hostel"
    console.log('\n🔍 1. HOSTEL PROFILES:');
    const { data: profiles } = await supabase
        .from('profiles')
        .select('email, department_name, assigned_department_ids')
        .ilike('department_name', '%hostel%');

    if (!profiles || profiles.length === 0) {
        console.log('❌ No profiles found with name like "hostel"');
    } else {
        profiles.forEach(p => {
            console.log(`User: ${p.email}`);
            console.log(` - Dept Name (in Profile): "${p.department_name}"`);
            console.log(` - Assigned IDs: ${JSON.stringify(p.assigned_department_ids)}`);
        });
    }

    // 2. Check Departments Table
    console.log('\n🔍 2. DEPARTMENTS TABLE (All):');
    const { data: depts } = await supabase
        .from('departments')
        .select('id, name, display_name');

    depts?.forEach(d => {
        console.log(` - ID: ${d.id} | Name: "${d.name}" | Display: "${d.display_name}"`);
    });

    // 3. Check No Dues Status Table (Unique Departments)
    console.log('\n🔍 3. NO DUES STATUS TABLE (Unique Department Names):');
    const { data: statusRows } = await supabase
        .from('no_dues_status')
        .select('department_name')
        .limit(500); // Fetch enough to sample

    const uniqueStatusDepts = [...new Set(statusRows?.map(r => r.department_name))];
    console.log(uniqueStatusDepts);

    console.log('--- DIAGNOSTIC END ---');
}

checkHostelData();
