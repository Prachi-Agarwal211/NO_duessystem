require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAuthProfileMatch() {
    console.log('\n🔍 VERIFYING AUTH ↔ PROFILE ID MATCHING\n');
    console.log('='.repeat(70));

    // Get all auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error('Error getting auth users:', authError);
        return;
    }

    const testUsers = authData.users.filter(u =>
        u.email?.includes('test_') || u.email === 'admin@jecrcu.edu.in'
    );

    console.log(`\nFound ${testUsers.length} test users in auth:\n`);

    for (const authUser of testUsers) {
        // Get profile with same ID
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, role, department_name, is_active')
            .eq('id', authUser.id)
            .single();

        const match = profile && profile.id === authUser.id;

        console.log(`${match ? '✅' : '❌'} ${authUser.email}`);
        console.log(`   Auth ID: ${authUser.id}`);

        if (profile) {
            console.log(`   Profile ID: ${profile.id}`);
            console.log(`   Role: ${profile.role}`);
            console.log(`   Department: ${profile.department_name || 'N/A'}`);
            console.log(`   Active: ${profile.is_active}`);
            console.log(`   ID Match: ${match ? 'YES ✅' : 'NO ❌'}`);
        } else {
            console.log(`   ❌ NO PROFILE FOUND - Error: ${profileError?.message || 'Not found'}`);
        }
        console.log('');
    }

    console.log('='.repeat(70));
    console.log('\n💡 DIAGNOSIS:\n');

    const missingProfiles = testUsers.filter(async u => {
        const { data } = await supabase.from('profiles').select('id').eq('id', u.id).single();
        return !data;
    });

    if (missingProfiles.length > 0) {
        console.log('   Some users are missing profiles or IDs don\'t match.');
        console.log('   This causes RLS to block the profile query.');
    } else {
        console.log('   All auth users have matching profiles.');
        console.log('   Issue may be elsewhere (RLS policy issue or auth timing).');
    }

    console.log('\n');
}

verifyAuthProfileMatch()
    .then(() => process.exit(0))
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    });
