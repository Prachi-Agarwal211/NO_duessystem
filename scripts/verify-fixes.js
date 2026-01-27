/**
 * Test Script: Verify Fixes and Database Structure
 * Run with: node scripts/verify-fixes.js
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyFixes() {
    console.log('🔍 VERIFICATION SCRIPT - Checking Database & Fixes\n');
    console.log('='.repeat(60));

    // 1. Check no_dues_forms has is_reapplication column
    console.log('\n📋 1. CHECKING no_dues_forms TABLE STRUCTURE...\n');

    const { data: forms, error: formError } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no, status, is_reapplication, reapplication_count, last_reapplied_at')
        .limit(5);

    if (formError) {
        console.error('❌ Error fetching forms:', formError.message);
        if (formError.message.includes('is_reapplication')) {
            console.log('\n⚠️ DATABASE FIX NEEDED: is_reapplication column missing!');
            console.log('Run this SQL in Supabase:\n');
            console.log(`ALTER TABLE no_dues_forms 
  ADD COLUMN IF NOT EXISTS is_reapplication BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reapplication_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reapplied_at TIMESTAMPTZ;`);
        }
    } else {
        console.log('✅ no_dues_forms table structure is correct');
        console.log('   Columns: id, registration_no, status, is_reapplication, reapplication_count, last_reapplied_at');
        console.log('\n   Sample data:');
        forms?.forEach(f => {
            console.log(`   - ${f.registration_no}: status=${f.status}, is_reapplication=${f.is_reapplication}, count=${f.reapplication_count}`);
        });
    }

    // 2. Check no_dues_messages table structure
    console.log('\n📬 2. CHECKING no_dues_messages TABLE STRUCTURE...\n');

    const { data: messages, error: msgError } = await supabase
        .from('no_dues_messages')
        .select('*')
        .limit(1);

    if (msgError) {
        console.error('❌ Error querying no_dues_messages:', msgError.message);
        if (msgError.code === 'PGRST116' || msgError.message.includes('does not exist')) {
            console.log('\n⚠️ DATABASE FIX NEEDED: no_dues_messages table may not exist!');
            console.log('Run this SQL in Supabase:\n');
            console.log(`CREATE TABLE IF NOT EXISTS no_dues_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES no_dues_forms(id) ON DELETE CASCADE,
  department_name TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('student', 'department')),
  sender_name TEXT NOT NULL,
  sender_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE no_dues_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read messages
CREATE POLICY "Allow read messages" ON no_dues_messages FOR SELECT USING (true);

-- Policy: Allow all authenticated users to insert messages
CREATE POLICY "Allow insert messages" ON no_dues_messages FOR INSERT WITH CHECK (true);`);
        }
    } else {
        console.log('✅ no_dues_messages table exists and is accessible');
        console.log(`   Current message count: ${messages?.length || 0}`);
    }

    // 3. Check no_dues_reapplication_history table
    console.log('\n📜 3. CHECKING no_dues_reapplication_history TABLE...\n');

    const { data: history, error: historyError } = await supabase
        .from('no_dues_reapplication_history')
        .select('*')
        .limit(1);

    if (historyError) {
        console.error('❌ Error querying no_dues_reapplication_history:', historyError.message);
        if (historyError.code === 'PGRST116' || historyError.message.includes('does not exist')) {
            console.log('\n⚠️ DATABASE FIX NEEDED: no_dues_reapplication_history table may not exist!');
            console.log('Run this SQL in Supabase:\n');
            console.log(`CREATE TABLE IF NOT EXISTS no_dues_reapplication_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES no_dues_forms(id) ON DELETE CASCADE,
  reapplication_number INTEGER NOT NULL,
  department_name TEXT,
  student_reply_message TEXT,
  edited_fields JSONB DEFAULT '{}',
  previous_status JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`);
        }
    } else {
        console.log('✅ no_dues_reapplication_history table exists');
        console.log(`   Current history count: ${history?.length || 0}`);
    }

    // 4. Test chat message insert
    console.log('\n💬 4. TESTING CHAT MESSAGE INSERT...\n');

    // First get a valid form_id
    const { data: testForm } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no')
        .limit(1)
        .single();

    if (testForm) {
        console.log(`   Using form: ${testForm.registration_no} (${testForm.id})`);

        // Try to insert a test message
        const testMessage = {
            form_id: testForm.id,
            department_name: 'hostel',
            message: 'TEST MESSAGE - This is an automated test from verify-fixes.js',
            sender_type: 'student',
            sender_name: 'Test Script',
            sender_id: 'test-script-001',
            is_read: false
        };

        const { data: insertedMsg, error: insertError } = await supabase
            .from('no_dues_messages')
            .insert([testMessage])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Failed to insert test message:', insertError.message);
            console.log('\n⚠️ Possible causes:');
            console.log('   - RLS policies may be blocking inserts');
            console.log('   - Column mismatch or constraint violation');
            console.log('\n   Error details:', JSON.stringify(insertError, null, 2));

            if (insertError.message.includes('violates row-level security')) {
                console.log('\n⚠️ DATABASE FIX NEEDED: Add RLS policy for inserts');
                console.log('Run this SQL in Supabase:\n');
                console.log(`-- Allow anyone to insert messages (adjust as needed)
CREATE POLICY "Allow insert messages" ON no_dues_messages 
FOR INSERT WITH CHECK (true);`);
            }
        } else {
            console.log('✅ Test message inserted successfully!');
            console.log(`   Message ID: ${insertedMsg.id}`);

            // Clean up - delete test message
            await supabase.from('no_dues_messages').delete().eq('id', insertedMsg.id);
            console.log('   Test message cleaned up.');
        }
    } else {
        console.log('   ⚠️ No forms found to test with');
    }

    // 5. Check departments table
    console.log('\n🏢 5. CHECKING DEPARTMENTS...\n');

    const { data: depts, error: deptError } = await supabase
        .from('departments')
        .select('name, is_active')
        .eq('is_active', true);

    if (deptError) {
        console.error('❌ Error fetching departments:', deptError.message);
    } else {
        console.log(`✅ ${depts?.length || 0} active departments found:`);
        depts?.forEach(d => console.log(`   - ${d.name}`));
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY\n');
    console.log('If all checks show ✅, your database is ready.');
    console.log('If any show ❌ with SQL commands, run those in Supabase SQL Editor.');
    console.log('\n✨ Code fixes applied:');
    console.log('   1. ReapplyModal - form fields are now read-only');
    console.log('   2. Department Dashboard - uses is_reapplication flag for "Reapplied" display');
    console.log('   3. Admin Dashboard Service - counts reapplied using is_reapplication');
    console.log('='.repeat(60));
}

verifyFixes().catch(console.error);
