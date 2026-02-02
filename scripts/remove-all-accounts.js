import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function removeAllAccounts() {
    console.log('🚀 Starting Complete Account Removal...');

    try {
        // 1. Get all users from auth.users
        console.log('\n--- Getting All Users ---');
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (usersError) {
            console.error('❌ Error fetching users:', usersError);
            return;
        }

        console.log(`✅ Found ${users.length} total users in auth system`);

        // 2. Get all profiles
        console.log('\n--- Getting All Profiles ---');
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('email, full_name, department_name, role');

        if (profilesError) {
            console.error('❌ Error fetching profiles:', profilesError);
            return;
        }

        console.log(`✅ Found ${profiles.length} profiles`);

        // 3. Display all accounts before deletion
        console.log('\n--- All Accounts to be REMOVED ---');
        users.forEach(user => {
            const profile = profiles.find(p => p.email === user.email);
            const role = profile?.role || 'No profile';
            const dept = profile?.department_name || 'No department';
            const name = profile?.full_name || 'No profile';
            console.log(`  🗑️  ${user.email} - ${name} - ${role} - ${dept}`);
        });

        // 4. Confirm and delete all accounts
        console.log(`\n⚠️  Ready to delete ALL ${users.length} accounts.`);
        console.log('This will completely clear your authentication system!');
        
        // Delete all accounts
        console.log('\n--- Deleting All Accounts ---');
        let deletedCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                // Delete from profiles table first
                const { error: profileDeleteError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('email', user.email);
                
                if (profileDeleteError) {
                    console.error(`❌ Error deleting profile for ${user.email}:`, profileDeleteError.message);
                } else {
                    console.log(`✅ Deleted profile for ${user.email}`);
                }

                // Delete from auth.users
                const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
                    user.id
                );
                
                if (authDeleteError) {
                    console.error(`❌ Error deleting auth user ${user.email}:`, authDeleteError.message);
                    errorCount++;
                } else {
                    console.log(`✅ Deleted auth user ${user.email}`);
                    deletedCount++;
                }
            } catch (error) {
                console.error(`❌ Error processing ${user.email}:`, error.message);
                errorCount++;
            }
        }
        
        console.log(`\n✅ Cleanup completed.`);
        console.log(`  - Successfully deleted: ${deletedCount} accounts`);
        console.log(`  - Errors encountered: ${errorCount} accounts`);

        // 5. Final verification
        console.log('\n--- Final Verification ---');
        const { data: { users: remainingUsers }, error: verifyError } = await supabase.auth.admin.listUsers();
        
        if (verifyError) {
            console.error('❌ Error verifying cleanup:', verifyError);
        } else {
            console.log(`🎉 Remaining users in system: ${remainingUsers.length}`);
            if (remainingUsers.length === 0) {
                console.log('✅ All accounts successfully removed!');
            } else {
                console.log('⚠️  Some accounts still remain:');
                remainingUsers.forEach(user => console.log(`  - ${user.email}`));
            }
        }
        
        return {
            totalUsers: users.length,
            deletedCount,
            errorCount,
            remainingUsers: remainingUsers?.length || 0
        };

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the function
removeAllAccounts().then(result => {
    console.log('\n🎉 Process completed!');
    if (result) {
        console.log('\n📋 Results saved to current directory as complete-removal-results.json');
        fs.writeFileSync('complete-removal-results.json', JSON.stringify(result, null, 2));
    }
}).catch(error => {
    console.error('💥 Process failed:', error);
    process.exit(1);
});
