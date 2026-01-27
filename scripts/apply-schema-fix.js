/**
 * Apply Schema Fix for no_dues_messages table
 * Fixes the UUID vs TEXT type mismatch causing 500 errors
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// SQL statements to fix the schema
const fixStatements = [
    // Drop constraints first
    'ALTER TABLE no_dues_messages DROP CONSTRAINT IF EXISTS no_dues_messages_form_id_fkey;',
    'ALTER TABLE no_dues_messages DROP CONSTRAINT IF EXISTS no_dues_messages_department_name_fkey;',

    // Change form_id to UUID if it's TEXT
    `DO $$ 
    BEGIN 
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'no_dues_messages' 
            AND column_name = 'form_id' 
            AND data_type = 'text'
        ) THEN
            ALTER TABLE no_dues_messages ALTER COLUMN form_id TYPE UUID USING form_id::UUID;
            RAISE NOTICE 'Converted form_id from TEXT to UUID';
        ELSE
            RAISE NOTICE 'form_id is already UUID or not TEXT';
        END IF;
    END $$;`,

    // Re-add the foreign key constraint
    `ALTER TABLE no_dues_messages 
        ADD CONSTRAINT no_dues_messages_form_id_fkey 
        FOREIGN KEY (form_id) REFERENCES no_dues_forms(id) ON DELETE CASCADE;`
];

async function runSqlViaRest(sql) {
    // Use Supabase's REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`SQL execution failed: ${text}`);
    }
    return response.json();
}

async function testInsertAfterFix() {
    console.log('\n🧪 Testing insert after fix...');

    const { data: form } = await supabase
        .from('no_dues_forms')
        .select('id')
        .limit(1)
        .single();

    if (!form) {
        console.log('   ⚠️ No forms found to test with');
        return false;
    }

    const testMsg = {
        form_id: form.id,
        department_name: 'hostel',
        message: 'Schema fix verification test - ' + Date.now(),
        sender_type: 'student',
        sender_name: 'System Test',
        sender_id: 'schema-fix-test-' + Date.now(),
        is_read: false
    };

    const { data, error } = await supabase
        .from('no_dues_messages')
        .insert(testMsg)
        .select()
        .single();

    if (error) {
        console.log('   ❌ Insert still failing:', error.message);
        return false;
    }

    console.log('   ✅ Insert SUCCESS! Message ID:', data.id);

    // Cleanup
    await supabase.from('no_dues_messages').delete().eq('id', data.id);
    console.log('   🧹 Test message cleaned up');

    return true;
}

async function applyFix() {
    console.log('🔧 APPLYING SCHEMA FIX FOR no_dues_messages\n');
    console.log('='.repeat(60));

    // First, let's test if the issue still exists
    console.log('\n📋 Step 1: Confirming the issue...');
    const insertWorks = await testInsertAfterFix();

    if (insertWorks) {
        console.log('\n✅ Insert already works! No fix needed.');
        console.log('   The schema might have been fixed already.');
        return;
    }

    console.log('\n📋 Step 2: The issue is confirmed. Attempting to fix...');
    console.log('   NOTE: This requires running SQL. Trying alternative methods...\n');

    // Method 1: Try using RPC if exec_sql function exists
    try {
        console.log('   Trying RPC method...');
        for (const sql of fixStatements) {
            await runSqlViaRest(sql);
        }
        console.log('   ✅ RPC method succeeded!');
    } catch (rpcError) {
        console.log('   ⚠️ RPC method not available:', rpcError.message.substring(0, 100));

        // Method 2: Output the SQL for manual execution
        console.log('\n' + '='.repeat(60));
        console.log('📋 MANUAL FIX REQUIRED');
        console.log('='.repeat(60));
        console.log('\nThe automated fix could not be applied.');
        console.log('Please run this SQL in your Supabase Dashboard → SQL Editor:\n');
        console.log('```sql');
        console.log(`
-- Fix no_dues_messages form_id type
ALTER TABLE no_dues_messages DROP CONSTRAINT IF EXISTS no_dues_messages_form_id_fkey;
ALTER TABLE no_dues_messages DROP CONSTRAINT IF EXISTS no_dues_messages_department_name_fkey;

-- Convert form_id to UUID
ALTER TABLE no_dues_messages 
    ALTER COLUMN form_id TYPE UUID USING form_id::UUID;

-- Re-add constraint
ALTER TABLE no_dues_messages 
    ADD CONSTRAINT no_dues_messages_form_id_fkey 
    FOREIGN KEY (form_id) REFERENCES no_dues_forms(id) ON DELETE CASCADE;

-- Verify
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'no_dues_messages' AND column_name = 'form_id';
        `.trim());
        console.log('```');
        console.log('\n' + '='.repeat(60));
        return;
    }

    // Verify the fix
    console.log('\n📋 Step 3: Verifying the fix...');
    const fixWorked = await testInsertAfterFix();

    if (fixWorked) {
        console.log('\n' + '='.repeat(60));
        console.log('🎉 SCHEMA FIX APPLIED SUCCESSFULLY!');
        console.log('='.repeat(60));
        console.log('\nBoth Chat and Reapply should now work.');
    } else {
        console.log('\n❌ Fix verification failed. Please run the SQL manually.');
    }
}

applyFix().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
