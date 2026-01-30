// Set 22BCOM1367 to 6 approved, 1 pending for dashboard test
// Run: node scripts/set-6-approved.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function set6Approved() {
    try {
        const formId = '9efc323a-0431-4d52-8744-0c7935917f36';
        const userId = 'aa1824d9-d7a5-400e-89cb-a99b1d2811fe'; // admin user

        console.log('🔄 Setting 22BCOM1367 to 6 approved, 1 pending...');

        // Step 1: Reset form status
        console.log('📝 Resetting form status to in_progress...');
        const { error: formError } = await supabase
            .from('no_dues_forms')
            .update({ status: 'in_progress' })
            .eq('id', formId);
        if (formError) throw formError;

        // Step 2: Set all to pending
        console.log('📝 Setting all departments to pending...');
        const { error: resetError } = await supabase
            .from('no_dues_status')
            .update({ status: 'pending', action_at: null, action_by_user_id: null })
            .eq('form_id', formId);
        if (resetError) throw resetError;

        // Step 3: Get all status IDs
        console.log('📝 Fetching department status IDs...');
        const { data: statuses, error: statusError } = await supabase
            .from('no_dues_status')
            .select('id')
            .eq('form_id', formId);
        if (statusError) throw statusError;

        if (statuses.length < 7) {
            console.log('⚠️ Only', statuses.length, 'departments found');
        }

        // Step 4: Approve 6 departments
        const idsToApprove = statuses.slice(0, 6).map(s => s.id);
        console.log('✅ Approving 6 departments...');
        const { error: approveError } = await supabase
            .from('no_dues_status')
            .update({ status: 'approved', action_at: new Date().toISOString(), action_by_user_id: userId })
            .in('id', idsToApprove);
        if (approveError) throw approveError;

        // Step 5: Verify
        console.log('\n📊 Verifying...');
        const { data: verifyStatuses } = await supabase
            .from('no_dues_status')
            .select('department_name, status')
            .eq('form_id', formId);

        console.log('\nDepartment Status:');
        verifyStatuses.forEach(s => console.log(`  - ${s.department_name}: ${s.status}`));

        const approved = verifyStatuses.filter(s => s.status === 'approved').length;
        const pending = verifyStatuses.filter(s => s.status === 'pending').length;

        console.log(`\n✅ Total: ${approved} approved, ${pending} pending`);

        if (approved === 6 && pending === 1) {
            console.log('\n🎯 Ready for dashboard test!');
            console.log('   1. Go to dashboard');
            console.log('   2. Find 22BCOM1367');
            console.log('   3. Approve the last pending department');
            console.log('   4. Check if certificate generates automatically');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

set6Approved();
