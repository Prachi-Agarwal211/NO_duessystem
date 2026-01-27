// Direct schema check script
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRealSchema() {
    console.log('🔍 CHECKING ACTUAL SUPABASE SCHEMA\n');
    console.log('='.repeat(60));

    // Check blockchain columns
    console.log('\n📋 Blockchain columns in no_dues_forms:');
    const bcCols = ['blockchain_hash', 'blockchain_tx', 'blockchain_block', 'blockchain_timestamp', 'blockchain_verified'];
    for (const col of bcCols) {
        try {
            const { error } = await supabase.from('no_dues_forms').select(col).limit(1);
            if (error) {
                console.log('   ❌ ' + col + ': ' + error.message);
            } else {
                console.log('   ✅ ' + col);
            }
        } catch (e) {
            console.log('   ❌ ' + col + ': ' + e.message);
        }
    }

    // Check no_dues_status columns
    console.log('\n📋 Key columns in no_dues_status:');
    const statusCols = ['action_by_user_id', 'rejection_count'];
    for (const col of statusCols) {
        try {
            const { error } = await supabase.from('no_dues_status').select(col).limit(1);
            if (error) {
                console.log('   ❌ ' + col + ': ' + error.message);
            } else {
                console.log('   ✅ ' + col);
            }
        } catch (e) {
            console.log('   ❌ ' + col + ': ' + e.message);
        }
    }

    // Check profiles columns
    console.log('\n📋 Key columns in profiles:');
    const profileCols = ['last_active_at', 'assigned_department_ids'];
    for (const col of profileCols) {
        try {
            const { error } = await supabase.from('profiles').select(col).limit(1);
            if (error) {
                console.log('   ❌ ' + col + ': ' + error.message);
            } else {
                console.log('   ✅ ' + col);
            }
        } catch (e) {
            console.log('   ❌ ' + col + ': ' + e.message);
        }
    }

    // Check chat FK constraint
    console.log('\n📋 Chat message sender_id FK constraint:');
    try {
        const { error } = await supabase.from('no_dues_messages').insert({
            form_id: '00000000-0000-0000-0000-000000000000',
            department_name: 'TEST_DEPT',
            message: 'FK test',
            sender_type: 'student',
            sender_name: 'Test User',
            sender_id: 'test-fk-001'
        }).select().single();

        if (error) {
            console.log('   ❌ FK CONSTRAINT EXISTS: ' + error.message.substring(0, 100));
        } else {
            console.log('   ✅ NO FK CONSTRAINT - Message inserted');
        }
    } catch (e) {
        console.log('   ❌ ERROR: ' + e.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Schema check complete\n');
}

checkRealSchema().catch(console.error);
