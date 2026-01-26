
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStaff() {
    console.log('🔍 Checking profiles table schema compatibility...');

    // MATCHING API QUERY EXACTLY
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, department_name, role, school_ids, course_ids, branch_ids, is_active, created_at')
        .in('role', ['department', 'staff']);

    if (error) {
        console.error('❌ API QUERY FAILED via Script:', error);
        return;
    }

    console.log(`Found ${profiles.length} total profiles.`);

    const staff = profiles.filter(p => ['staff', 'department'].includes(p.role));
    console.log(`\nFiltered Staff/Department Profiles (${staff.length}):`);
    staff.forEach(s => {
        console.log(`- ${s.email} [${s.role}] Dept: ${s.department_name}`);
    });

    const other = profiles.filter(p => !['staff', 'department'].includes(p.role));
    console.log(`\nOther Roles (${other.length}):`);
    const counts = {};
    other.forEach(p => counts[p.role] = (counts[p.role] || 0) + 1);
    console.log(counts);
}

checkStaff();
