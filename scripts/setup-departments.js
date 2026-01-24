/**
 * Setup Departments and Staff Configuration
 * 
 * 1. Ensures 'Academic Department' exists
 * 2. Links staff profiles to departments
 * 3. Configures a test HoD profile with scoping
 * 4. Resets passwords to Test@1234
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setup() {
    console.log('⚙️  Configuring Department & Staff...\n');

    // 1. Ensure "Academic Department" exists
    console.log('1️⃣  Checking/Creating "Academic Department"...');
    let { data: academicDept, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('name', 'academic_dept')
        .maybeSingle();

    if (!academicDept) {
        const { data: newDept, error } = await supabase
            .from('departments')
            .insert({
                id: crypto.randomUUID(),
                name: 'academic_dept',
                display_name: 'Academic Department',
                is_active: true,
                display_order: 1,
                is_school_specific: false,
                email: 'dean@jecrc.edu.in',
                created_at: new Date(),
                updated_at: new Date()
            })
            .select()
            .single();

        if (error) {
            console.error('   ❌ Failed to create Academic Dept:', error.message);
        } else {
            console.log('   ✅ Created "Academic Department"');
            academicDept = newDept;
        }
    } else {
        console.log('   ✅ "Academic Department" already exists');
    }

    // 2. Fetch all departments map
    const { data: allDepts } = await supabase.from('departments').select('id, name');
    const deptMap = new Map(allDepts.map(d => [d.name, d.id]));

    // 3. Update Standard Staff Profiles
    console.log('\n2️⃣  Updating Standard Staff Profiles...');
    const staffMapping = {
        'library@jecrc.edu.in': 'library',
        'accounts@jecrc.edu.in': 'accounts',
        'hostel@jecrc.edu.in': 'hostel',
        'registrar@jecrc.edu.in': 'registrar',
        'it.dept@jecrc.edu.in': 'it_department'
    };

    for (const [email, deptName] of Object.entries(staffMapping)) {
        let targetId = deptMap.get(deptName);
        if (!targetId) {
            const match = allDepts.find(d => d.name.includes(deptName) || d.name === deptName);
            if (match) targetId = match.id;
        }

        if (targetId) {
            const { error } = await supabase
                .from('profiles')
                .update({ assigned_department_ids: [targetId] })
                .eq('email', email);

            if (error) console.error(`   ❌ Failed to update ${email}:`, error.message);
            else console.log(`   ✅ Linked ${email} to ${deptName} (${targetId})`);
        } else {
            console.warn(`   ⚠️  Department '${deptName}' not found for ${email} (skipped)`);
        }
    }

    // 4. Configure HoD Profile (Test)
    console.log('\n3️⃣  Configuring Test HoD Profile (Civil)...');
    const { data: civilBranch } = await supabase
        .from('config_branches')
        .select('id')
        .ilike('name', '%Civil%')
        .limit(1)
        .single();

    if (civilBranch && academicDept) {
        const hodEmail = 'hod.jecrc@jecrc.edu.in';
        const { error: hodError } = await supabase
            .from('profiles')
            .update({
                assigned_department_ids: [academicDept.id],
                branch_ids: [civilBranch.id],
                school_ids: [],
                course_ids: []
            })
            .eq('email', hodEmail);

        if (hodError) {
            console.error(`   ❌ Failed to update HoD ${hodEmail}:`, hodError.message);
        } else {
            console.log(`   ✅ Configured ${hodEmail} as Civil HoD (Scoped to Branch: ${civilBranch.id})`);
        }
    } else {
        if (!civilBranch) console.warn('   ⚠️  Could not find Civil Branch');
        if (!academicDept) console.warn('   ⚠️  Could not find Academic Dept');
    }

    // 5. Reset Passwords
    console.log('\n4️⃣  Resetting Passwords to "Test@1234"...');

    // Fetch IDs of all staff/admins
    const { data: staffUsers, error: staffError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .in('role', ['department', 'admin']);

    if (staffError) {
        console.error('   ❌ Failed to fetch staff for password reset:', staffError.message);
    } else if (staffUsers && staffUsers.length > 0) {
        console.log(`   Target count: ${staffUsers.length} users`);
        for (const user of staffUsers) {
            if (!user.email) continue;

            const { error: updateError } = await supabase.auth.admin.updateUserById(
                user.id,
                { password: 'Test@1234' }
            );

            if (updateError) {
                console.error(`   ❌ Failed to reset password for ${user.email}:`, updateError.message);
            } else {
                console.log(`   ✅ Reset password for ${user.email} (${user.role})`);
            }
        }
    } else {
        console.log('   ⚠️  No staff/admin users found to reset.');
    }

    console.log('\n✅ Setup Complete.');
}

setup().catch(console.error);
