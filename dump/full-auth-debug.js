require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Create two clients - admin and normal user
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TEST_EMAIL = 'test_library@jecrcu.edu.in';
const TEST_PASSWORD = 'Test@1234';

async function fullDebug() {
    console.log('\n🔍 FULL AUTH/PROFILE DEBUGGING\n');
    console.log('='.repeat(70));

    // Step 1: Check if user exists in auth
    console.log('\n1️⃣ Checking auth.users...');
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authData?.users.find(u => u.email === TEST_EMAIL);

    if (!authUser) {
        console.log(`   ❌ User ${TEST_EMAIL} NOT FOUND in auth.users`);
        console.log('   👉 Run reset-test-accounts.js first');
        return;
    }

    console.log(`   ✅ Auth user found`);
    console.log(`   ID: ${authUser.id}`);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Confirmed: ${authUser.email_confirmed_at ? 'YES' : 'NO'}`);

    // Step 2: Check profile via admin client (bypasses RLS)
    console.log('\n2️⃣ Checking profile via ADMIN client (bypasses RLS)...');

    const { data: adminProfile, error: adminProfileErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

    if (adminProfileErr) {
        console.log(`   ❌ Profile query failed: ${adminProfileErr.message}`);
        console.log(`   Code: ${adminProfileErr.code}`);
    } else if (!adminProfile) {
        console.log(`   ❌ Profile NOT FOUND for ID ${authUser.id}`);
        console.log('\n   🔧 FIX: Profile needs to be created with matching ID');
    } else {
        console.log(`   ✅ Profile found`);
        console.log(`   ID: ${adminProfile.id}`);
        console.log(`   Email: ${adminProfile.email}`);
        console.log(`   Role: ${adminProfile.role}`);
        console.log(`   Department: ${adminProfile.department_name}`);
        console.log(`   Active: ${adminProfile.is_active}`);
    }

    // Step 3: Sign in as the user
    console.log('\n3️⃣ Signing in as test user...');

    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
    });

    if (signInError) {
        console.log(`   ❌ Sign in failed: ${signInError.message}`);
        console.log(`   Code: ${signInError.code}`);
        return;
    }

    console.log(`   ✅ Sign in successful!`);
    console.log(`   User ID: ${signInData.user.id}`);
    console.log(`   Session: ${signInData.session ? 'YES' : 'NO'}`);

    // Step 4: Query profile as signed-in user (WITH RLS)
    console.log('\n4️⃣ Querying profile as signed-in user (WITH RLS)...');

    const { data: userProfile, error: userProfileErr } = await supabaseAnon
        .from('profiles')
        .select('full_name, role, department_name')
        .eq('id', signInData.user.id)
        .single();

    if (userProfileErr) {
        console.log(`   ❌ Profile query FAILED: ${userProfileErr.message}`);
        console.log(`   Code: ${userProfileErr.code}`);
        console.log(`   Details: ${JSON.stringify(userProfileErr)}`);

        console.log('\n   🔴 THIS IS THE PROBLEM!');
        console.log('   The RLS policy is blocking the profile query.');
        console.log('   The signed-in user cannot read their own profile.');

        // Check what policies exist
        console.log('\n5️⃣ Checking current RLS policies...');

        const { data: policies, error: polErr } = await supabaseAdmin.rpc('get_policies_for_table', {
            table_name: 'profiles'
        });

        if (polErr) {
            console.log('   Could not fetch policies via RPC');

            // Try SQL query directly
            console.log('   Trying direct approach...\n');

            // Check if the profile id matches auth.uid()
            console.log('   Debugging auth.uid() mismatch:');
            console.log(`     - signInData.user.id = ${signInData.user.id}`);
            console.log(`     - Profile ID (from admin)= ${adminProfile?.id}`);
            console.log(`     - IDs match?: ${signInData.user.id === adminProfile?.id ? 'YES ✅' : 'NO ❌'}`);
        }
    } else {
        console.log(`   ✅ Profile query SUCCESSFUL!`);
        console.log(`   Name: ${userProfile.full_name}`);
        console.log(`   Role: ${userProfile.role}`);
        console.log(`   Department: ${userProfile.department_name}`);

        // Check authorization
        const isAuthorized = userProfile.role === 'department' || userProfile.role === 'admin';
        console.log(`\n   🎫 Authorization: ${isAuthorized ? 'GRANTED ✅' : 'DENIED ❌'}`);

        if (!isAuthorized) {
            console.log('   User has role:', userProfile.role);
            console.log('   Expected: "department" or "admin"');
        }
    }

    // Sign out
    await supabaseAnon.auth.signOut();

    console.log('\n' + '='.repeat(70));
    console.log('DEBUG COMPLETE\n');
}

fullDebug()
    .then(() => process.exit(0))
    .catch(e => {
        console.error('Fatal error:', e);
        process.exit(1);
    });
