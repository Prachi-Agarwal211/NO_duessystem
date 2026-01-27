// Test the exact API route flow to find 500 error
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me';

async function testAPI() {
    let output = 'API ROUTE FLOW TEST\n';
    output += '='.repeat(60) + '\n\n';

    try {
        // Step 1: Find a rejected form with department
        output += 'Step 1: Finding rejected form...\n';

        const { data: rejectedForms, error: queryError } = await supabase
            .from('no_dues_status')
            .select(`
        form_id,
        department_name,
        status,
        rejection_reason,
        rejection_count,
        action_at
      `)
            .eq('status', 'rejected')
            .limit(1);

        if (queryError) {
            output += '❌ Query Error: ' + queryError.message + '\n';
            fs.writeFileSync('api-test.txt', output);
            return;
        }

        if (!rejectedForms || rejectedForms.length === 0) {
            output += '⚠️ No rejected forms. Using pending form...\n';

            const { data: pendingForm } = await supabase
                .from('no_dues_forms')
                .select('id, registration_no, status')
                .eq('status', 'pending')
                .limit(1)
                .single();

            if (pendingForm) {
                output += '✅ Using form: ' + pendingForm.registration_no + '\n';
                output += '   Form ID: ' + pendingForm.id + '\n';

                // Test ApplicationService.handleReapplication
                output += '\nStep 2: Testing ApplicationService.handleReapplication...\n';

                const ApplicationService = require('../src/lib/services/ApplicationService.js');

                output += 'Calling handleReapplication...\n';
                const result = await ApplicationService.default.handleReapplication(pendingForm.id, {
                    reason: 'Test reapplication message',
                    department: 'school_hod',
                    editedFields: {}
                });

                output += '✅ handleReapplication result: ' + JSON.stringify(result, null, 2) + '\n';
            }
        } else {
            const rejected = rejectedForms[0];
            output += '✅ Found rejected form: ' + rejected.form_id + '\n';
            output += '   Department: ' + rejected.department_name + '\n';
            output += '   Rejection Count: ' + rejected.rejection_count + '\n';

            // Test ApplicationService.handleReapplication
            output += '\nStep 2: Testing ApplicationService.handleReapplication...\n';

            const ApplicationService = require('../src/lib/services/ApplicationService.js');

            output += 'Calling handleReapplication...\n';
            const result = await ApplicationService.default.handleReapplication(rejected.form_id, {
                reason: 'Test reapplication message',
                department: rejected.department_name,
                editedFields: {}
            });

            output += '✅ handleReapplication result: ' + JSON.stringify(result, null, 2) + '\n';
        }

        // Step 3: Test email import (this might be the issue)
        output += '\nStep 3: Testing email import...\n';

        try {
            const emailModule = await import('../src/lib/emailService.js');
            output += '✅ emailService.js imported successfully\n';
            output += '   Exports: ' + Object.keys(emailModule).join(', ') + '\n';

            if (typeof emailModule.sendReapplicationNotification === 'function') {
                output += '   ✅ sendReapplicationNotification exists\n';
            } else {
                output += '   ❌ sendReapplicationNotification NOT found\n';
            }
        } catch (emailImportError) {
            output += '❌ emailService.js import failed: ' + emailImportError.message + '\n';
            output += '   Code: ' + emailImportError.code + '\n';
        }

    } catch (err) {
        output += '\n💥 FATAL ERROR: ' + err.message + '\n';
        output += err.stack + '\n';
    }

    output += '\n' + '='.repeat(60);
    output += '\nTEST COMPLETE\n';
    output += '='.repeat(60) + '\n';

    fs.writeFileSync('api-test.txt', output);
    console.log('Results written to api-test.txt');
}

testAPI();
