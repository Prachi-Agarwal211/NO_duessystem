import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Default password for all created accounts
const DEFAULT_PASSWORD = 'JECRC@2024';

async function recreateAccountsFromCSV() {
    console.log('🚀 Starting Account Recreation from CSV...');

    try {
        // 1. Read and parse CSV file
        console.log('\n--- Reading CSV File ---');
        const csvContent = fs.readFileSync('D:/nextjs/new_nodues/backups/profiles_rows.csv', 'utf8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true
        });

        console.log(`✅ Found ${records.length} accounts in CSV`);

        // 2. Create accounts one by one
        console.log('\n--- Creating Accounts ---');
        let successCount = 0;
        let errorCount = 0;
        const results = [];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            console.log(`\nProcessing ${i + 1}/${records.length}: ${record.email}`);

            try {
                // 2.1 Create auth user
                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email: record.email,
                    password: DEFAULT_PASSWORD,
                    email_confirm: true,
                    user_metadata: {
                        full_name: record.full_name,
                        role: record.role,
                        department_name: record.department_name,
                        email_verified: true
                    }
                });

                if (authError) {
                    console.error(`❌ Error creating auth user ${record.email}:`, authError.message);
                    errorCount++;
                    results.push({
                        email: record.email,
                        status: 'error',
                        error: authError.message,
                        step: 'auth_creation'
                    });
                    continue;
                }

                console.log(`✅ Created auth user: ${record.email}`);

                // 2.2 Create profile record
                const profileData = {
                    id: record.id,
                    email: record.email,
                    full_name: record.full_name,
                    role: record.role,
                    department_name: record.department_name,
                    school_id: record.school_id || null,
                    school_ids: record.school_ids ? JSON.parse(record.school_ids) : [],
                    course_ids: record.course_ids ? JSON.parse(record.course_ids) : [],
                    branch_ids: record.branch_ids ? JSON.parse(record.branch_ids) : [],
                    is_active: record.is_active === 'true',
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                    assigned_department_ids: record.assigned_department_ids ? JSON.parse(record.assigned_department_ids) : []
                };

                const { data: profileResult, error: profileError } = await supabase
                    .from('profiles')
                    .insert([profileData]);

                if (profileError) {
                    console.error(`❌ Error creating profile for ${record.email}:`, profileError.message);
                    // Try to delete the auth user if profile creation fails
                    await supabase.auth.admin.deleteUser(authData.user.id);
                    errorCount++;
                    results.push({
                        email: record.email,
                        status: 'error',
                        error: profileError.message,
                        step: 'profile_creation'
                    });
                    continue;
                }

                console.log(`✅ Created profile: ${record.email}`);
                successCount++;
                results.push({
                    email: record.email,
                    status: 'success',
                    userId: authData.user.id,
                    profileId: record.id,
                    role: record.role,
                    department: record.department_name
                });

            } catch (error) {
                console.error(`❌ Unexpected error for ${record.email}:`, error.message);
                errorCount++;
                results.push({
                    email: record.email,
                    status: 'error',
                    error: error.message,
                    step: 'unexpected'
                });
            }
        }

        // 3. Summary
        console.log('\n--- Account Creation Summary ---');
        console.log(`Total accounts processed: ${records.length}`);
        console.log(`✅ Successfully created: ${successCount}`);
        console.log(`❌ Failed to create: ${errorCount}`);

        if (errorCount > 0) {
            console.log('\n--- Failed Accounts ---');
            results.filter(r => r.status === 'error').forEach(result => {
                console.log(`  ❌ ${result.email}: ${result.error} (${result.step})`);
            });
        }

        // 4. Verification
        console.log('\n--- Final Verification ---');
        const { data: { users }, error: verifyError } = await supabase.auth.admin.listUsers();
        
        if (verifyError) {
            console.error('❌ Error verifying creation:', verifyError);
        } else {
            console.log(`🎉 Total users in system: ${users.length}`);
            
            // Count by role
            const adminUsers = users.filter(u => u.user_metadata?.role === 'admin');
            const deptUsers = users.filter(u => u.user_metadata?.role === 'department');
            
            console.log(`  - Admin users: ${adminUsers.length}`);
            console.log(`  - Department users: ${deptUsers.length}`);
        }

        // 5. Save results
        const finalResults = {
            totalProcessed: records.length,
            successCount,
            errorCount,
            results,
            defaultPassword: DEFAULT_PASSWORD
        };

        fs.writeFileSync('account-recreation-results.json', JSON.stringify(finalResults, null, 2));
        console.log('\n📋 Results saved to account-recreation-results.json');
        console.log(`🔑 Default password for all accounts: ${DEFAULT_PASSWORD}`);

        return finalResults;

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the function
recreateAccountsFromCSV().then(result => {
    console.log('\n🎉 Account recreation process completed!');
}).catch(error => {
    console.error('💥 Process failed:', error);
    process.exit(1);
});
