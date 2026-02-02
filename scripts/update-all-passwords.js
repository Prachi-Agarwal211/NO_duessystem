import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_PASSWORD = 'Admin@2026';
const USER_PASSWORD = 'JECRC@2026';

async function updateAllPasswords() {
    console.log('🚀 Starting Password Updates...');

    try {
        // 1. Get all users
        console.log('\n--- Getting All Users ---');
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (usersError) {
            console.error('❌ Error fetching users:', usersError);
            return;
        }

        console.log(`✅ Found ${users.length} users`);

        // 2. Update passwords
        console.log('\n--- Updating Passwords ---');
        let successCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                const newPassword = user.email === 'admin@jecrcu.edu.in' ? ADMIN_PASSWORD : USER_PASSWORD;
                
                const { error: updateError } = await supabase.auth.admin.updateUserById(
                    user.id,
                    { password: newPassword }
                );

                if (updateError) {
                    console.error(`❌ Error updating password for ${user.email}:`, updateError.message);
                    errorCount++;
                } else {
                    console.log(`✅ Updated password for ${user.email}`);
                    successCount++;
                }
            } catch (error) {
                console.error(`❌ Unexpected error for ${user.email}:`, error.message);
                errorCount++;
            }
        }

        // 3. Summary
        console.log('\n--- Password Update Summary ---');
        console.log(`Total users processed: ${users.length}`);
        console.log(`✅ Successfully updated: ${successCount}`);
        console.log(`❌ Failed to update: ${errorCount}`);

        // 4. Test the updates by showing password info
        console.log('\n--- Password Information ---');
        console.log(`🔑 Admin password: ${ADMIN_PASSWORD}`);
        console.log(`🔑 All other users password: ${USER_PASSWORD}`);
        console.log('\n--- Admin Account ---');
        console.log(`📧 Email: admin@jecrcu.edu.in`);
        console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
        console.log('\n--- Example Department Account ---');
        const deptUser = users.find(u => u.email !== 'admin@jecrcu.edu.in');
        if (deptUser) {
            console.log(`📧 Email: ${deptUser.email}`);
            console.log(`🔑 Password: ${USER_PASSWORD}`);
        }

        return {
            totalUsers: users.length,
            successCount,
            errorCount,
            adminPassword: ADMIN_PASSWORD,
            userPassword: USER_PASSWORD
        };

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the function
updateAllPasswords().then(result => {
    console.log('\n🎉 Password update process completed!');
    console.log('✅ All passwords have been updated successfully!');
}).catch(error => {
    console.error('💥 Process failed:', error);
    process.exit(1);
});
