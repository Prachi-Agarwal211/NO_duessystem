// Test reapplication flow to find the exact 500 error
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testReapplyFlow() {
    let output = 'REAPPLICATION FLOW TEST\n';
    output += '='.repeat(60) + '\n\n';

    try {
        // Step 1: Find a form that can be re-applied (has rejected status)
        output += 'Step 1: Finding a form with rejected department status...\n';

        // Get forms with rejected departments
        const { data: rejectedForms, error: queryError } = await supabase
            .from('no_dues_status')
            .select(`
        form_id,
        department_name,
        status,
        rejection_reason,
        id
      `)
            .eq('status', 'rejected')
            .limit(1);

        if (queryError) {
            output += '❌ Query Error: ' + queryError.message + '\n';
            fs.writeFileSync('reapply-test.txt', output);
            return;
        }

        if (!rejectedForms || rejectedForms.length === 0) {
            output += '⚠️ No rejected forms found. Looking for in_progress forms...\n';

            // Try with in_progress forms
            const { data: inProgressForms, error: ipError } = await supabase
                .from('no_dues_forms')
                .select('id, registration_no, status')
                .eq('status', 'in_progress')
                .limit(1);

            if (ipError) {
                output += '❌ IP Query Error: ' + ipError.message + '\n';
            } else if (inProgressForms && inProgressForms.length > 0) {
                output += '✅ Found in_progress form: ' + inProgressForms[0].registration_no + '\n';
                output += '   Form ID: ' + inProgressForms[0].id + '\n';

                // Test the reapplication logic
                output += '\nStep 2: Testing reapplication logic...\n';

                const formId = inProgressForms[0].id;
                const deptName = 'school_hod'; // Use a department that exists

                output += '   Attempting to reset status for ' + deptName + '...\n';

                // This is what ApplicationService.handleReapplication does at line 301-306
                const { error: updateError } = await supabase
                    .from('no_dues_status')
                    .update({
                        status: 'pending',
                        rejection_reason: null,
                        action_at: null,
                        action_by_user_id: null  // This column might not exist!
                    })
                    .eq('form_id', formId)
                    .eq('department_name', deptName);

                if (updateError) {
                    output += '❌ UPDATE ERROR: ' + updateError.message + '\n';
                    output += '   Code: ' + updateError.code + '\n';
                    output += '   Details: ' + (updateError.details || 'N/A') + '\n';
                    output += '   Hint: ' + (updateError.hint || 'N/A') + '\n';
                } else {
                    output += '✅ Update successful!\n';
                }
            } else {
                output += '❌ No in_progress forms found either.\n';
            }
        } else {
            const rejected = rejectedForms[0];
            output += '✅ Found rejected form: ' + rejected.form_id + '\n';
            output += '   Department: ' + rejected.department_name + '\n';
            output += '   Reason: ' + (rejected.rejection_reason || 'N/A') + '\n';

            // Test the reapplication logic
            output += '\nStep 2: Testing reapplication on rejected form...\n';

            const { error: updateError } = await supabase
                .from('no_dues_status')
                .update({
                    status: 'pending',
                    rejection_reason: null,
                    action_at: null,
                    action_by_user_id: null
                })
                .eq('id', rejected.id);

            if (updateError) {
                output += '❌ UPDATE ERROR: ' + updateError.message + '\n';
                output += '   Code: ' + updateError.code + '\n';
                output += '   Details: ' + (updateError.details || 'N/A') + '\n';
            } else {
                output += '✅ Update successful!\n';
            }
        }

        // Step 3: Check if no_dues_reapplication_history table exists and works
        output += '\nStep 3: Testing reapplication_history insert...\n';

        const { data: testForm } = await supabase
            .from('no_dues_forms')
            .select('id')
            .limit(1)
            .single();

        if (testForm) {
            const { error: historyError } = await supabase
                .from('no_dues_reapplication_history')
                .insert({
                    form_id: testForm.id,
                    reapplication_number: 1,
                    department_name: 'TEST_DEPT',
                    student_reply_message: 'Test reapplication message',
                    previous_status: []
                });

            if (historyError) {
                output += '❌ HISTORY INSERT ERROR: ' + historyError.message + '\n';
                output += '   Code: ' + historyError.code + '\n';
                output += '   Details: ' + (historyError.details || 'N/A') + '\n';
            } else {
                output += '✅ History insert successful!\n';

                // Clean up test record
                await supabase
                    .from('no_dues_reapplication_history')
                    .delete()
                    .eq('form_id', testForm.id)
                    .eq('department_name', 'TEST_DEPT');
            }
        }

        // Step 4: Check form update
        output += '\nStep 4: Testing form update (is_reapplication, reapplication_count)...\n';

        const { error: formUpdateError } = await supabase
            .from('no_dues_forms')
            .update({
                is_reapplication: true,
                reapplication_count: 1,
                last_reapplied_at: new Date().toISOString()
            })
            .eq('id', testForm.id);

        if (formUpdateError) {
            output += '❌ FORM UPDATE ERROR: ' + formUpdateError.message + '\n';
        } else {
            output += '✅ Form update successful!\n';
        }

    } catch (err) {
        output += '\n💥 FATAL ERROR: ' + err.message + '\n';
        output += err.stack + '\n';
    }

    output += '\n' + '='.repeat(60);
    output += '\nTEST COMPLETE\n';
    output += '='.repeat(60) + '\n';

    fs.writeFileSync('reapply-test.txt', output);
    console.log('Results written to reapply-test.txt');
}

testReapplyFlow();
