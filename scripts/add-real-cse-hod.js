/**
 * Add Real HoD Account for CSE
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addRealCseHod() {
    const email = '15anuragsingh2003@gmail.com';
    const name = 'CSE HoD (Anurag Singh)';

    console.log(`👷 Creating/Updating HoD Account for ${email}...\n`);

    // 1. Get Academic Dept ID
    const { data: dept } = await supabase
        .from('departments')
        .select('id')
        .eq('name', 'academic_dept')
        .single();

    if (!dept) {
        console.error('❌ Academic Department not found. Run setup-departments.js first.');
        return;
    }

    // 2. Get CSE Branch ID
    console.log('🔍 Finding CSE Branch...');
    const { data: cseBranch } = await supabase
        .from('config_branches')
        .select('id, name')
        .ilike('name', '%Computer Science%')
        .limit(1)
        .single();

    if (!cseBranch) {
        console.error('❌ CSE branch not found');
        return;
    }
    console.log(`   Found CSE: ${cseBranch.name}`);

    // 3. Create/Fetch Auth User
    let userId;
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: 'Test@1234',
        email_confirm: true,
        user_metadata: {
            full_name: name,
            role: 'department',
            department_name: 'academic_dept'
        }
    });

    if (authError) {
        console.log(`   Note: ${authError.message}`);
        // Try to find existing user
        const { data: profiles } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
        if (profiles) {
            userId = profiles.id;
        } else {
            // User might be in auth but not profile
            const { data: users } = await supabase.auth.admin.listUsers();
            const user = users.users.find(u => u.email === email);
            if (user) userId = user.id;
        }
    } else {
        console.log('   ✅ Auth user created');
        userId = authUser.user.id;
    }

    if (userId) {
        // 4. Update/Insert Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                email: email,
                full_name: name,
                role: 'department',
                department_name: 'academic_dept',
                assigned_department_ids: [dept.id],
                branch_ids: [cseBranch.id],
                school_ids: [],
                course_ids: [],
                updated_at: new Date()
            });

        if (profileError) {
            console.error(`   ❌ Profile update failed: ${profileError.message}`);
        } else {
            console.log(`   ✅ Profile configured for CSE scope`);
        }

        // 5. Ensure Password
        await supabase.auth.admin.updateUserById(userId, { password: 'Test@1234' });
        console.log('   ✅ Password confirmed as Test@1234');
    } else {
        console.error('❌ Could not determine User ID');
    }

    console.log('\n✅ Task Complete.');
}

addRealCseHod().catch(console.error);
