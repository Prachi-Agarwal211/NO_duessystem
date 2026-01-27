/**
 * Fix Reapplication API Issues
 * Run this script to diagnose and fix reapplication-related issues
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables. Please check your .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixReapplicationIssues() {
    console.log('🔧 FIXING REAPPLICATION SYSTEM ISSUES\n');

    // 1. Check no_dues_status table for rejection_count column
    console.log('1️⃣ Checking no_dues_status table structure...');
    const { data: statusColumns, error: statusError } = await supabase
        .rpc('get_table_columns', { table_name: 'no_dues_status' });

    if (statusError) {
        console.log('⚠️ Could not fetch columns via RPC, trying alternative...');
        // Try to select rejection_count to see if it exists
        const { error: colError } = await supabase
            .from('no_dues_status')
            .select('rejection_count')
            .limit(1);

        if (colError && colError.message.includes('rejection_count')) {
            console.error('❌ rejection_count column is missing!');
            console.log('   💡 Run the SQL fix script: scripts/complete-database-fix.sql');
        } else {
            console.log('✅ rejection_count column exists');
        }
    } else {
        const hasRejectionCount = statusColumns?.some(col => col.column_name === 'rejection_count');
        const hasActionByUserId = statusColumns?.some(col => col.column_name === 'action_by_user_id');

        console.log(`   rejection_count column: ${hasRejectionCount ? '✅' : '❌'}`);
        console.log(`   action_by_user_id column: ${hasActionByUserId ? '✅' : '❌'}`);
    }

    // 2. Check no_dues_reapplication_history table
    console.log('\n2️⃣ Checking no_dues_reapplication_history table...');
    const { data: historyTable, error: historyError } = await supabase
        .from('no_dues_reapplication_history')
        .select('*', { count: 'exact', head: true });

    if (historyError) {
        console.error('❌ Error accessing no_dues_reapplication_history:', historyError.message);
        console.log('   💡 Ensure the table exists by running the schema.sql script');
    } else {
        console.log('✅ no_dues_reapplication_history table is accessible');
    }

    // 3. Find rejected forms for testing
    console.log('\n3️⃣ Finding rejected forms for testing...');
    const { data: rejectedForms, error: formError } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no, status, reapplication_count')
        .eq('status', 'rejected')
        .limit(3);

    if (formError) {
        console.error('❌ Error fetching rejected forms:', formError.message);
    } else if (!rejectedForms || rejectedForms.length === 0) {
        console.log('⚠️ No rejected forms found for testing');
    } else {
        console.log(`✅ Found ${rejectedForms.length} rejected forms`);

        for (const form of rejectedForms) {
            console.log(`\n   Form: ${form.registration_no}`);
            console.log(`   ID: ${form.id}`);
            console.log(`   Status: ${form.status}`);
            console.log(`   Reapplication Count: ${form.reapplication_count || 0}`);

            // Get department statuses
            const { data: statuses, error: statusErr } = await supabase
                .from('no_dues_status')
                .select('department_name, status, rejection_count, rejection_reason')
                .eq('form_id', form.id)
                .eq('status', 'rejected');

            if (statusErr) {
                console.error('   ❌ Error fetching statuses:', statusErr.message);
            } else {
                console.log(`   Rejected Departments: ${statuses?.length || 0}`);
                statuses?.forEach(s => {
                    console.log(`      - ${s.department_name}: count=${s.rejection_count || 0}`);
                });
            }
        }
    }

    // 4. Test reapplication history insertion
    console.log('\n4️⃣ Testing reapplication history insertion...');

    if (rejectedForms && rejectedForms.length > 0) {
        const testForm = rejectedForms[0];
        const testHistory = {
            form_id: testForm.id,
            reapplication_number: (testForm.reapplication_count || 0) + 1,
            department_name: null,
            student_reply_message: 'Test reapplication from fix script',
            edited_fields: {},
            previous_status: []
        };

        const { data: inserted, error: insertError } = await supabase
            .from('no_dues_reapplication_history')
            .insert(testHistory)
            .select()
            .single();

        if (insertError) {
            console.error('❌ Failed to insert test history:', insertError.message);
            console.log('   Error details:', JSON.stringify(insertError, null, 2));
        } else {
            console.log('✅ Test history inserted successfully');
            console.log('   History ID:', inserted.id);

            // Clean up
            await supabase
                .from('no_dues_reapplication_history')
                .delete()
                .eq('id', inserted.id);
            console.log('   Test history cleaned up');
        }
    }

    // 5. Check API endpoint configuration
    console.log('\n5️⃣ Checking API endpoint configuration...');
    console.log('   ℹ️  Ensure these API routes exist:');
    console.log('   - /api/student/reapply (POST for reapplication)');
    console.log('   - /api/student/reapply/department (POST for per-department reapplication)');
    console.log('   - /api/student/reapply (GET for history)');
    console.log('\n   ℹ️  Session cookie configuration:');
    console.log('   - Cookie name: student_session');
    console.log('   - Must be httpOnly, secure in production');
    console.log('   - SameSite: lax');

    console.log('\n✅ Reapplication system diagnostic complete!');
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Run the SQL fix script in Supabase SQL Editor');
    console.log('   2. Ensure student_session cookie is being set correctly');
    console.log('   3. Test reapplication flow from the UI');
    console.log('   4. Check browser Network tab for API errors');
}

// Helper function to test actual reapplication
async function testFullReapplication(registrationNo) {
    console.log(`\n🧪 Testing full reapplication for ${registrationNo}...`);

    // This would require the JWT secret and actual session
    console.log('   ℹ️  To test the full flow:');
    console.log('   1. Login as a student via OTP');
    console.log('   2. Navigate to check-status page');
    console.log('   3. Click Reapply on a rejected department');
    console.log('   4. Submit the reapplication form');
    console.log('   5. Check browser console and network tab for errors');
}

fixReapplicationIssues().catch(console.error);