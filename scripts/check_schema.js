const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
    console.log('🔍 Checking Schema...');

    // Check 'departments' columns
    const { data: dept, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .limit(1);

    if (deptError) console.error('Error fetching departments:', deptError.message);
    else if (dept && dept.length > 0) console.log('✅ Departments Table Columns:', Object.keys(dept[0]));
    else console.log('⚠️ Departments table empty or not found');

    // Check if 'system_settings' exists
    const { data: settings, error: settingsError } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1);

    if (settingsError) {
        console.log('❌ system_settings table likely missing:', settingsError.message);
    } else {
        console.log('✅ system_settings table exists');
        if (settings.length > 0) console.log('   Columns:', Object.keys(settings[0]));
    }

    // Check if 'student_master' exists
    const { data: students, error: studentError } = await supabase
        .from('student_master')
        .select('*')
        .limit(1);

    if (studentError) {
        console.log('❌ student_master table likely missing:', studentError.message);
    } else {
        console.log('✅ student_master table exists');
    }
}

checkSchema();
