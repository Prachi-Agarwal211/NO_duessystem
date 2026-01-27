// Enhanced schema verification script - specifically for certificate and blockchain
// This compares what the CODE expects vs what the DATABASE has
// Run: node scripts/verify-schema-vs-code.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ISSUES_FOUND = [];

async function verifySchemaMismatch() {
    console.log('🔍 VERIFYING CODE vs DATABASE SCHEMA\n');
    console.log('='.repeat(60));

    // =========================================================================
    // CHECK 1: no_dues_forms - Blockchain columns
    // =========================================================================
    console.log('\n📋 CHECK 1: no_dues_forms - Blockchain columns');
    console.log('-'.repeat(60));

    const expectedBlockchainColumns = [
        'blockchain_hash',
        'blockchain_tx',
        'blockchain_block',
        'blockchain_timestamp',
        'blockchain_verified'
    ];

    // Try to query these columns - if they don't exist, we'll get an error
    for (const col of expectedBlockchainColumns) {
        try {
            const { error } = await supabase
                .from('no_dues_forms')
                .select(col)
                .limit(1);

            if (error) {
                console.log(`   ❌ MISSING: ${col}`);
                console.log(`      Error: ${error.message}`);
                ISSUES_FOUND.push({
                    table: 'no_dues_forms',
                    column: col,
                    used_in: 'certificateService.js finalizeCertificate()',
                    severity: 'CRITICAL'
                });
            } else {
                console.log(`   ✅ EXISTS: ${col}`);
            }
        } catch (e) {
            console.log(`   ❌ EXCEPTION: ${col} - ${e.message}`);
        }
    }

    // =========================================================================
    // CHECK 2: no_dues_status - action_by_user_id column
    // =========================================================================
    console.log('\n📋 CHECK 2: no_dues_status - action_by_user_id column');
    console.log('-'.repeat(60));

    try {
        const { error } = await supabase
            .from('no_dues_status')
            .select('action_by_user_id, rejection_count')
            .limit(1);

        if (error) {
            console.log(`   ❌ MISSING: action_by_user_id or rejection_count`);
            console.log(`      Error: ${error.message}`);
            ISSUES_FOUND.push({
                table: 'no_dues_status',
                column: 'action_by_user_id',
                used_in: 'ApplicationService.js, certificateTrigger.js',
                severity: 'CRITICAL'
            });
            ISSUES_FOUND.push({
                table: 'no_dues_status',
                column: 'rejection_count',
                used_in: 'ApplicationService.js',
                severity: 'MEDIUM'
            });
        } else {
            console.log(`   ✅ EXISTS: action_by_user_id, rejection_count`);
        }
    } catch (e) {
        console.log(`   ❌ EXCEPTION: ${e.message}`);
    }

    // =========================================================================
    // CHECK 3: profiles - last_active_at column
    // =========================================================================
    console.log('\n📋 CHECK 3: profiles - last_active_at column');
    console.log('-'.repeat(60));

    try {
        const { error } = await supabase
            .from('profiles')
            .select('last_active_at, assigned_department_ids')
            .limit(1);

        if (error) {
            console.log(`   ❌ MISSING: last_active_at or assigned_department_ids`);
            console.log(`      Error: ${error.message}`);
            ISSUES_FOUND.push({
                table: 'profiles',
                column: 'last_active_at',
                used_in: 'Login/auth system',
                severity: 'MEDIUM'
            });
        } else {
            console.log(`   ✅ EXISTS: last_active_at, assigned_department_ids`);
        }
    } catch (e) {
        console.log(`   ❌ EXCEPTION: ${e.message}`);
    }

    // =========================================================================
    // CHECK 4: no_dues_messages - Check sender_id constraint
    // =========================================================================
    console.log('\n📋 CHECK 4: no_dues_messages - sender_id NOT NULL');
    console.log('-'.repeat(60));

    try {
        // Try to insert a message without sender_id
        const { error } = await supabase
            .from('no_dues_messages')
            .insert({
                form_id: '00000000-0000-0000-0000-000000000000', // Fake UUID
                department_name: 'TEST_DEPT',
                message: 'Schema test message',
                sender_type: 'student',
                sender_name: 'Test User'
                // Deliberately NOT including sender_id
            })
            .select()
            .single();

        if (error) {
            console.log(`   ⚠️  Cannot test sender_id null constraint easily`);
            console.log(`      Error: ${error.message}`);
        } else {
            console.log(`   ⚠️  Message inserted without sender_id - may be allowed`);

            // Clean up test message
            await supabase.from('no_dues_messages').delete().eq('id', error.data?.id);
        }
    } catch (e) {
        console.log(`   ⚠️  Exception: ${e.message}`);
    }

    // =========================================================================
    // CHECK 5: Verify Chat API query works
    // =========================================================================
    console.log('\n📋 CHECK 5: Chat API - no_dues_messages query');
    console.log('-'.repeat(60));

    try {
        // This is what the chat API does
        const { error } = await supabase
            .from('no_dues_messages')
            .select('*')
            .eq('form_id', '00000000-0000-0000-0000-000000000000')
            .eq('department_name', 'TEST_DEPT')
            .order('created_at', { ascending: true })
            .range(0, 49);

        if (error) {
            console.log(`   ❌ Chat query failed: ${error.message}`);
            ISSUES_FOUND.push({
                table: 'no_dues_messages',
                column: 'query',
                used_in: 'api/chat/[formId]/[department]/route.js',
                severity: 'HIGH'
            });
        } else {
            console.log(`   ✅ Chat query works correctly`);
        }
    } catch (e) {
        console.log(`   ❌ Exception: ${e.message}`);
    }

    // =========================================================================
    // CHECK 6: Verify certificate trigger function
    // =========================================================================
    console.log('\n📋 CHECK 6: Certificate trigger query');
    console.log('-'.repeat(60));

    try {
        // This is what certificateTrigger.js does at line 40
        const { error } = await supabase
            .from('no_dues_forms')
            .select(`
                id,
                registration_no,
                student_name,
                status,
                no_dues_status (
                    department_name,
                    status,
                    action_at,
                    action_by_user_id
                )
            `)
            .limit(1);

        if (error) {
            console.log(`   ❌ Certificate trigger query failed`);
            console.log(`      Error: ${error.message}`);
            console.log(`      This confirms action_by_user_id is missing!`);
            ISSUES_FOUND.push({
                table: 'no_dues_status',
                column: 'action_by_user_id (in join query)',
                used_in: 'certificateTrigger.js line 40',
                severity: 'CRITICAL'
            });
        } else {
            console.log(`   ✅ Certificate trigger query works`);
        }
    } catch (e) {
        console.log(`   ❌ Exception: ${e.message}`);
    }

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));

    console.log(`\n❌ ISSUES FOUND: ${ISSUES_FOUND.length}\n`);

    const critical = ISSUES_FOUND.filter(i => i.severity === 'CRITICAL');
    const high = ISSUES_FOUND.filter(i => i.severity === 'HIGH');
    const medium = ISSUES_FOUND.filter(i => i.severity === 'MEDIUM');

    if (critical.length > 0) {
        console.log('🔴 CRITICAL ISSUES:');
        critical.forEach(i => {
            console.log(`   • ${i.table}.${i.column}`);
            console.log(`     Used in: ${i.used_in}`);
        });
    }

    if (high.length > 0) {
        console.log('\n🟠 HIGH PRIORITY ISSUES:');
        high.forEach(i => {
            console.log(`   • ${i.table}.${i.column}`);
            console.log(`     Used in: ${i.used_in}`);
        });
    }

    if (medium.length > 0) {
        console.log('\n🟡 MEDIUM PRIORITY ISSUES:');
        medium.forEach(i => {
            console.log(`   • ${i.table}.${i.column}`);
            console.log(`     Used in: ${i.used_in}`);
        });
    }

    console.log('\n' + '='.repeat60);

    return ISSUES_FOUND;
}

verifySchemaMismatch()
    .then(issues => {
        console.log('\n✅ Verification complete');
        process.exit(issues.length > 0 ? 1 : 0);
    })
    .catch(err => {
        console.error('💥 Fatal error:', err);
        process.exit(1);
    });
