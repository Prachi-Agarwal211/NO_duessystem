require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listStaffAccounts() {
    console.log('\n📋 STAFF & ADMIN ACCOUNTS\n');
    console.log('='.repeat(70));

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, department_name, is_active')
        .in('role', ['admin', 'department'])
        .order('role')
        .order('department_name');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`\nFound ${profiles.length} staff/admin accounts:\n`);

    const admins = profiles.filter(p => p.role === 'admin');
    const staff = profiles.filter(p => p.role === 'department');

    if (admins.length > 0) {
        console.log('👑 ADMIN ACCOUNTS:');
        console.log('-'.repeat(70));
        admins.forEach(a => {
            console.log(`  Email: ${a.email}`);
            console.log(`  Name: ${a.full_name || 'N/A'}`);
            console.log(`  Active: ${a.is_active ? '✅' : '❌'}`);
            console.log('');
        });
    }

    if (staff.length > 0) {
        console.log('\n👤 DEPARTMENT STAFF ACCOUNTS:');
        console.log('-'.repeat(70));
        staff.forEach(s => {
            console.log(`  Email: ${s.email}`);
            console.log(`  Name: ${s.full_name || 'N/A'}`);
            console.log(`  Department: ${s.department_name || 'Not assigned'}`);
            console.log(`  Active: ${s.is_active ? '✅' : '❌'}`);
            console.log('');
        });
    }

    console.log('\n' + '='.repeat(70));
    console.log('To login, use these emails with your Supabase auth passwords\n');
}

listStaffAccounts()
    .then(() => process.exit(0))
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    });
