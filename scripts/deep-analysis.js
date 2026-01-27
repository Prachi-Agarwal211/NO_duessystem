const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deepAnalysis() {
    console.log('🔍 DEEP ANALYSIS - ACTUAL TABLES\n');
    console.log('='.repeat(100));

    // 1. Check no_dues_forms (this is the main clearance table)
    console.log('\n\n📋 1. NO_DUES_FORMS (Main Clearance/Form Submission Table)\n');
    const { data: forms, error: formsError, count: formsCount } = await supabase
        .from('no_dues_forms')
        .select('*', { count: 'exact' })
        .limit(2);

    console.log(`Total forms: ${formsCount}`);
    if (forms && forms.length > 0) {
        console.log('\n📄 Sample form structure:');
        console.log(JSON.stringify(forms[0], null, 2));

        // Get status distribution
        const { data: allForms } = await supabase
            .from('no_dues_forms')
            .select('status, department_id, student_id, created_at');

        const statusDist = {};
        const deptDist = {};
        allForms?.forEach(f => {
            statusDist[f.status] = (statusDist[f.status] || 0) + 1;
            deptDist[f.department_id] = (deptDist[f.department_id] || 0) + 1;
        });

        console.log('\n📊 Status Distribution:', statusDist);
        console.log('📊 Department Distribution:', deptDist);
    }

    // 2. Check no_dues_status (status tracking)
    console.log('\n\n📊 2. NO_DUES_STATUS (Status Tracking Table)\n');
    const { data: statuses, count: statusCount } = await supabase
        .from('no_dues_status')
        .select('*', { count: 'exact' })
        .limit(2);

    console.log(`Total status records: ${statusCount}`);
    if (statuses && statuses.length > 0) {
        console.log('\n📄 Sample status structure:');
        console.log(JSON.stringify(statuses[0], null, 2));
    }

    // 3. Check no_dues_reapplication_history
    console.log('\n\n🔄 3. NO_DUES_REAPPLICATION_HISTORY (Reapplication Table)\n');
    const { data: reapps, count: reappsCount } = await supabase
        .from('no_dues_reapplication_history')
        .select('*', { count: 'exact' })
        .limit(2);

    console.log(`Total reapplications: ${reappsCount}`);
    if (reapps && reapps.length > 0) {
        console.log('\n📄 Sample reapplication structure:');
        console.log(JSON.stringify(reapps[0], null, 2));

        // Get status distribution
        const { data: allReapps } = await supabase
            .from('no_dues_reapplication_history')
            .select('status, department_id, student_id, is_resolved');

        const reappStatusDist = {};
        const resolvedDist = { resolved: 0, unresolved: 0 };
        allReapps?.forEach(r => {
            reappStatusDist[r.status] = (reappStatusDist[r.status] || 0) + 1;
            if (r.is_resolved) resolvedDist.resolved++;
            else resolvedDist.unresolved++;
        });

        console.log('\n📊 Reapplication Status Distribution:', reappStatusDist);
        console.log('📊 Resolution Distribution:', resolvedDist);
    }

    // 4. Check no_dues_messages (CHAT TABLE)
    console.log('\n\n💬 4. NO_DUES_MESSAGES (Chat/Messages Table)\n');
    const { data: messages, count: messagesCount } = await supabase
        .from('no_dues_messages')
        .select('*', { count: 'exact' })
        .limit(3);

    console.log(`Total messages: ${messagesCount}`);
    if (messages && messages.length > 0) {
        console.log('\n📄 Sample message structure:');
        console.log(JSON.stringify(messages[0], null, 2));

        // Analyze message distribution
        const { data: allMessages } = await supabase
            .from('no_dues_messages')
            .select('department_id, student_id, sender_type, created_at');

        const deptMsgDist = {};
        const senderTypeDist = {};
        allMessages?.forEach(m => {
            deptMsgDist[m.department_id] = (deptMsgDist[m.department_id] || 0) + 1;
            senderTypeDist[m.sender_type] = (senderTypeDist[m.sender_type] || 0) + 1;
        });

        console.log('\n📊 Messages per Department ID:', deptMsgDist);
        console.log('📊 Sender Type Distribution:', senderTypeDist);
    } else {
        console.log('⚠️ NO MESSAGES FOUND! Chat is empty.');
    }

    // 5. Check student_data
    console.log('\n\n👨‍🎓 5. STUDENT_DATA (Student Information)\n');
    const { data: students, count: studentsCount } = await supabase
        .from('student_data')
        .select('*', { count: 'exact' })
        .limit(1);

    console.log(`Total students: ${studentsCount}`);
    if (students && students.length > 0) {
        console.log('\n📄 Sample student structure:');
        console.log(JSON.stringify(students[0], null, 2));
    }

    // 6. Check profiles (staff profiles)
    console.log('\n\n👔 6. PROFILES (Staff/User Profiles)\n');
    const { data: profiles, count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .limit(2);

    console.log(`Total profiles: ${profilesCount}`);
    if (profiles && profiles.length > 0) {
        console.log('\n📄 Sample profile structure:');
        console.log(JSON.stringify(profiles[0], null, 2));

        // Check role distribution
        const { data: allProfiles } = await supabase
            .from('profiles')
            .select('role, email');

        const roleDist = {};
        allProfiles?.forEach(p => {
            roleDist[p.role] = (roleDist[p.role] || 0) + 1;
        });

        console.log('\n📊 Role Distribution:', roleDist);
    }

    // 7. Departments (already know structure)
    console.log('\n\n🏢 7. DEPARTMENTS\n');
    const { data: depts } = await supabase
        .from('departments')
        .select('*');

    if (depts) {
        console.log('All departments:');
        depts.forEach(d => {
            console.log(`  - ${d.id}: ${d.name} (${d.display_name}) - Active: ${d.is_active}, School Specific: ${d.is_school_specific}`);
        });
    }

    // 8. Check config_reapplication_rules
    console.log('\n\n⚙️ 8. CONFIG_REAPPLICATION_RULES\n');
    const { data: reappRules } = await supabase
        .from('config_reapplication_rules')
        .select('*');

    if (reappRules && reappRules.length > 0) {
        console.log('Reapplication rules:');
        console.log(JSON.stringify(reappRules, null, 2));
    } else {
        console.log('⚠️ No reapplication rules found!');
    }

    // 9. Check system_settings
    console.log('\n\n🔧 9. SYSTEM_SETTINGS\n');
    const { data: settings } = await supabase
        .from('system_settings')
        .select('*');

    if (settings && settings.length > 0) {
        console.log('System settings:');
        console.log(JSON.stringify(settings, null, 2));
    }

    // 10. RELATIONSHIP TEST - Get one student's complete data
    console.log('\n\n🔗 10. RELATIONSHIP TEST - ONE STUDENT\'S COMPLETE DATA\n');

    const { data: oneStudent } = await supabase
        .from('student_data')
        .select('*')
        .limit(1)
        .single();

    if (oneStudent) {
        console.log(`\n📝 Testing with Student: ${oneStudent.name || oneStudent.email || oneStudent.id}`);
        console.log(`   Student ID: ${oneStudent.id}`);

        // Get their forms
        const { data: studentForms } = await supabase
            .from('no_dues_forms')
            .select('*')
            .eq('student_id', oneStudent.id);

        console.log(`\n   📋 Forms submitted: ${studentForms?.length || 0}`);
        if (studentForms && studentForms.length > 0) {
            console.log('   Form details:');
            studentForms.forEach(f => {
                console.log(`     - Dept: ${f.department_id}, Status: ${f.status}, Created: ${f.created_at}`);
            });
        }

        // Get their reapplications
        const { data: studentReapps } = await supabase
            .from('no_dues_reapplication_history')
            .select('*')
            .eq('student_id', oneStudent.id);

        console.log(`\n   🔄 Reapplications: ${studentReapps?.length || 0}`);
        if (studentReapps && studentReapps.length > 0) {
            studentReapps.forEach(r => {
                console.log(`     - Dept: ${r.department_id}, Status: ${r.status}, Resolved: ${r.is_resolved}`);
            });
        }

        // Get their messages
        const { data: studentMessages } = await supabase
            .from('no_dues_messages')
            .select('*')
            .eq('student_id', oneStudent.id);

        console.log(`\n   💬 Messages: ${studentMessages?.length || 0}`);
        if (studentMessages && studentMessages.length > 0) {
            studentMessages.forEach(m => {
                console.log(`     - From ${m.sender_type} to Dept ${m.department_id}: "${m.message?.substring(0, 50)}..."`);
            });
        }

        // Get their status
        const { data: studentStatus } = await supabase
            .from('no_dues_status')
            .select('*')
            .eq('student_id', oneStudent.id);

        console.log(`\n   📊 Status records: ${studentStatus?.length || 0}`);
    }

    console.log('\n' + '='.repeat(100));
    console.log('✅ DEEP ANALYSIS COMPLETE\n');
}

deepAnalysis();
