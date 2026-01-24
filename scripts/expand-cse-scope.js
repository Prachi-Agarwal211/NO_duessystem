/**
 * Expand CSE HoD Scope to all CS-related branches
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function expandCseScope() {
    console.log('🔍 Finding all Computer Science related branches...\n');

    // 1. Find all branches with "Computer" or "CS" in name
    const { data: branches, error: branchError } = await supabase
        .from('config_branches')
        .select('id, name');

    if (branchError) {
        console.error('❌ Error fetching branches:', branchError.message);
        return;
    }

    const cseBranchIds = branches
        .filter(b =>
            b.name.toLowerCase().includes('computer science') ||
            b.name.toLowerCase().includes('cse') ||
            b.name.toLowerCase().includes('information technology') ||
            b.name.toLowerCase().includes('data science') ||
            b.name.toLowerCase().includes('artificial intelligence') ||
            b.name.toLowerCase().includes('cyber security')
        )
        .map(b => b.id);

    console.log(`   Found ${cseBranchIds.length} matching branches.`);
    // console.log('   Branches:', branches.filter(b => cseBranchIds.includes(b.id)).map(b => b.name).join(', '));

    if (cseBranchIds.length === 0) {
        console.warn('⚠️ No Computer Science related branches found');
        return;
    }

    // 2. Update HoD profiles
    const hodEmails = ['hod.cse@jecrc.edu.in', '15anuragsingh2003@gmail.com'];

    for (const email of hodEmails) {
        console.log(`\n👤 Updating scope for ${email}...`);

        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                branch_ids: cseBranchIds, // Set to ALL CS-related branch IDs
                updated_at: new Date()
            })
            .eq('email', email);

        if (profileError) {
            console.error(`   ❌ Update failed: ${profileError.message}`);
        } else {
            console.log(`   ✅ Scope expanded to ${cseBranchIds.length} branches.`);
        }
    }

    console.log('\n✅ Task Complete.');
}

expandCseScope().catch(console.error);
