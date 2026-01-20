require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test accounts to create with password: Test@1234
const TEST_ACCOUNTS = [
    { email: 'admin@jecrcu.edu.in', name: 'System Admin', role: 'admin', department: null },
    { email: 'test_school_hod@jecrcu.edu.in', name: 'School HOD', role: 'department', department: 'school_hod' },
    { email: 'test_library@jecrcu.edu.in', name: 'Library Staff', role: 'department', department: 'library' },
    { email: 'test_it_department@jecrcu.edu.in', name: 'IT Department', role: 'department', department: 'it_department' },
    { email: 'test_hostel@jecrcu.edu.in', name: 'Hostel Warden', role: 'department', department: 'hostel' },
    { email: 'test_accounts_department@jecrcu.edu.in', name: 'Accounts Staff', role: 'department', department: 'accounts_department' },
    { email: 'test_registrar@jecrcu.edu.in', name: 'Registrar Staff', role: 'department', department: 'registrar' },
    { email: 'test_alumni_association@jecrcu.edu.in', name: 'Alumni Staff', role: 'department', department: 'alumni_association' }
];

const TEST_PASSWORD = 'Test@1234';

async function resetTestAccounts() {
    console.log('\n🔧 RESETTING TEST ACCOUNTS\n');
    console.log('='.repeat(60));
    console.log(`Password for all accounts: ${TEST_PASSWORD}`);
    console.log('='.repeat(60));

    // Step 1: Get all existing test accounts
    console.log('\n1️⃣ Finding existing test accounts...');

    const testEmails = TEST_ACCOUNTS.map(a => a.email);

    const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('email', testEmails);

    console.log(`   Found ${existingProfiles?.length || 0} existing accounts`);

    // Step 2: Delete existing test accounts
    if (existingProfiles && existingProfiles.length > 0) {
        console.log('\n2️⃣ Deleting existing test accounts...');

        for (const profile of existingProfiles) {
            try {
                // Delete from auth
                const { error: authError } = await supabase.auth.admin.deleteUser(profile.id);
                if (authError) {
                    console.log(`   ⚠️ Auth delete failed for ${profile.email}: ${authError.message}`);
                }

                // Delete from profiles (might cascade from auth)
                await supabase.from('profiles').delete().eq('id', profile.id);

                console.log(`   ✅ Deleted: ${profile.email}`);
            } catch (e) {
                console.log(`   ❌ Error deleting ${profile.email}: ${e.message}`);
            }
        }
    }

    // Step 3: Get department IDs for mapping
    console.log('\n3️⃣ Fetching department IDs...');

    const { data: departments } = await supabase
        .from('departments')
        .select('id, name');

    const deptMap = {};
    departments?.forEach(d => {
        deptMap[d.name] = d.id;
    });
    console.log(`   Found ${departments?.length || 0} departments`);

    // Step 4: Create new test accounts
    console.log('\n4️⃣ Creating test accounts...\n');

    const createdAccounts = [];

    for (const account of TEST_ACCOUNTS) {
        try {
            // Create user in auth
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: account.email,
                password: TEST_PASSWORD,
                email_confirm: true,
                user_metadata: {
                    full_name: account.name,
                    role: account.role,
                    department_name: account.department
                }
            });

            if (authError) {
                console.log(`   ❌ Failed to create ${account.email}: ${authError.message}`);
                continue;
            }

            // Create profile
            const profileData = {
                id: authData.user.id,
                email: account.email,
                full_name: account.name,
                role: account.role,
                is_active: true
            };

            if (account.department) {
                profileData.department_name = account.department;
                if (deptMap[account.department]) {
                    profileData.assigned_department_ids = [deptMap[account.department]];
                }
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .insert(profileData);

            if (profileError) {
                console.log(`   ❌ Profile creation failed for ${account.email}: ${profileError.message}`);
                // Rollback auth user
                await supabase.auth.admin.deleteUser(authData.user.id);
                continue;
            }

            console.log(`   ✅ Created: ${account.email} (${account.role}${account.department ? ' - ' + account.department : ''})`);
            createdAccounts.push(account);

        } catch (e) {
            console.log(`   ❌ Error creating ${account.email}: ${e.message}`);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ DONE! Created accounts:\n');

    createdAccounts.forEach(a => {
        console.log(`   📧 ${a.email}`);
        console.log(`      Role: ${a.role}${a.department ? ' (' + a.department + ')' : ''}`);
        console.log(`      Password: ${TEST_PASSWORD}`);
        console.log('');
    });

    console.log('='.repeat(60));
    console.log('\n🔑 Use these credentials to login at:');
    console.log('   Staff: http://localhost:3000/staff/login');
    console.log('   Admin: http://localhost:3000/admin\n');
}

resetTestAccounts()
    .then(() => process.exit(0))
    .catch(e => {
        console.error('Fatal error:', e);
        process.exit(1);
    });
