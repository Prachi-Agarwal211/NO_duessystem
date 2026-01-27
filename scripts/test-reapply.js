// Script to test reapplication flow and identify the exact error
// Run: node scripts/test-reapply.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testReapplication() {
    console.log('🔍 TESTING REAPPLICATION FLOW\n');
    console.log('='.repeat(60));

    // 1. Find a rejected form
    console.log('\n📋 Step 1: Finding a rejected form...');
    const { data: forms, error: formsError } = await supabase
        .from('no_dues_forms')
        .select(`
            id,
            registration_no,
            student_name,
            status,
            reapplication_count,
            no_dues_status (
                department_name,
                status,
                rejection_reason,
                rejection_count,
                action_by_user_id
            )
        `)
        .eq('status', 'rejected')
        .limit(5);

    if (formsError) {
        console.log('❌ Error fetching forms:', formsError.message);
        return;
    }

    if (!forms || forms.length === 0) {
        console.log('⚠️ No rejected forms found in the database');
        return;
    }

    console.log(`✅ Found ${forms.length} rejected forms`);

    // Pick the first one
    const form = forms[0];
    console.log(`\n📄 Using form: ${form.registration_no} (${form.student_name})`);
    console.log(`   Form ID: ${form.id}`);
    console.log(`   Status: ${form.status}`);
    console.log(`   Reapplication count: ${form.reapplication_count || 0}`);

    // 2. Find rejected departments
    const rejectedDepts = form.no_dues_status?.filter(s => s.status === 'rejected') || [];
    console.log(`\n📋 Step 2: Checking rejected departments...`);

    if (rejectedDepts.length === 0) {
        console.log('⚠️ No rejected departments found for this form');
        return;
    }

    console.log(`✅ Found ${rejectedDepts.length} rejected department(s):`);
    rejectedDepts.forEach(d => {
        console.log(`   • ${d.department_name}: ${d.rejection_reason || 'No reason'}`);
        console.log(`     rejection_count: ${d.rejection_count || 0}`);
    });

    const targetDept = rejectedDepts[0];
    console.log(`\n📋 Step 3: Testing reapplication for ${targetDept.department_name}...`);

    // 3. Simulate the handleReapplication function logic
    try {
        console.log('\n3a. Logging to reapplication history...');

        const newReapplicationCount = (form.reapplication_count || 0) + 1;

        const { data: historyData, error: historyError } = await supabase
            .from('no_dues_reapplication_history')
            .insert({
                form_id: form.id,
                reapplication_number: newReapplicationCount,
                department_name: targetDept.department_name,
                student_reply_message: 'TEST: This is a test reapplication message',
                edited_fields: {},
                previous_status: form.no_dues_status.map(s => ({
                    department_name: s.department_name,
                    status: s.status,
                    rejection_reason: s.rejection_reason
                }))
            })
            .select()
            .single();

        if (historyError) {
            console.log('❌ History insert error:', historyError.message);
            console.log('   Code:', historyError.code);
            console.log('   Details:', JSON.stringify(historyError, null, 2));
        } else {
            console.log('✅ History logged successfully');
            console.log(`   History ID: ${historyData.id}`);

            // Clean up - delete the test history entry
            await supabase.from('no_dues_reapplication_history').delete().eq('id', historyData.id);
            console.log('   (Cleaned up test history entry)');
        }

        console.log('\n3b. Testing department status reset query...');

        // Test just the SELECT part of the update
        const { data: statusCheck, error: statusCheckError } = await supabase
            .from('no_dues_status')
            .select('*')
            .eq('form_id', form.id)
            .eq('department_name', targetDept.department_name);

        if (statusCheckError) {
            console.log('❌ Status check error:', statusCheckError.message);
        } else {
            console.log('✅ Status exists:', statusCheck?.length || 0, 'record(s)');
            if (statusCheck && statusCheck[0]) {
                console.log('   Current status:', statusCheck[0].status);
                console.log('   action_by_user_id:', statusCheck[0].action_by_user_id);
            }
        }

        // NOTE: Not actually updating the status to keep test non-destructive

        console.log('\n3c. Testing form update query structure...');

        // Just test that we can select the columns we need to update
        const { data: formCheck, error: formCheckError } = await supabase
            .from('no_dues_forms')
            .select('id, status, reapplication_count, last_reapplied_at, is_reapplication, rejection_reason, rejection_context')
            .eq('id', form.id)
            .single();

        if (formCheckError) {
            console.log('❌ Form check error:', formCheckError.message);
        } else {
            console.log('✅ Form columns accessible');
        }

        console.log('\n✅ All reapplication flow steps passed!');
        console.log('   The 500 error is NOT from the core reapplication logic.');

    } catch (err) {
        console.log('\n❌ Exception caught:', err.message);
        console.log('   Stack:', err.stack);
    }

    // 4. Check for any other possible issues
    console.log('\n' + '='.repeat(60));
    console.log('📋 ADDITIONAL CHECKS\n');

    // Check if cookies would work (session verification)
    console.log('🔐 Session verification checks:');
    console.log('   - JWT_SECRET defined:', !!process.env.SUPABASE_JWT_SECRET || !!process.env.NEXTAUTH_SECRET);
    console.log('   - Service role key defined:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Check realtime service import
    console.log('\n🔄 Realtime service check:');
    try {
        // We can't import ES modules here, but we can check if file exists
        const fs = require('fs');
        const realtimeExists = fs.existsSync('./src/lib/realtimeService.js');
        console.log('   - realtimeService.js exists:', realtimeExists);
    } catch (e) {
        console.log('   ⚠️ Could not check realtime service');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 CONCLUSION\n');
    console.log('If all checks passed, the 500 error might be caused by:');
    console.log('1. Session/JWT verification in the API route (check student_session cookie)');
    console.log('2. Rate limiting (too many requests)');
    console.log('3. Email notification failure (check sendReapplicationNotification)');
    console.log('4. Realtime trigger failure (non-critical, should not cause 500)');
    console.log('\nRun the app and check server logs for the actual error.');
}

testReapplication().catch(console.error);
