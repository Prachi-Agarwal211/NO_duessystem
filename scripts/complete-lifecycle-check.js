const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function completeLifecycleCheck() {
    console.log('🔍 COMPLETE STUDENT LIFECYCLE DEEP CHECK\n');
    console.log('='.repeat(100));

    // 1. CHECK no_dues_forms STRUCTURE AND STATUS VALUES
    console.log('\n\n📋 1. NO_DUES_FORMS - COMPLETE STRUCTURE\n');

    const { data: formSample } = await supabase
        .from('no_dues_forms')
        .select('*')
        .limit(1);

    if (formSample && formSample.length > 0) {
        console.log('ALL COLUMNS in no_dues_forms:');
        Object.keys(formSample[0]).forEach(col => {
            console.log(`  - ${col}: ${typeof formSample[0][col]} = ${JSON.stringify(formSample[0][col])?.substring(0, 80)}`);
        });
    }

    // Check all possible status values
    const { data: allForms } = await supabase
        .from('no_dues_forms')
        .select('status, reapplication_count, is_reapplication, last_reapplied_at');

    const statusValues = {};
    let reappliedForms = [];
    allForms?.forEach(f => {
        statusValues[f.status] = (statusValues[f.status] || 0) + 1;
        if (f.status === 'reapplied' || f.is_reapplication || f.reapplication_count > 0) {
            reappliedForms.push(f);
        }
    });

    console.log('\n📊 ALL STATUS VALUES IN DATABASE:');
    Object.entries(statusValues).forEach(([status, count]) => {
        console.log(`  - "${status}": ${count} forms`);
    });

    console.log('\n🔄 FORMS WITH REAPPLICATION DATA:');
    console.log(`  Total: ${reappliedForms.length}`);
    if (reappliedForms.length > 0) {
        console.log('  Sample reapplied forms:', JSON.stringify(reappliedForms.slice(0, 3), null, 2));
    }

    // 2. CHECK no_dues_status STRUCTURE
    console.log('\n\n📊 2. NO_DUES_STATUS - DEPARTMENT TRACKING\n');

    const { data: statusSample } = await supabase
        .from('no_dues_status')
        .select('*')
        .limit(1);

    if (statusSample && statusSample.length > 0) {
        console.log('ALL COLUMNS in no_dues_status:');
        Object.keys(statusSample[0]).forEach(col => {
            console.log(`  - ${col}: ${typeof statusSample[0][col]}`);
        });
    }

    // Check all status values
    const { data: allStatuses } = await supabase
        .from('no_dues_status')
        .select('status, department_name');

    const deptStatusValues = {};
    const deptBreakdown = {};
    allStatuses?.forEach(s => {
        deptStatusValues[s.status] = (deptStatusValues[s.status] || 0) + 1;
        if (!deptBreakdown[s.department_name]) {
            deptBreakdown[s.department_name] = {};
        }
        deptBreakdown[s.department_name][s.status] = (deptBreakdown[s.department_name][s.status] || 0) + 1;
    });

    console.log('\n📊 DEPARTMENT STATUS VALUES:');
    Object.entries(deptStatusValues).forEach(([status, count]) => {
        console.log(`  - "${status}": ${count}`);
    });

    console.log('\n📊 STATUS BY DEPARTMENT:');
    Object.entries(deptBreakdown).forEach(([dept, statuses]) => {
        console.log(`  ${dept}:`, statuses);
    });

    // 3. CHECK no_dues_messages (CHAT)
    console.log('\n\n💬 3. NO_DUES_MESSAGES - CHAT SYSTEM\n');

    const { data: msgSample, error: msgError, count: msgCount } = await supabase
        .from('no_dues_messages')
        .select('*', { count: 'exact' })
        .limit(5);

    if (msgError) {
        console.log('❌ Error accessing no_dues_messages:', msgError.message);
    } else {
        console.log(`Total messages in database: ${msgCount}`);

        if (msgSample && msgSample.length > 0) {
            console.log('\nALL COLUMNS in no_dues_messages:');
            Object.keys(msgSample[0]).forEach(col => {
                console.log(`  - ${col}: ${typeof msgSample[0][col]}`);
            });

            console.log('\nSample messages:');
            msgSample.forEach((m, i) => {
                console.log(`  [${i + 1}] ${JSON.stringify(m)}`);
            });
        } else {
            console.log('⚠️ NO MESSAGES FOUND IN DATABASE!');
        }
    }

    // 4. CHECK no_dues_reapplication_history
    console.log('\n\n🔄 4. NO_DUES_REAPPLICATION_HISTORY\n');

    const { data: reappHistory, count: reappCount } = await supabase
        .from('no_dues_reapplication_history')
        .select('*', { count: 'exact' })
        .limit(5);

    console.log(`Total reapplication history records: ${reappCount}`);

    if (reappHistory && reappHistory.length > 0) {
        console.log('\nALL COLUMNS in no_dues_reapplication_history:');
        Object.keys(reappHistory[0]).forEach(col => {
            console.log(`  - ${col}: ${typeof reappHistory[0][col]}`);
        });

        console.log('\nSample history:');
        console.log(JSON.stringify(reappHistory[0], null, 2));
    }

    // 5. CHECK DEPARTMENTS
    console.log('\n\n🏢 5. DEPARTMENTS\n');

    const { data: depts } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    console.log('Active departments:');
    depts?.forEach(d => {
        console.log(`  [${d.display_order}] ${d.name} (${d.display_name}) - ID: ${d.id}`);
        console.log(`       School Specific: ${d.is_school_specific}, Email: ${d.email}`);
    });

    // 6. CHECK PROFILES (Staff)
    console.log('\n\n👔 6. PROFILES (Staff) - DEPARTMENT LINKAGE\n');

    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .limit(10);

    if (profiles && profiles.length > 0) {
        console.log('ALL COLUMNS in profiles:');
        Object.keys(profiles[0]).forEach(col => {
            console.log(`  - ${col}: ${typeof profiles[0][col]}`);
        });

        console.log('\nStaff profiles (roles):');
        profiles.forEach(p => {
            console.log(`  - ${p.email}: ${p.role} (dept: ${p.department || p.department_name || 'N/A'})`);
        });
    }

    // 7. FIND A COMPLETE STUDENT LIFECYCLE EXAMPLE
    console.log('\n\n👨‍🎓 7. COMPLETE STUDENT LIFECYCLE EXAMPLE\n');

    // Find a form that has some activity
    const { data: activeForm } = await supabase
        .from('no_dues_forms')
        .select('*')
        .or('status.eq.rejected,status.eq.reapplied,status.eq.completed')
        .limit(1);

    if (activeForm && activeForm.length > 0) {
        const form = activeForm[0];
        console.log(`\n📝 Form ID: ${form.id}`);
        console.log(`   Registration: ${form.registration_no}`);
        console.log(`   Student: ${form.student_name}`);
        console.log(`   Status: ${form.status}`);
        console.log(`   Reapplication Count: ${form.reapplication_count}`);
        console.log(`   Is Reapplication: ${form.is_reapplication}`);
        console.log(`   Last Reapplied: ${form.last_reapplied_at}`);
        console.log(`   Created: ${form.created_at}`);
        console.log(`   Rejection Context:`, form.rejection_context);

        // Get department statuses for this form
        const { data: formStatuses } = await supabase
            .from('no_dues_status')
            .select('*')
            .eq('form_id', form.id);

        console.log(`\n   📊 Department Statuses (${formStatuses?.length || 0}):`);
        formStatuses?.forEach(s => {
            console.log(`      - ${s.department_name}: ${s.status} ${s.rejection_reason ? `(Reason: ${s.rejection_reason})` : ''}`);
        });

        // Get messages for this form
        const { data: formMsgs } = await supabase
            .from('no_dues_messages')
            .select('*')
            .eq('form_id', form.id);

        console.log(`\n   💬 Messages: ${formMsgs?.length || 0}`);

        // Get reapplication history
        const { data: formReappHistory } = await supabase
            .from('no_dues_reapplication_history')
            .select('*')
            .eq('form_id', form.id);

        console.log(`\n   🔄 Reapplication History: ${formReappHistory?.length || 0}`);
        if (formReappHistory && formReappHistory.length > 0) {
            formReappHistory.forEach((h, i) => {
                console.log(`      [${i + 1}] #${h.reapplication_number}: ${h.reapplication_reason} (${h.status})`);
            });
        }
    } else {
        console.log('⚠️ No active forms found (rejected/reapplied/completed)');

        // Get any form
        const { data: anyForm } = await supabase
            .from('no_dues_forms')
            .select('*')
            .limit(1);

        if (anyForm && anyForm.length > 0) {
            console.log('\nUsing a pending form instead:');
            console.log(JSON.stringify(anyForm[0], null, 2));

            const { data: formStatuses } = await supabase
                .from('no_dues_status')
                .select('*')
                .eq('form_id', anyForm[0].id);

            console.log(`\nDepartment statuses for this form: ${formStatuses?.length || 0}`);
        }
    }

    // 8. CHECK SESSION/AUTH MECHANISM
    console.log('\n\n🔐 8. SESSION/AUTH - OTP SYSTEM\n');

    const { data: otpLogs, count: otpCount } = await supabase
        .from('student_otp_logs')
        .select('*', { count: 'exact' })
        .limit(3);

    console.log(`Total OTP logs: ${otpCount}`);
    if (otpLogs && otpLogs.length > 0) {
        console.log('\nOTP Logs columns:');
        Object.keys(otpLogs[0]).forEach(col => {
            console.log(`  - ${col}: ${typeof otpLogs[0][col]}`);
        });
        console.log('\nRecent OTP entries:');
        otpLogs.forEach(o => {
            console.log(`  - ${o.registration_no || o.email}: verified=${o.is_verified}, created=${o.created_at}`);
        });
    }

    // 9. CHECK SYSTEM SETTINGS
    console.log('\n\n⚙️ 9. SYSTEM SETTINGS\n');

    const { data: settings } = await supabase
        .from('system_settings')
        .select('*');

    if (settings && settings.length > 0) {
        console.log('System settings:');
        settings.forEach(s => {
            console.log(`  - ${s.key}: ${JSON.stringify(s.value)}`);
        });
    }

    // 10. CHECK REAPPLICATION RULES
    console.log('\n\n📜 10. REAPPLICATION RULES\n');

    const { data: rules } = await supabase
        .from('config_reapplication_rules')
        .select('*');

    if (rules && rules.length > 0) {
        console.log('Reapplication rules:');
        rules.forEach(r => {
            console.log(`  - ${r.rule_type}: ${r.value} (active: ${r.is_active})`);
        });
    } else {
        console.log('⚠️ No reapplication rules configured');
    }

    console.log('\n' + '='.repeat(100));
    console.log('✅ LIFECYCLE CHECK COMPLETE\n');
}

completeLifecycleCheck();
