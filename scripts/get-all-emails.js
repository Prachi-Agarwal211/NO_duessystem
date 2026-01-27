const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getAllEmails() {
    console.log('📧 FETCHING DEPARTMENT AND PROFILE EMAILS...\n');

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('full_name, email, role, department_name')
            .order('role', { ascending: true });

        if (error) {
            console.error('❌ ERROR:', error.message);
            return;
        }

        if (!data || data.length === 0) {
            console.log('⚠️ No profiles found.');
            return;
        }

        console.log('--------------------------------------------------------------------------------');
        console.log('| Name                 | Email                          | Role       | Department       |');
        console.log('--------------------------------------------------------------------------------');

        data.forEach(profile => {
            const name = (profile.full_name || 'N/A').padEnd(20);
            const email = (profile.email || 'N/A').padEnd(30);
            const role = (profile.role || 'N/A').padEnd(10);
            const dept = (profile.department_name || 'N/A').padEnd(16);
            console.log(`| ${name} | ${email} | ${role} | ${dept} |`);
        });

        console.log('--------------------------------------------------------------------------------');
        console.log(`\n✅ Total profiles found: ${data.length}`);

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

getAllEmails();
