// Reset form to 6 approved, 1 pending AND clear certificate data
// Run: node scripts/reset-and-clear.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetAndClear() {
    try {
        const formId = '9efc323a-0431-4d52-8744-0c7935917f36';
        const userId = 'aa1824d9-d7a5-400e-89cb-a99b1d2811fe';

        console.log('🔄 Resetting form and clearing certificate...\n');

        // Step 1: Clear certificate data from form
        console.log('📝 Clearing certificate data...');
        const { error: clearError } = await supabase
            .from('no_dues_forms')
            .update({
                status: 'in_progress',
                final_certificate_generated: false,
                certificate_url: null,
                blockchain_tx: null,
                blockchain_hash: null,
                blockchain_block: null,
                blockchain_timestamp: null,
                blockchain_verified: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', formId);
        if (clearError) throw clearError;

        // Step 2: Set all statuses to pending
        console.log('📝 Setting all departments to pending...');
        const { error: pendingError } = await supabase
            .from('no_dues_status')
            .update({ status: 'pending', action_at: null, action_by_user_id: null })
            .eq('form_id', formId);
        if (pendingError) throw pendingError;

        // Step 3: Get status IDs and approve 6
        console.log('📝 Approving 6 departments...');
        const { data: statuses, error: statusError } = await supabase
            .from('no_dues_status')
            .select('id')
            .eq('form_id', formId);
        if (statusError) throw statusError;

        const idsToApprove = statuses.slice(0, 6).map(s => s.id);
        const { error: approveError } = await supabase
            .from('no_dues_status')
            .update({ status: 'approved', action_at: new Date().toISOString(), action_by_user_id: userId })
            .in('id', idsToApprove);
        if (approveError) throw approveError;

        // Step 4: Verify
        console.log('\n✅ Reset Complete!');
        console.log('   - Form status: in_progress');
        console.log('   - Certificate cleared');
        console.log('   - 6 approved, 1 pending');

        // Show current status
        const { data: verify } = await supabase
            .from('no_dues_status')
            .select('department_name, status')
            .eq('form_id', formId);

        console.log('\n📊 Current Status:');
        verify.forEach(s => console.log(`   ${s.department_name}: ${s.status}`));

        // Check form
        const { data: form } = await supabase
            .from('no_dues_forms')
            .select('status, certificate_url, final_certificate_generated')
            .eq('id', formId)
            .single();

        console.log('\n📋 Form:');
        console.log(`   status: ${form.status}`);
        console.log(`   certificate_url: ${form.certificate_url || '❌ NULL'}`);
        console.log(`   final_certificate_generated: ${form.final_certificate_generated}`);

        console.log('\n🎯 Ready to test!');
        console.log('   1. Go to dashboard');
        console.log('   2. Approve the last department');
        console.log('   3. Certificate should generate automatically');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

resetAndClear();
