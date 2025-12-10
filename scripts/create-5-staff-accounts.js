/**
 * CREATE 5 STAFF ACCOUNTS WITH PROPER DEPARTMENT SCOPING
 * 
 * This script creates 5 staff accounts in Supabase:
 * 1. admin@jecrcu.edu.in - System Administrator (full access)
 * 2. razorrag.official@gmail.com - TPO Department (sees all students)
 * 3. prachiagarwal211@gmail.com - BCA/MCA HOD (School of Computer Applications only)
 * 4. 15anuragsingh2003@gmail.com - B.Tech/M.Tech CSE HOD (16 CSE branches only)
 * 5. anurag.22bcom1367@jecrcu.edu.in - Accounts Department (sees all students)
 * 
 * IMPORTANT: Run this BEFORE running FINAL_COMPLETE_DATABASE_SETUP.sql
 * The SQL script will then automatically create profiles with proper scoping
 * 
 * Usage: node scripts/create-5-staff-accounts.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ ERROR: Missing required environment variables!');
    console.error('   Please ensure .env.local contains:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

// Create Supabase admin client (can manage auth users)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Staff accounts to create
const staffAccounts = [
    {
        email: 'admin@jecrcu.edu.in',
        password: 'Admin@2025',
        fullName: 'System Administrator',
        role: 'admin',
        department: null,
        description: 'Full system access - can manage everything'
    },
    {
        email: 'razorrag.official@gmail.com',
        password: 'Razorrag@2025',
        fullName: 'Razorrag (TPO Staff)',
        role: 'department',
        department: 'tpo',
        description: 'TPO Department - sees all students'
    },
    {
        email: 'prachiagarwal211@gmail.com',
        password: 'Prachi@2025',
        fullName: 'Prachi Agarwal (HOD - BCA/MCA)',
        role: 'department',
        department: 'school_hod',
        description: 'HOD of School of Computer Applications - sees only BCA/MCA students (22 branches)'
    },
    {
        email: '15anuragsingh2003@gmail.com',
        password: 'Anurag@2025',
        fullName: 'Anurag Singh (HOD - B.Tech/M.Tech CSE)',
        role: 'department',
        department: 'school_hod',
        description: 'HOD of CSE - sees only CSE students (16 branches in B.Tech + M.Tech)'
    },
    {
        email: 'anurag.22bcom1367@jecrcu.edu.in',
        password: 'AnuragK@2025',
        fullName: 'Anurag Kumar (Accounts Staff)',
        role: 'department',
        department: 'accounts_department',
        description: 'Accounts Department - sees all students'
    }
];

/**
 * Create a single staff account
 */
async function createStaffAccount(account) {
    try {
        // Check if user already exists
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
            throw new Error(`Failed to check existing users: ${listError.message}`);
        }

        const userExists = existingUsers.users.some(u => u.email === account.email);

        if (userExists) {
            console.log(`   ⚠️  User already exists: ${account.email}`);
            return { success: true, existed: true };
        }

        // Create new user
        const { data, error } = await supabase.auth.admin.createUser({
            email: account.email,
            password: account.password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                full_name: account.fullName,
                role: account.role,
                department_name: account.department
            }
        });

        if (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }

        console.log(`   ✅ Created: ${account.email}`);
        console.log(`      Password: ${account.password}`);
        console.log(`      Role: ${account.role}`);
        console.log(`      Department: ${account.department || 'N/A (Admin)'}`);
        console.log(`      Description: ${account.description}`);
        
        return { success: true, existed: false, data };

    } catch (error) {
        console.error(`   ❌ Failed to create ${account.email}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Main function
 */
async function createAllStaffAccounts() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  CREATING 5 STAFF ACCOUNTS IN SUPABASE                ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📋 This will create the following accounts:');
    console.log('');

    staffAccounts.forEach((account, index) => {
        console.log(`${index + 1}. ${account.email}`);
        console.log(`   → ${account.description}`);
        console.log('');
    });

    console.log('🔄 Creating accounts...');
    console.log('');

    let successCount = 0;
    let existedCount = 0;
    let failCount = 0;

    for (const account of staffAccounts) {
        const result = await createStaffAccount(account);
        
        if (result.success) {
            if (result.existed) {
                existedCount++;
            } else {
                successCount++;
            }
        } else {
            failCount++;
        }
        
        // Small delay between creations
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  STAFF ACCOUNT CREATION COMPLETE                       ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Successfully created: ${successCount} account(s)`);
    console.log(`⚠️  Already existed: ${existedCount} account(s)`);
    console.log(`❌ Failed to create: ${failCount} account(s)`);
    console.log('');
    
    if (successCount > 0 || existedCount > 0) {
        console.log('📋 NEXT STEPS:');
        console.log('');
        console.log('1. Run the database setup SQL:');
        console.log('   → Open Supabase Dashboard → SQL Editor');
        console.log('   → Run: FINAL_COMPLETE_DATABASE_SETUP.sql');
        console.log('   → This will create profiles with proper scoping for these accounts');
        console.log('');
        console.log('2. Test staff logins:');
        console.log('   → Go to your app → Staff Login');
        console.log('   → Login with any of the emails above');
        console.log('   → Verify each staff member sees only their scoped forms');
        console.log('');
        console.log('3. Staff Login Credentials:');
        console.log('');
        staffAccounts.forEach((account, index) => {
            console.log(`   ${index + 1}. ${account.email}`);
            console.log(`      Password: ${account.password}`);
            console.log(`      Access: ${account.description}`);
            console.log('');
        });
    }

    if (failCount > 0) {
        console.log('⚠️  WARNING: Some accounts failed to create.');
        console.log('   Check the error messages above and try again.');
        console.log('');
    }
}

// Run the script
createAllStaffAccounts()
    .then(() => {
        console.log('✅ Script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('');
        console.error('❌ FATAL ERROR:', error.message);
        console.error('');
        process.exit(1);
    });