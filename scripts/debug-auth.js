require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugAuth() {
    console.log('\n🔍 DEBUGGING STAFF AUTHORIZATION\n');
    console.log('='.repeat(70));

    // 1. Check profiles table structure
    console.log('\n1️⃣ Checking profiles table structure...');

    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'department'])
        .limit(5);

    if (profilesError) {
        console.log(`   ❌ Error fetching profiles: ${profilesError.message}`);
    } else {
        console.log(`   Found ${profiles?.length || 0} staff/admin profiles\n`);

        if (profiles && profiles.length > 0) {
            profiles.forEach(p => {
                console.log(`   📧 ${p.email}`);
                console.log(`      id: ${p.id}`);
                console.log(`      role: ${p.role}`);
                console.log(`      department_name: ${p.department_name || 'NULL'}`);
                console.log(`      assigned_department_ids: ${JSON.stringify(p.assigned_department_ids) || 'NULL'}`);
                console.log(`      is_active: ${p.is_active}`);
                console.log('');
            });
        }
    }

    // 2. Check departments table
    console.log('\n2️⃣ Checking departments table...');

    const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('id, name, display_name, is_active')
        .order('display_order');

    if (deptError) {
        console.log(`   ❌ Error: ${deptError.message}`);
    } else {
        console.log(`   Found ${departments?.length || 0} departments:`);
        departments?.forEach(d => {
            console.log(`     - ${d.name} (${d.display_name}) | Active: ${d.is_active} | ID: ${d.id}`);
        });
    }

    // 3. Check if profiles.department_name matches departments.name
    console.log('\n3️⃣ Checking department name mappings...');

    const deptNames = departments?.map(d => d.name) || [];

    for (const profile of (profiles || [])) {
        if (profile.department_name) {
            const match = deptNames.includes(profile.department_name);
            console.log(`   ${match ? '✅' : '❌'} ${profile.email}: department_name="${profile.department_name}" ${match ? 'MATCHES' : 'NOT FOUND in departments table'}`);
        }
    }

    // 4. Check auth.users table
    console.log('\n4️⃣ Checking auth.users...');

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.log(`   ❌ Error: ${authError.message}`);
    } else {
        const staffUsers = authUsers.users.filter(u =>
            u.email?.includes('test_') || u.email === 'admin@jecrcu.edu.in'
        );

        console.log(`   Found ${staffUsers.length} test users in auth:`);
        staffUsers.forEach(u => {
            const hasProfile = profiles?.find(p => p.id === u.id);
            console.log(`     ${hasProfile ? '✅' : '❌'} ${u.email} | Profile: ${hasProfile ? 'EXISTS' : 'MISSING'}`);
        });
    }

    // 5. Check the middleware/route protection logic
    console.log('\n5️⃣ Authorization flow check...');
    console.log('   The /staff/dashboard route requires:');
    console.log('   - User must be authenticated (via Supabase)');
    console.log('   - Profile must exist in profiles table');
    console.log('   - Profile.role must be "admin" or "department"');
    console.log('   - Profile.is_active must be true');

    console.log('\n' + '='.repeat(70));
    console.log('\n💡 DIAGNOSIS:\n');

    // Check for common issues
    let issues = [];

    if (!profiles || profiles.length === 0) {
        issues.push('No staff profiles found - accounts may not have been created properly');
    }

    for (const profile of (profiles || [])) {
        if (!profile.role) {
            issues.push(`Profile ${profile.email} has no role`);
        }
        if (profile.role === 'department' && !profile.department_name) {
            issues.push(`Profile ${profile.email} is department but has no department_name`);
        }
        if (!profile.is_active) {
            issues.push(`Profile ${profile.email} is not active`);
        }
    }

    if (issues.length > 0) {
        console.log('   ⚠️ ISSUES FOUND:');
        issues.forEach(i => console.log(`     - ${i}`));
    } else {
        console.log('   ✅ Profiles look correct. Issue may be in the route protection code.');
    }

    console.log('\n');
}

debugAuth()
    .then(() => process.exit(0))
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    });
