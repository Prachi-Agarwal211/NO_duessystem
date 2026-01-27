const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAPIEndpoints() {
    console.log('🔍 VERIFYING API ENDPOINTS COMPATIBILITY\n');
    console.log('========================================\n');

    // 1. Test staff dashboard query (from /api/staff/dashboard)
    console.log('📋 1. TESTING Staff Dashboard Query...');
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, assigned_department_ids, school_ids, course_ids, branch_ids, department_name')
            .limit(1)
            .single();

        if (profileError) {
            console.error('   ❌ Profile query failed:', profileError.message);
        } else {
            console.log('   ✅ Profile query works');
            console.log('   📊 Profile has department_name:', profile.department_name);
            console.log('   📊 Profile has assigned_department_ids:', profile.assigned_department_ids);

            // Test department lookup
            if (profile.assigned_department_ids?.length > 0) {
                const { data: depts, error: deptError } = await supabase
                    .from('departments')
                    .select('name, display_name')
                    .in('id', profile.assigned_department_ids);

                if (deptError) {
                    console.error('   ❌ Department lookup failed:', deptError.message);
                } else {
                    console.log('   ✅ Department lookup works, found:', depts?.length || 0);
                }
            }

            // Test no_dues_status query with inner join
            const { data: statuses, error: statusError } = await supabase
                .from('no_dues_status')
                .select(`
                    id,
                    department_name,
                    status,
                    no_dues_forms!inner (
                        id, registration_no, student_name, school_id
                    )
                `)
                .eq('status', 'pending')
                .limit(1);

            if (statusError) {
                console.error('   ❌ Status query with join failed:', statusError.message);
            } else {
                console.log('   ✅ Status query with inner join works');
            }
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
    }

    // 2. Test staff action query (from /api/staff/action)
    console.log('\n📋 2. TESTING Staff Action Query...');
    try {
        // Test form lookup
        const { data: form, error: formError } = await supabase
            .from('no_dues_forms')
            .select('id, status, student_name, registration_no')
            .limit(1)
            .single();

        if (formError) {
            console.error('   ❌ Form lookup failed:', formError.message);
        } else {
            console.log('   ✅ Form lookup works');

            // Test status lookup for action
            const { data: status, error: statusError } = await supabase
                .from('no_dues_status')
                .select('id, status, department_name')
                .eq('form_id', form.id)
                .limit(1)
                .single();

            if (statusError && statusError.code !== 'PGRST116') {
                console.error('   ❌ Status lookup failed:', statusError.message);
            } else {
                console.log('   ✅ Status lookup works');
            }
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
    }

    // 3. Test student submission flow
    console.log('\n📋 3. TESTING Student Submission Flow...');
    try {
        // Check for duplicate
        const { data: existing, error: dupError } = await supabase
            .from('no_dues_forms')
            .select('id, status')
            .eq('registration_no', 'TEST123')
            .maybeSingle();

        if (dupError) {
            console.error('   ❌ Duplicate check failed:', dupError.message);
        } else {
            console.log('   ✅ Duplicate check works');
        }

        // Check student data lookup
        const { data: student, error: studentError } = await supabase
            .from('student_data')
            .select('*')
            .eq('registration_no', '21BCON532')
            .single();

        if (studentError) {
            console.error('   ❌ Student lookup failed:', studentError.message);
        } else {
            console.log('   ✅ Student data lookup works');
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
    }

    // 4. Test reapplication flow
    console.log('\n📋 4. TESTING Reapplication Flow...');
    try {
        const { data: form, error: formError } = await supabase
            .from('no_dues_forms')
            .select('id, status, reapplication_count')
            .limit(1)
            .single();

        if (formError) {
            console.error('   ❌ Form lookup failed:', formError.message);
        } else {
            console.log('   ✅ Form lookup works');

            // Test history insert capability (without actually inserting)
            const { data: history, error: historyError } = await supabase
                .from('no_dues_reapplication_history')
                .select('*')
                .eq('form_id', form.id)
                .limit(1);

            if (historyError) {
                console.error('   ❌ History query failed:', historyError.message);
            } else {
                console.log('   ✅ Reapplication history accessible');
            }
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
    }

    // 5. Test chat/message flow
    console.log('\n📋 5. TESTING Chat/Message Flow...');
    try {
        const { data: form, error: formError } = await supabase
            .from('no_dues_forms')
            .select('id')
            .limit(1)
            .single();

        if (formError) {
            console.error('   ❌ Form lookup failed:', formError.message);
        } else {
            // Test message query
            const { data: messages, error: msgError } = await supabase
                .from('no_dues_messages')
                .select('*, sender:sender_id(id, full_name, email, role)')
                .eq('form_id', form.id)
                .limit(1);

            if (msgError) {
                console.error('   ❌ Message query failed:', msgError.message);
            } else {
                console.log('   ✅ Message query works');
            }
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
    }

    // 6. Test certificate generation trigger
    console.log('\n📋 6. TESTING Certificate Generation...');
    try {
        const { data: form, error: formError } = await supabase
            .from('no_dues_forms')
            .select('id, final_certificate_generated, certificate_url')
            .eq('status', 'completed')
            .limit(1);

        if (formError) {
            console.error('   ❌ Certificate query failed:', formError.message);
        } else {
            console.log('   ✅ Certificate columns accessible');
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
    }

    console.log('\n========================================');
    console.log('✅ API Endpoint Verification Complete');
    console.log('========================================');
}

verifyAPIEndpoints();
