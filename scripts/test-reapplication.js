/**
 * Test reapplication functionality
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReapplication() {
    console.log('🔍 Testing reapplication...\n');

    // Get a rejected form
    const { data: rejectedForms, error: formError } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no, status, reapplication_count')
        .eq('status', 'rejected');

    if (formError) {
        console.error('❌ Error fetching forms:', formError);
        return;
    }

    console.log(`📋 Found ${rejectedForms?.length || 0} rejected forms`);

    if (rejectedForms && rejectedForms.length > 0) {
        const form = rejectedForms[0];
        console.log(`   Form ID: ${form.id}`);
        console.log(`   Registration No: ${form.registration_no}`);
        console.log(`   Current Status: ${form.status}`);
        console.log(`   Reapplication Count: ${form.reapplication_count}`);

        // Get department statuses
        const { data: statuses } = await supabase
            .from('no_dues_status')
            .select('*')
            .eq('form_id', form.id);

        console.log(`\n📋 Department Statuses (${statuses?.length || 0}):`);
        statuses?.forEach(s => {
            console.log(`   - ${s.department_name}: ${s.status}`);
        });

        // Try reapplication
        console.log('\n🚀 Attempting reapplication...');
        const newReapplicationCount = (form.reapplication_count || 0) + 1;

        // 1. Insert history
        const { error: historyError } = await supabase
            .from('no_dues_reapplication_history')
            .insert({
                form_id: form.id,
                reapplication_number: newReapplicationCount,
                department_name: null,
                student_reply_message: 'Test reapplication reason',
                edited_fields: {},
                previous_status: statuses?.map(s => ({
                    department_name: s.department_name,
                    status: s.status,
                    rejection_reason: s.rejection_reason,
                    action_at: s.action_at
                }))
            });

        if (historyError) {
            console.error('❌ History insert error:', JSON.stringify(historyError, null, 2));
        } else {
            console.log('✅ History inserted');
        }

        // 2. Update form
        const { error: formUpdateError } = await supabase
            .from('no_dues_forms')
            .update({
                status: 'pending',
                reapplication_count: newReapplicationCount,
                last_reapplied_at: new Date().toISOString(),
                is_reapplication: true,
                rejection_reason: null,
                rejection_context: null
            })
            .eq('id', form.id);

        if (formUpdateError) {
            console.error('❌ Form update error:', formUpdateError);
        } else {
            console.log('✅ Form updated to pending');
        }

        // 3. Reset rejected department statuses
        const { error: statusResetError } = await supabase
            .from('no_dues_status')
            .update({
                status: 'pending',
                rejection_reason: null,
                action_at: null,
                action_by_user_id: null
            })
            .eq('form_id', form.id)
            .eq('status', 'rejected');

        if (statusResetError) {
            console.error('❌ Status reset error:', statusResetError);
        } else {
            console.log('✅ Department statuses reset to pending');
        }

        // Verify final state
        const { data: updatedForm } = await supabase
            .from('no_dues_forms')
            .select('id, status, reapplication_count, is_reapplication')
            .eq('id', form.id)
            .single();

        console.log('\n📋 Updated Form State:');
        console.log(`   Status: ${updatedForm.status}`);
        console.log(`   Reapplication Count: ${updatedForm.reapplication_count}`);
        console.log(`   Is Reapplication: ${updatedForm.is_reapplication}`);

    } else {
        console.log('⚠️ No rejected forms found - reapplication cannot be tested');
        console.log('\n💡 Reapplication requires a form with status = "rejected"');
    }
}

testReapplication().catch(console.error);
