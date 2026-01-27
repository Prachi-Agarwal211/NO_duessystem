// Fix all forms that have incorrect status
// Run this to repair existing broken forms
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixBrokenForms() {
    console.log('='.repeat(70));
    console.log('FIXING BROKEN FORM STATUSES');
    console.log('='.repeat(70));

    // Step 1: Get all forms
    const { data: forms, error: formsError } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no, status')
        .order('created_at', { ascending: false });

    if (formsError) {
        console.log('❌ Error fetching forms:', formsError.message);
        return;
    }

    console.log(`\nFound ${forms.length} forms to check\n`);

    let fixed = 0;
    let alreadyCorrect = 0;

    for (const form of forms) {
        // Get all department statuses for this form
        const { data: statuses } = await supabase
            .from('no_dues_status')
            .select('status')
            .eq('form_id', form.id);

        if (!statuses || statuses.length === 0) {
            console.log(`⚠️  ${form.registration_no}: No department statuses found`);
            continue;
        }

        // Calculate correct status
        const allApproved = statuses.every(s => s.status === 'approved');
        const hasRejection = statuses.some(s => s.status === 'rejected');
        const allPending = statuses.every(s => s.status === 'pending');

        let correctStatus = 'in_progress';
        if (allPending) correctStatus = 'pending';
        else if (hasRejection) correctStatus = 'rejected';
        else if (allApproved) correctStatus = 'completed';

        const approved = statuses.filter(s => s.status === 'approved').length;
        const pending = statuses.filter(s => s.status === 'pending').length;
        const rejected = statuses.filter(s => s.status === 'rejected').length;

        // Check if needs fixing
        if (form.status !== correctStatus) {
            console.log(`🔧 FIXING ${form.registration_no}:`);
            console.log(`   Departments: ${approved}/${statuses.length} approved, ${pending} pending, ${rejected} rejected`);
            console.log(`   Current: "${form.status}" → Correct: "${correctStatus}"`);

            // Update form status
            const { error: updateError } = await supabase
                .from('no_dues_forms')
                .update({
                    status: correctStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', form.id);

            if (updateError) {
                console.log(`   ❌ Update failed: ${updateError.message}`);
            } else {
                console.log(`   ✅ Fixed!`);
                fixed++;
            }
        } else {
            alreadyCorrect++;
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Fixed: ${fixed} forms`);
    console.log(`✓  Already correct: ${alreadyCorrect} forms`);
    console.log(`Total: ${forms.length} forms`);
    console.log('='.repeat(70));
}

fixBrokenForms().catch(console.error);
