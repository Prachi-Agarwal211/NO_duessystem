/**
 * Check all form statuses
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFormStatuses() {
    console.log('🔍 Checking all form statuses...\n');

    // Get all forms with their statuses
    const { data: forms, error } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no, student_name, status, is_reapplication, reapplication_count, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching forms:', error);
        return;
    }

    console.log(`📋 Total Forms: ${forms?.length || 0}\n`);

    // Group by status
    const statusCounts = {};
    forms?.forEach(form => {
        statusCounts[form.status] = (statusCounts[form.status] || 0) + 1;
    });

    console.log('📊 Status Breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`);
    });

    // Show all forms
    console.log('\n📝 All Forms:');
    forms?.forEach(form => {
        console.log(`   ${form.status.padEnd(12)} | ${form.registration_no} | ${form.student_name || 'N/A'}`);
    });

    // Check department statuses for rejected forms (if any)
    const rejectedForms = forms?.filter(f => f.status === 'rejected') || [];
    if (rejectedForms.length > 0) {
        console.log('\n📋 Department Statuses for Rejected Forms:');
        for (const form of rejectedForms.slice(0, 1)) {
            const { data: statuses } = await supabase
                .from('no_dues_status')
                .select('department_name, status, rejection_reason')
                .eq('form_id', form.id);

            console.log(`   Form: ${form.registration_no}`);
            statuses?.forEach(s => {
                console.log(`      ${s.department_name}: ${s.status} ${s.rejection_reason ? `(${s.rejection_reason})` : ''}`);
            });
        }
    }
}

checkFormStatuses().catch(console.error);
