const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testAdminDetailFix() {
    console.log('🔍 Testing Fixed Admin Request Detail lookup...');

    // 1. Get a test ID
    const { data: form } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no, student_name')
        .limit(1)
        .single();

    if (!form) {
        console.log('No forms found to test.');
        return;
    }

    console.log(`Testing with ID: ${form.id} (${form.student_name})`);

    // 2. Test the query without the broken join
    console.log('\n🔍 Step 1: Fetching form data (without broken join)...');
    const { data: formData, error: formError } = await supabase
        .from('no_dues_forms')
        .select(`
          *,
          no_dues_status (
            id,
            department_name,
            status,
            action_at,
            action_by_user_id,
            rejection_reason,
            profiles (
              full_name
            )
          )
        `)
        .eq('id', form.id)
        .single();

    if (formError) {
        console.error('❌ Step 1 Failed:', formError.message);
        return;
    }
    console.log('✅ Step 1 Successful!');

    // 3. Test the separate profile lookup
    console.log('\n🔍 Step 2: Fetching profile data separately...');
    if (formData.registration_no) {
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('registration_no', formData.registration_no)
            .maybeSingle();

        if (profileError) {
            console.error('❌ Step 2 Failed:', profileError.message);
        } else {
            console.log('✅ Step 2 Successful!');
            console.log('Profile Data Found:', profileData ? 'Yes' : 'No');
            if (profileData) {
                console.log('Email:', profileData.email);
            }
        }
    } else {
        console.log('⚠️ No registration number in form, skipping profile fetch test.');
    }

    console.log('\n🎉 Verification Complete!');
}

testAdminDetailFix();
