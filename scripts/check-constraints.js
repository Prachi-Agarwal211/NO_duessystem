// Check for foreign key constraints in production database
// Run: node scripts/check-constraints.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConstraints() {
    console.log('🔍 CHECKING DATABASE CONSTRAINTS\n');
    console.log('='.repeat(60));

    // 1. Check foreign key constraints on no_dues_messages
    console.log('\n📋 Checking foreign keys on no_dues_messages...');

    // Try to query the constraint info
    const { data: constraints, error: constraintError } = await supabase.rpc('get_table_constraints', {
        table_name_param: 'no_dues_messages'
    }).catch(() => ({ data: null, error: { message: 'RPC not available' } }));

    if (constraintError) {
        console.log('   Cannot query constraints via RPC, testing directly...\n');
    }

    // 2. Test a real insert to see what happens
    console.log('📋 Testing chat message insert...');

    // First, get a real form ID
    const { data: forms, error: formError } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no')
        .limit(1);

    if (formError || !forms?.length) {
        console.log('   ❌ No forms found to test with');
        return;
    }

    const testFormId = forms[0].id;
    console.log(`   Using form: ${forms[0].registration_no} (${testFormId})`);

    // Get a real department name
    const { data: depts, error: deptError } = await supabase
        .from('departments')
        .select('name, display_name')
        .eq('is_active', true)
        .limit(1);

    if (deptError || !depts?.length) {
        console.log('   ❌ No departments found');
        return;
    }

    const testDeptName = depts[0].name;
    console.log(`   Using department: ${testDeptName}`);

    // Try to insert a test message
    const testMessage = {
        form_id: testFormId,
        department_name: testDeptName,
        message: 'Test message - constraint check',
        sender_type: 'student',
        sender_name: 'Test User',
        sender_id: 'test-user-constraint-check',
        is_read: false
    };

    console.log('\n   Attempting insert with:', JSON.stringify(testMessage, null, 2));

    const { data: insertResult, error: insertError } = await supabase
        .from('no_dues_messages')
        .insert(testMessage)
        .select()
        .single();

    if (insertError) {
        console.log('\n   ❌ INSERT FAILED!');
        console.log(`   Error code: ${insertError.code}`);
        console.log(`   Error message: ${insertError.message}`);
        console.log(`   Error hint: ${insertError.hint || 'None'}`);
        console.log(`   Full error:`, JSON.stringify(insertError, null, 2));

        // Check if it's the foreign key constraint
        if (insertError.message.includes('foreign key') || insertError.message.includes('fkey')) {
            console.log('\n   ⚠️  FOREIGN KEY CONSTRAINT DETECTED!');
            console.log('   The no_dues_messages table has a foreign key on department_name');
            console.log('   that references the departments table.');
            console.log('\n   🔧 FIX: Need to either:');
            console.log('      1. Drop the foreign key constraint, OR');
            console.log('      2. Ensure the department_name value exists in departments table');
        }
    } else {
        console.log('\n   ✅ INSERT SUCCEEDED!');
        console.log(`   Message ID: ${insertResult.id}`);

        // Clean up test message
        await supabase.from('no_dues_messages').delete().eq('id', insertResult.id);
        console.log('   (Cleaned up test message)');
    }

    // 3. Check if department exists
    console.log('\n📋 Checking if all departments in no_dues_status exist in departments table...');

    const { data: uniqueDepts } = await supabase
        .from('no_dues_status')
        .select('department_name');

    const uniqueDeptNames = [...new Set(uniqueDepts?.map(d => d.department_name) || [])];

    const { data: existingDepts } = await supabase
        .from('departments')
        .select('name')
        .in('name', uniqueDeptNames);

    const existingDeptNames = new Set(existingDepts?.map(d => d.name) || []);

    const missingDepts = uniqueDeptNames.filter(d => !existingDeptNames.has(d));

    if (missingDepts.length > 0) {
        console.log('   ❌ Missing departments:', missingDepts);
        console.log('   These departments are in no_dues_status but NOT in departments table');
    } else {
        console.log('   ✅ All departments exist');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ CONSTRAINT CHECK COMPLETE');
}

checkConstraints().catch(console.error);
