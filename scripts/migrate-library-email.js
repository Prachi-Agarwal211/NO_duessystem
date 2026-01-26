const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateLibraryEmail() {
    try {
        const oldEmail = 'library@jecrc.edu.in';
        const oldDeptEmail = 'library@jecrcu.edu.in';
        const newEmail = 'razorrag.official@gmail.com';

        console.log(`🚀 Starting update: ${oldEmail} -> ${newEmail}`);

        // 1. Find the user ID from the profile
        const { data: profile, error: profileFetchError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', oldEmail)
            .single();

        if (profileFetchError) {
            console.error('❌ Could not find profile with old email:', profileFetchError.message);
        } else {
            const userId = profile.id;
            console.log(`✅ Found Profile ID: ${userId}`);

            // 2. Update Auth User
            const { data: authUser, error: authUpdateError } = await supabase.auth.admin.updateUserById(
                userId,
                { email: newEmail, password: 'Test@1234', email_confirm: true }
            );

            if (authUpdateError) {
                console.error('❌ Auth update failed:', authUpdateError.message);
            } else {
                console.log('✅ Auth user email updated');
            }

            // 3. Update Profile Email
            const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({ email: newEmail })
                .eq('id', userId);

            if (profileUpdateError) {
                console.error('❌ Profile email update failed:', profileUpdateError.message);
            } else {
                console.log('✅ Profile table updated');
            }
        }

        // 4. Update Departments table
        const { error: deptError } = await supabase
            .from('departments')
            .update({ email: newEmail })
            .eq('name', 'library');

        if (deptError) {
            console.error('❌ Department table update failed:', deptError.message);
        } else {
            console.log('✅ Department configuration updated');
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

updateLibraryEmail();
