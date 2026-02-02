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

const DEFAULT_PASSWORD = 'JECRC@2024';

async function fixAdminAccount() {
    console.log('🚀 Fixing Admin Account...');

    try {
        // Create admin user without department constraint
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: 'admin@jecrcu.edu.in',
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: {
                full_name: 'System Administrator',
                role: 'admin',
                email_verified: true
            }
        });

        if (authError) {
            console.error('❌ Error creating admin auth user:', authError.message);
            return;
        }

        console.log('✅ Created admin auth user');

        // Create profile record without department_name for admin
        const profileData = {
            id: '2eb73739-ce6b-45a2-afac-81633a449c75', // Original ID from CSV
            email: 'admin@jecrcu.edu.in',
            full_name: 'System Administrator',
            role: 'admin',
            department_name: null, // Admin doesn't need department
            school_id: null,
            school_ids: [],
            course_ids: [],
            branch_ids: [],
            is_active: true,
            created_at: '2025-12-16 17:28:45.285676+00',
            updated_at: '2025-12-17 19:04:34.608985+00',
            assigned_department_ids: []
        };

        const { data: profileResult, error: profileError } = await supabase
            .from('profiles')
            .insert([profileData]);

        if (profileError) {
            console.error('❌ Error creating admin profile:', profileError.message);
            // Try to delete the auth user if profile creation fails
            await supabase.auth.admin.deleteUser(authData.user.id);
            return;
        }

        console.log('✅ Created admin profile');
        console.log('🎉 Admin account created successfully!');
        console.log(`📧 Email: admin@jecrcu.edu.in`);
        console.log(`🔑 Password: ${DEFAULT_PASSWORD}`);

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

fixAdminAccount().then(() => {
    console.log('\n✅ Admin account fix completed!');
}).catch(error => {
    console.error('💥 Process failed:', error);
    process.exit(1);
});
