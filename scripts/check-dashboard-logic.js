const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDashboardData() {
    console.log('🔍 Mimicking Dashboard API Logic...');

    // This is roughly what the dashboard API does to get departments
    // We'll pick a department that likely has data
    const { data: depts } = await supabase.from('departments').select('name').limit(10);
    const myDeptNames = depts.map(d => d.name);
    console.log('Departments:', myDeptNames);

    const { data, error } = await supabase
        .from('no_dues_status')
        .select(`
      id,
      department_name,
      status,
      no_dues_forms!inner (
        id,
        registration_no,
        student_name
      )
    `)
        .in('department_name', myDeptNames)
        .eq('status', 'pending')
        .limit(5);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`Found ${data.length} records.`);
    data.forEach((item, i) => {
        console.log(`\nRecord ${i + 1}:`);
        console.log(`- Status ID:  ${item.id}`);
        console.log(`- Form ID:    ${item.no_dues_forms?.id}`);
        console.log(`- Reg No:     ${item.no_dues_forms?.registration_no}`);
        console.log(`- Student:    ${item.no_dues_forms?.student_name}`);

        // Check if we can find this form by ID
        if (item.no_dues_forms?.id) {
            console.log(`- Verifying form ID in DB...`);
        }
    });
}

checkDashboardData();
