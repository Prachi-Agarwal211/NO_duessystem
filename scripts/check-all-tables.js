const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllTables() {
    console.log('🔍 COMPREHENSIVE DATABASE VERIFICATION\n');
    console.log('========================================\n');

    const checks = [];

    // 1. Check no_dues_forms table
    console.log('📋 1. CHECKING no_dues_forms TABLE...');
    try {
        const { data, error } = await supabase
            .from('no_dues_forms')
            .select('id, registration_no, status, is_reapplication, reapplication_count, last_reapplied_at, unread_count, department_unread_counts')
            .limit(1);

        if (error) {
            console.error('   ❌ ERROR:', error.message);
            checks.push({ table: 'no_dues_forms', status: 'ERROR', error: error.message });
        } else {
            console.log('   ✅ All columns present');
            console.log('   📊 Sample:', data);
            checks.push({ table: 'no_dues_forms', status: 'OK' });
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
        checks.push({ table: 'no_dues_forms', status: 'EXCEPTION', error: err.message });
    }

    // 2. Check no_dues_status table
    console.log('\n📋 2. CHECKING no_dues_status TABLE...');
    try {
        const { data, error } = await supabase
            .from('no_dues_status')
            .select('id, form_id, department_name, status, action_at, action_by_user_id, rejection_reason, rejection_count, unread_count')
            .limit(1);

        if (error) {
            console.error('   ❌ ERROR:', error.message);
            checks.push({ table: 'no_dues_status', status: 'ERROR', error: error.message });
        } else {
            console.log('   ✅ All columns present');
            checks.push({ table: 'no_dues_status', status: 'OK' });
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
        checks.push({ table: 'no_dues_status', status: 'EXCEPTION', error: err.message });
    }

    // 3. Check no_dues_messages table
    console.log('\n📋 3. CHECKING no_dues_messages TABLE...');
    try {
        const { data, error } = await supabase
            .from('no_dues_messages')
            .select('id, form_id, department_name, message, sender_type, sender_name, sender_id, is_read, created_at')
            .limit(1);

        if (error) {
            console.error('   ❌ ERROR:', error.message);
            checks.push({ table: 'no_dues_messages', status: 'ERROR', error: error.message });
        } else {
            console.log('   ✅ All columns present');
            checks.push({ table: 'no_dues_messages', status: 'OK' });
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
        checks.push({ table: 'no_dues_messages', status: 'EXCEPTION', error: err.message });
    }

    // 4. Check profiles table
    console.log('\n📋 4. CHECKING profiles TABLE...');
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, department_name, assigned_department_ids, school_ids, course_ids, branch_ids, is_active, created_at, updated_at, last_active_at')
            .limit(1);

        if (error) {
            console.error('   ❌ ERROR:', error.message);
            checks.push({ table: 'profiles', status: 'ERROR', error: error.message });
        } else {
            console.log('   ✅ All columns present');
            checks.push({ table: 'profiles', status: 'OK' });
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
        checks.push({ table: 'profiles', status: 'EXCEPTION', error: err.message });
    }

    // 5. Check departments table
    console.log('\n📋 5. CHECKING departments TABLE...');
    try {
        const { data, error } = await supabase
            .from('departments')
            .select('id, name, display_name, is_active, is_school_specific, allowed_school_ids, allowed_course_ids, allowed_branch_ids, email, display_order')
            .limit(1);

        if (error) {
            console.error('   ❌ ERROR:', error.message);
            checks.push({ table: 'departments', status: 'ERROR', error: error.message });
        } else {
            console.log('   ✅ All columns present');
            checks.push({ table: 'departments', status: 'OK' });
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
        checks.push({ table: 'departments', status: 'EXCEPTION', error: err.message });
    }

    // 6. Check student_data table
    console.log('\n📋 6. CHECKING student_data TABLE...');
    try {
        const { data, error, count } = await supabase
            .from('student_data')
            .select('*', { count: 'exact' })
            .limit(1);

        if (error) {
            console.error('   ❌ ERROR:', error.message);
            checks.push({ table: 'student_data', status: 'ERROR', error: error.message });
        } else {
            console.log('   ✅ Table accessible, Total students:', count);
            checks.push({ table: 'student_data', status: 'OK', count });
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
        checks.push({ table: 'student_data', status: 'EXCEPTION', error: err.message });
    }

    // 7. Check no_dues_reapplication_history table
    console.log('\n📋 7. CHECKING no_dues_reapplication_history TABLE...');
    try {
        const { data, error } = await supabase
            .from('no_dues_reapplication_history')
            .select('id, form_id, reapplication_number, department_name, student_reply_message, edited_fields, previous_status, created_at')
            .limit(1);

        if (error) {
            console.error('   ❌ ERROR:', error.message);
            checks.push({ table: 'no_dues_reapplication_history', status: 'ERROR', error: error.message });
        } else {
            console.log('   ✅ All columns present');
            checks.push({ table: 'no_dues_reapplication_history', status: 'OK' });
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
        checks.push({ table: 'no_dues_reapplication_history', status: 'EXCEPTION', error: err.message });
    }

    // 8. Check support_tickets table
    console.log('\n📋 8. CHECKING support_tickets TABLE...');
    try {
        const { data, error } = await supabase
            .from('support_tickets')
            .select('id, form_id, student_name, student_email, registration_no, category, subject, description, priority, status, assigned_to, created_at, updated_at')
            .limit(1);

        if (error) {
            console.error('   ❌ ERROR:', error.message);
            checks.push({ table: 'support_tickets', status: 'ERROR', error: error.message });
        } else {
            console.log('   ✅ All columns present');
            checks.push({ table: 'support_tickets', status: 'OK' });
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
        checks.push({ table: 'support_tickets', status: 'EXCEPTION', error: err.message });
    }

    // 9. Check system_settings
    console.log('\n📋 9. CHECKING system_settings TABLE...');
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('key, value, description, updated_at')
            .limit(1);

        if (error) {
            console.error('   ❌ ERROR:', error.message);
            checks.push({ table: 'system_settings', status: 'ERROR', error: error.message });
        } else {
            console.log('   ✅ All columns present');
            checks.push({ table: 'system_settings', status: 'OK' });
        }
    } catch (err) {
        console.error('   ❌ EXCEPTION:', err.message);
        checks.push({ table: 'system_settings', status: 'EXCEPTION', error: err.message });
    }

    // Summary
    console.log('\n========================================');
    console.log('📊 VERIFICATION SUMMARY\n');

    const errors = checks.filter(c => c.status === 'ERROR' || c.status === 'EXCEPTION');
    const ok = checks.filter(c => c.status === 'OK');

    console.log(`✅ OK: ${ok.length}/${checks.length}`);
    console.log(`❌ ERRORS: ${errors.length}/${checks.length}`);

    if (errors.length > 0) {
        console.log('\n❌ TABLES WITH ERRORS:');
        errors.forEach(e => {
            console.log(`   - ${e.table}: ${e.error}`);
        });
    }

    console.log('\n========================================');

    return checks;
}

checkAllTables();
