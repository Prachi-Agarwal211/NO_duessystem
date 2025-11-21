const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupUsers() {
    console.log('🚀 Setting up requested users...\n');

    const users = [
        {
            email: 'razorrag.official@gmail.com',
            password: 'password123',
            role: 'admin',
            name: 'Admin User',
            department: null
        },
        {
            email: '15anuragsingh2003@gmail.com',
            password: 'password123',
            role: 'department',
            name: 'Anurag Singh',
            department: 'library' // Assigning to Library as requested "add this in a department"
        }
    ];

    for (const u of users) {
        console.log(`👤 Processing ${u.email}...`);

        // 1. Create/Get Auth User
        let userId;
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(user => user.email === u.email);

        if (existingUser) {
            console.log(`   ℹ️  User already exists in Auth`);
            userId = existingUser.id;
        } else {
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: u.email,
                password: u.password,
                email_confirm: true
            });

            if (createError) {
                console.error(`   ❌ Failed to create auth user: ${createError.message}`);
                continue;
            }
            console.log(`   ✅ Created new auth user`);
            userId = newUser.user.id;
        }

        // 2. Update Profile
        if (userId) {
            const profileData = {
                id: userId,
                email: u.email,
                full_name: u.name,
                role: u.role,
                department_name: u.department
            };

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert(profileData);

            if (profileError) {
                console.error(`   ❌ Failed to update profile: ${profileError.message}`);
            } else {
                console.log(`   ✅ Updated profile (Role: ${u.role}, Dept: ${u.department || 'N/A'})`);
            }
        }
        console.log('');
    }

    console.log('✨ User setup complete!');
    console.log('   Default password for new users: password123');
}

setupUsers().catch(console.error);
