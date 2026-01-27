// Diagnostic script to check actual Supabase database schema
// Run: node scripts/check-real-schema.js

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRealSchema() {
    console.log('🔍 CHECKING ACTUAL SUPABASE SCHEMA...\n');

    const tables = [
        'no_dues_forms',
        'no_dues_status',
        'no_dues_messages',
        'no_dues_reapplication_history',
        'profiles',
        'departments',
        'student_otp_logs'
    ];

    for (const table of tables) {
        console.log(`\n📋 Table: ${table}`);
        console.log('─'.repeat(50));

        // Get column info using information_schema
        const { data: columns, error } = await supabaseAdmin
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', table)
            .eq('table_schema', 'public');

        if (error) {
            // Try alternative: query with raw SQL
            console.log(`  ⚠️ Direct query failed, trying raw SQL...`);
            const { data: rawData, error: rawError } = await supabaseAdmin
                .rpc('get_table_columns', { table_name: table })
                .catch(() => null);

            if (rawData) {
                rawData.forEach(col => {
                    console.log(`  • ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
                });
            } else {
                console.log(`  ❌ Error: ${error.message}`);
            }
            continue;
        }

        if (!columns || columns.length === 0) {
            console.log(`  ⚠️ Table doesn't exist or has no columns`);
            continue;
        }

        columns.forEach(col => {
            console.log(`  • ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
    }

    // Check for blockchain-related columns
    console.log('\n\n🔗 CHECKING FOR BLOCKCHAIN COLUMNS IN no_dues_forms...');
    console.log('─'.repeat(50));

    const { data: formColumns } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'no_dues_forms')
        .eq('table_schema', 'public');

    const blockchainColumns = ['blockchain_hash', 'blockchain_tx', 'blockchain_block', 'blockchain_timestamp', 'blockchain_verified'];
    blockchainColumns.forEach(col => {
        const exists = formColumns?.some(c => c.column_name === col);
        console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });

    // Check for action_by_user_id
    console.log('\n\n👤 CHECKING FOR action_by_user_id IN no_dues_status...');
    console.log('─'.repeat(50));

    const { data: statusColumns } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'no_dues_status')
        .eq('table_schema', 'public');

    const actionByUserExists = statusColumns?.some(c => c.column_name === 'action_by_user_id');
    console.log(`  ${actionByUserExists ? '✅' : '❌'} action_by_user_id`);

    const actionByExists = statusColumns?.some(c => c.column_name === 'action_by');
    console.log(`  ${actionByExists ? '✅' : '❌'} action_by`);

    // Check RLS policies
    console.log('\n\n🔒 CHECKING RLS POLICIES...');
    console.log('─'.repeat(50));

    const { data: policies } = await supabaseAdmin
        .from('pg_policies')
        .select('tablename, policyname, roles')
        .eq('schemaname', 'public');

    if (policies) {
        policies.forEach(p => {
            console.log(`  • ${p.tablename}: ${p.policyname} [${p.roles.join(', ')}]`);
        });
    }

    console.log('\n\n✅ SCHEMA CHECK COMPLETE');
}

checkRealSchema().catch(console.error);
