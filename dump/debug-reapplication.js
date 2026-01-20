require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugReapplication() {
    console.log('\n🔍 DEBUGGING REAPPLICATION FLOW\n');
    console.log('='.repeat(60));

    // 1. Check if no_dues_reapplication_history table exists
    console.log('\n1️⃣ Checking if no_dues_reapplication_history table exists...');

    try {
        const { data, error } = await supabase
            .from('no_dues_reapplication_history')
            .select('id')
            .limit(1);

        if (error) {
            console.log(`   ❌ TABLE DOES NOT EXIST OR ACCESS DENIED`);
            console.log(`   Error: ${error.message}`);
            console.log(`   Code: ${error.code}`);
            console.log('\n   🔧 FIX: Run FIX_REAPPLICATION_TABLE.sql in Supabase');
        } else {
            console.log(`   ✅ Table exists`);
        }
    } catch (e) {
        console.log(`   ❌ Error checking table: ${e.message}`);
    }

    // 2. Check table columns
    console.log('\n2️⃣ Checking table structure...');

    try {
        const { data, error } = await supabase
            .rpc('get_table_columns', { table_name: 'no_dues_reapplication_history' });

        if (error) {
            console.log(`   ⚠️ Could not check columns: ${error.message}`);
        } else if (data && data.length > 0) {
            console.log('   Columns found:');
            data.forEach(col => {
                console.log(`     - ${col.column_name} (${col.data_type})`);
            });
        } else {
            console.log('   ⚠️ No columns found - table may not exist');
        }
    } catch (e) {
        console.log(`   ⚠️ Error: ${e.message}`);
    }

    // 3. Check for any unique constraints that might cause issues
    console.log('\n3️⃣ Testing insert into reapplication_history...');

    try {
        // Get a test form
        const { data: testForm, error: formError } = await supabase
            .from('no_dues_forms')
            .select('id, registration_no, reapplication_count')
            .limit(1)
            .single();

        if (formError || !testForm) {
            console.log('   ⚠️ No forms found to test with');
        } else {
            console.log(`   Using form: ${testForm.registration_no} (reapplication_count: ${testForm.reapplication_count})`);

            // Try to insert
            const testInsert = {
                form_id: testForm.id,
                reapplication_number: 999, // Use a high number to avoid conflict
                student_message: 'TEST - Please ignore',
                edited_fields: {},
                rejected_departments: [],
                previous_status: []
            };

            const { data: inserted, error: insertError } = await supabase
                .from('no_dues_reapplication_history')
                .insert(testInsert)
                .select()
                .single();

            if (insertError) {
                console.log(`   ❌ INSERT FAILED: ${insertError.message}`);
                console.log(`   Code: ${insertError.code}`);

                if (insertError.code === '23505') {
                    console.log('\n   🔴 UNIQUE CONSTRAINT VIOLATION');
                    console.log('   There may be a unique constraint on (form_id, reapplication_number)');
                } else if (insertError.code === '42P01') {
                    console.log('\n   🔴 TABLE DOES NOT EXIST');
                    console.log('   Run FIX_REAPPLICATION_TABLE.sql');
                }
            } else {
                console.log('   ✅ Insert successful!');

                // Clean up test data
                await supabase
                    .from('no_dues_reapplication_history')
                    .delete()
                    .eq('id', inserted.id);
                console.log('   🧹 Test data cleaned up');
            }
        }
    } catch (e) {
        console.log(`   ❌ Error during test: ${e.message}`);
    }

    // 4. Check if there's an existing history entry that might conflict
    console.log('\n4️⃣ Checking for existing history entries...');

    try {
        const { data: history, error } = await supabase
            .from('no_dues_reapplication_history')
            .select('form_id, reapplication_number, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
        } else if (history && history.length > 0) {
            console.log(`   Found ${history.length} history entries:`);
            history.forEach(h => {
                console.log(`     Form: ${h.form_id.substring(0, 8)}... | Reapp#: ${h.reapplication_number}`);
            });
        } else {
            console.log('   No history entries found');
        }
    } catch (e) {
        console.log(`   ⚠️ Error (table might not exist): ${e.message}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('DIAGNOSIS COMPLETE\n');
}

debugReapplication()
    .then(() => process.exit(0))
    .catch(e => {
        console.error('Fatal error:', e);
        process.exit(1);
    });
