/**
 * Create HoD Accounts for CSE and Civil
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createHoDs() {
    console.log('👷 Creating HoD Accounts...\n');

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

    // 2. Get Branch IDs
    console.log('🔍 Finding Branches...');
    const { data: civilBranch } = await supabase
        .from('config_branches')
        .select('id, name')
        .ilike('name', '%Civil%')
        .limit(1)
        .single();

    const { data: cseBranch } = await supabase
        .from('config_branches')
        .select('id, name')
        .ilike('name', '%Computer Science%') // Try 'Computer Science'
        .limit(1)
        .single();

    if (!civilBranch) console.warn('⚠️ Civil branch not found');
    else console.log(`   Found Civil: ${civilBranch.name}`);

    if (!cseBranch) console.warn('⚠️ CSE branch not found');
    else console.log(`   Found CSE: ${cseBranch.name}`);

    const hods = [
        {
            email: 'hod.civil@jecrc.edu.in',
            name: 'HoD Civil',
            branch: civilBranch
        },
        {
            email: 'hod.cse@jecrc.edu.in',
            name: 'HoD CSE',
            branch: cseBranch
        }
    ];

    // 3. Create Users
    for (const hod of hods) {
        if (!hod.branch) {
            console.log(`❌ Skipping ${hod.name} - Branch not found`);
            continue;
        }

        console.log(`\n👤 Creating ${hod.name} (${hod.email})...`);

        // Create Auth User
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: hod.email,
            password: 'Test@1234',
            email_confirm: true,
            user_metadata: {
                full_name: hod.name,
                role: 'department',
                department_name: 'academic_dept'
            }
        });

        if (authError) {
            console.log(`   User might already exist: ${authError.message}`);
            // If exists, fetch user ID to update profile
            const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', hod.email).single();
            if (existingUser) hod.id = existingUser.id;
        } else {
            console.log('   ✅ Auth user created');
            hod.id = authUser.user.id;
        }

        if (hod.id) {
            // Upsert Profile with Scope
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: hod.id,
                    email: hod.email,
                    full_name: hod.name,
                    role: 'department',
                    department_name: 'academic_dept', // Display purpose
                    assigned_department_ids: [dept.id], // Permission -> Academic Dept
                    school_ids: [],
                    course_ids: [],
                    branch_ids: [hod.branch.id], // SCOPE -> Specific Branch
                    created_at: new Date(),
                    updated_at: new Date()
                });

            if (profileError) console.error(`   ❌ Profile update failed: ${profileError.message}`);
            else console.log(`   ✅ Profile configured with scope: ${hod.branch.name}`);

            // Ensure password is set (if user existed)
            if (authError) {
                await supabase.auth.admin.updateUserById(hod.id, { password: 'Test@1234' });
                console.log('   ✅ Password reset to Test@1234');
            }
        }
    }

    console.log('\n✅ HoD Creation Complete.');
}

createHoDs().catch(console.error);
