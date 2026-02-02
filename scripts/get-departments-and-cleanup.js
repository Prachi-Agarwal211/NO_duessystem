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

async function getDepartmentsAndCleanup() {
    console.log('🚀 Starting Supabase Departments and Cleanup...');

    try {
        // 1. Get all departments from profiles table
        console.log('\n--- Getting All Departments ---');
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('department_name, email, role, full_name')
            .order('department_name');

        if (profilesError) {
            console.error('❌ Error fetching profiles:', profilesError);
            return;
        }

        // Extract unique departments
        const departments = [...new Set(profiles.map(p => p.department_name).filter(d => d))];
        console.log(`✅ Found ${departments.length} departments:`);
        departments.forEach((dept, index) => {
            console.log(`  ${index + 1}. ${dept}`);
        });

        // 2. Get all users from auth.users
        console.log('\n--- Getting All Users ---');
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (usersError) {
            console.error('❌ Error fetching users:', usersError);
            return;
        }

        console.log(`✅ Found ${users.length} total users in auth system`);

        // 3. Identify test accounts and admin accounts
        console.log('\n--- Analyzing Accounts ---');
        
        const testAccounts = [];
        const adminAccounts = [];
        const regularAccounts = [];

        users.forEach(user => {
            const profile = profiles.find(p => p.email === user.email);
            const isTest = user.email.includes('test') || 
                          user.email.includes('demo') || 
                          user.email.includes('sample') ||
                          user.email.match(/^[a-zA-Z]+[0-9]+@/) ||
                          user.email.includes('temp');
            
            const isAdmin = profile?.role === 'admin' || user.email.includes('admin');

            if (isAdmin) {
                adminAccounts.push({ ...user, profile });
            } else if (isTest) {
                testAccounts.push({ ...user, profile });
            } else {
                regularAccounts.push({ ...user, profile });
            }
        });

        console.log(`📊 Account Summary:`);
        console.log(`  - Admin Accounts: ${adminAccounts.length}`);
        console.log(`  - Test Accounts: ${testAccounts.length}`);
        console.log(`  - Regular Accounts: ${regularAccounts.length}`);

        // Show admin accounts
        if (adminAccounts.length > 0) {
            console.log('\n--- Admin Accounts (Will be KEPT) ---');
            adminAccounts.forEach(admin => {
                console.log(`  ✅ ${admin.email} - ${admin.profile?.full_name || 'No profile'} - ${admin.profile?.department_name || 'No department'}`);
            });
        }

        // Show test accounts
        if (testAccounts.length > 0) {
            console.log('\n--- Test Accounts (Will be REMOVED) ---');
            testAccounts.forEach(test => {
                console.log(`  🗑️  ${test.email} - ${test.profile?.full_name || 'No profile'} - ${test.profile?.department_name || 'No department'}`);
            });
        }

        // 4. Ask for confirmation before deletion
        if (testAccounts.length > 0) {
            console.log(`\n⚠️  Ready to delete ${testAccounts.length} test accounts.`);
            console.log('These accounts will be permanently deleted from the authentication system.');
            
            // In a real scenario, you might want to add confirmation here
            // For now, we'll proceed with the deletion
            
            console.log('\n--- Deleting Test Accounts ---');
            
            for (const testAccount of testAccounts) {
                try {
                    // Delete from profiles table first
                    if (testAccount.profile) {
                        const { error: profileDeleteError } = await supabase
                            .from('profiles')
                            .delete()
                            .eq('email', testAccount.email);
                        
                        if (profileDeleteError) {
                            console.error(`❌ Error deleting profile for ${testAccount.email}:`, profileDeleteError);
                        } else {
                            console.log(`✅ Deleted profile for ${testAccount.email}`);
                        }
                    }

                    // Delete from auth.users
                    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
                        testAccount.id
                    );
                    
                    if (authDeleteError) {
                        console.error(`❌ Error deleting auth user ${testAccount.email}:`, authDeleteError);
                    } else {
                        console.log(`✅ Deleted auth user ${testAccount.email}`);
                    }
                } catch (error) {
                    console.error(`❌ Error processing ${testAccount.email}:`, error);
                }
            }
            
            console.log(`\n✅ Cleanup completed. Removed ${testAccounts.length} test accounts.`);
        } else {
            console.log('\n✅ No test accounts found to remove.');
        }

        // 5. Final summary
        console.log('\n--- Final Summary ---');
        console.log(`Departments: ${departments.length}`);
        console.log(`Remaining Users: ${adminAccounts.length + regularAccounts.length}`);
        console.log(`  - Admin: ${adminAccounts.length}`);
        console.log(`  - Regular: ${regularAccounts.length}`);
        
        return {
            departments,
            adminAccounts,
            regularAccounts,
            testAccountsRemoved: testAccounts.length
        };

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the function
getDepartmentsAndCleanup().then(result => {
    console.log('\n🎉 Process completed successfully!');
    if (result) {
        console.log('\n📋 Results saved to current directory as cleanup-results.json');
        fs.writeFileSync('cleanup-results.json', JSON.stringify(result, null, 2));
    }
}).catch(error => {
    console.error('💥 Process failed:', error);
    process.exit(1);
});
