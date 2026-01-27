const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateFinalReport() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     FINAL VERIFICATION REPORT - NO DUES SYSTEM            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const report = {
        timestamp: new Date().toISOString(),
        criticalIssues: [],
        warnings: [],
        working: [],
        database: {},
        api: {},
        frontend: {}
    };

    // ============================================
    // DATABASE SCHEMA VERIFICATION
    // ============================================
    console.log('📊 SECTION 1: DATABASE SCHEMA VERIFICATION\n');
    console.log('─────────────────────────────────────────\n');

    // Check 1: no_dues_forms
    console.log('1️⃣  no_dues_forms TABLE');
    try {
        const { data, error } = await supabase
            .from('no_dues_forms')
            .select('id, registration_no, status, is_reapplication, reapplication_count, last_reapplied_at, rejection_reason, rejection_context, final_certificate_generated, certificate_url, unread_count, department_unread_counts')
            .limit(1);

        if (error) {
            console.log('   ❌ FAILED:', error.message);
            report.criticalIssues.push({ component: 'no_dues_forms', error: error.message });
        } else {
            console.log('   ✅ ALL COLUMNS PRESENT');
            console.log('   📋 Columns verified: is_reapplication, reapplication_count, last_reapplied_at, rejection_context, unread_count, department_unread_counts');
            report.working.push('no_dues_forms table schema');
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
        report.criticalIssues.push({ component: 'no_dues_forms', error: err.message });
    }

    // Check 2: no_dues_status
    console.log('\n2️⃣  no_dues_status TABLE');
    try {
        const { data, error } = await supabase
            .from('no_dues_status')
            .select('id, form_id, department_name, status, action_at, action_by, action_by_user_id, remarks, rejection_reason, rejection_count, unread_count, student_reply_message')
            .limit(1);

        if (error) {
            console.log('   ❌ FAILED:', error.message);
            report.criticalIssues.push({ component: 'no_dues_status', error: error.message });
        } else {
            console.log('   ✅ ALL COLUMNS PRESENT');
            console.log('   📋 Columns verified: action_by_user_id, rejection_count, unread_count');
            report.working.push('no_dues_status table schema');
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
        report.criticalIssues.push({ component: 'no_dues_status', error: err.message });
    }

    // Check 3: profiles - CRITICAL
    console.log('\n3️⃣  profiles TABLE (CRITICAL)');
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, department_name, assigned_department_ids, school_ids, course_ids, branch_ids, is_active, last_active_at')
            .limit(1);

        if (error) {
            console.log('   ❌ CRITICAL ERROR:', error.message);
            console.log('   🔴 This breaks: /api/staff/profile, /api/admin/staff/[id]');
            report.criticalIssues.push({
                component: 'profiles.last_active_at',
                error: error.message,
                impact: 'Staff profile APIs will fail',
                fix: 'Run: ALTER TABLE profiles ADD COLUMN last_active_at TIMESTAMPTZ;'
            });
        } else {
            console.log('   ✅ ALL COLUMNS PRESENT');
            report.working.push('profiles table schema');
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
        report.criticalIssues.push({ component: 'profiles', error: err.message });
    }

    // Check 4: no_dues_messages
    console.log('\n4️⃣  no_dues_messages TABLE');
    try {
        const { data, error } = await supabase
            .from('no_dues_messages')
            .select('id, form_id, department_name, message, sender_type, sender_name, sender_id, is_read, read_at, created_at')
            .limit(1);

        if (error) {
            console.log('   ❌ FAILED:', error.message);
            report.criticalIssues.push({ component: 'no_dues_messages', error: error.message });
        } else {
            console.log('   ✅ ALL COLUMNS PRESENT');
            report.working.push('no_dues_messages table schema');
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
        report.criticalIssues.push({ component: 'no_dues_messages', error: err.message });
    }

    // Check 5: support_tickets
    console.log('\n5️⃣  support_tickets TABLE');
    try {
        const { data, error } = await supabase
            .from('support_tickets')
            .select('id, form_id, student_name, student_email, registration_no, category, subject, description, priority, status, assigned_to, resolution_notes, created_at, updated_at, resolved_at')
            .limit(1);

        if (error) {
            console.log('   ⚠️  WARNING:', error.message);
            console.log('   🟡 This may affect: Support ticket creation');
            report.warnings.push({
                component: 'support_tickets.student_email',
                error: error.message,
                impact: 'Support ticket APIs may fail',
                fix: 'Run: ALTER TABLE support_tickets ADD COLUMN student_email TEXT;'
            });
        } else {
            console.log('   ✅ ALL COLUMNS PRESENT');
            report.working.push('support_tickets table schema');
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
        report.warnings.push({ component: 'support_tickets', error: err.message });
    }

    // Check 6: departments
    console.log('\n6️⃣  departments TABLE');
    try {
        const { data, error } = await supabase
            .from('departments')
            .select('id, name, display_name, is_active, is_school_specific, allowed_school_ids, allowed_course_ids, allowed_branch_ids, email, display_order')
            .limit(1);

        if (error) {
            console.log('   ❌ FAILED:', error.message);
            report.criticalIssues.push({ component: 'departments', error: error.message });
        } else {
            console.log('   ✅ ALL COLUMNS PRESENT');
            report.working.push('departments table schema');
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
        report.criticalIssues.push({ component: 'departments', error: err.message });
    }

    // Check 7: student_data
    console.log('\n7️⃣  student_data TABLE');
    try {
        const { data, error, count } = await supabase
            .from('student_data')
            .select('*', { count: 'exact' })
            .limit(1);

        if (error) {
            console.log('   ❌ FAILED:', error.message);
            report.criticalIssues.push({ component: 'student_data', error: error.message });
        } else {
            console.log('   ✅ TABLE ACCESSIBLE');
            console.log('   📊 Total students:', count);
            report.working.push(`student_data table (${count} records)`);
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
        report.criticalIssues.push({ component: 'student_data', error: err.message });
    }

    // ============================================
    // API ENDPOINT VERIFICATION
    // ============================================
    console.log('\n\n📊 SECTION 2: API ENDPOINT VERIFICATION\n');
    console.log('─────────────────────────────────────────\n');

    // Test 1: Staff Dashboard Query Pattern
    console.log('1️⃣  Staff Dashboard Query Pattern');
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('assigned_department_ids, school_ids, course_ids, branch_ids, department_name')
            .limit(1)
            .single();

        const myDeptNames = [profile.department_name];

        const { data: applications, error } = await supabase
            .from('no_dues_status')
            .select(`
                id,
                department_name,
                status,
                no_dues_forms!inner (
                    id, registration_no, student_name, course, branch, created_at, status, school_id
                )
            `)
            .in('department_name', myDeptNames)
            .eq('status', 'pending')
            .limit(1);

        if (error) {
            console.log('   ❌ FAILED:', error.message);
            report.criticalIssues.push({ component: 'API: Staff Dashboard', error: error.message });
        } else {
            console.log('   ✅ QUERY PATTERN WORKS');
            report.working.push('Staff Dashboard API query pattern');
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
        report.criticalIssues.push({ component: 'API: Staff Dashboard', error: err.message });
    }

    // Test 2: Staff Action Query Pattern
    console.log('\n2️⃣  Staff Action Query Pattern');
    try {
        const { data: form } = await supabase
            .from('no_dues_forms')
            .select('id')
            .limit(1)
            .single();

        const { data: status, error } = await supabase
            .from('no_dues_status')
            .select('id, status, department_name')
            .eq('form_id', form.id)
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.log('   ❌ FAILED:', error.message);
            report.criticalIssues.push({ component: 'API: Staff Action', error: error.message });
        } else {
            console.log('   ✅ QUERY PATTERN WORKS');
            report.working.push('Staff Action API query pattern');
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
        report.criticalIssues.push({ component: 'API: Staff Action', error: err.message });
    }

    // Test 3: Student Submission Query Pattern
    console.log('\n3️⃣  Student Submission Query Pattern');
    try {
        const { data, error } = await supabase
            .from('student_data')
            .select('registration_no, student_name, school_id, course_id, branch_id')
            .eq('registration_no', '21BCON532')
            .single();

        if (error) {
            console.log('   ❌ FAILED:', error.message);
            report.criticalIssues.push({ component: 'API: Student Submission', error: error.message });
        } else {
            console.log('   ✅ QUERY PATTERN WORKS');
            report.working.push('Student Submission API query pattern');
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
        report.criticalIssues.push({ component: 'API: Student Submission', error: err.message });
    }

    // Test 4: Reapplication Query Pattern
    console.log('\n4️⃣  Reapplication Query Pattern');
    try {
        const { data: form } = await supabase
            .from('no_dues_forms')
            .select('id, status, reapplication_count')
            .limit(1)
            .single();

        const { error: historyError } = await supabase
            .from('no_dues_reapplication_history')
            .select('*')
            .eq('form_id', form.id)
            .limit(1);

        if (historyError) {
            console.log('   ❌ FAILED:', historyError.message);
            report.criticalIssues.push({ component: 'API: Reapplication', error: historyError.message });
        } else {
            console.log('   ✅ QUERY PATTERN WORKS');
            report.working.push('Reapplication API query pattern');
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
        report.criticalIssues.push({ component: 'API: Reapplication', error: err.message });
    }

    // ============================================
    // DATA CONSISTENCY CHECK
    // ============================================
    console.log('\n\n📊 SECTION 3: DATA CONSISTENCY CHECK\n');
    console.log('─────────────────────────────────────────\n');

    // Check forms count
    console.log('1️⃣  Forms Count');
    try {
        const { count, error } = await supabase
            .from('no_dues_forms')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.log('   ❌ FAILED:', error.message);
        } else {
            console.log('   ✅ Total forms:', count);
            report.database.formsCount = count;
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
    }

    // Check status records
    console.log('\n2️⃣  Status Records Count');
    try {
        const { count, error } = await supabase
            .from('no_dues_status')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.log('   ❌ FAILED:', error.message);
        } else {
            console.log('   ✅ Total status records:', count);
            report.database.statusCount = count;
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
    }

    // Check messages count
    console.log('\n3️⃣  Messages Count');
    try {
        const { count, error } = await supabase
            .from('no_dues_messages')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.log('   ❌ FAILED:', error.message);
        } else {
            console.log('   ✅ Total messages:', count);
            if (count === 0) {
                report.warnings.push({ component: 'Chat System', message: 'No messages in database - chat is empty' });
            }
            report.database.messagesCount = count;
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
    }

    // Check departments
    console.log('\n4️⃣  Departments Configuration');
    try {
        const { data, error } = await supabase
            .from('departments')
            .select('name, display_name, is_active, is_school_specific');

        if (error) {
            console.log('   ❌ FAILED:', error.message);
        } else {
            console.log('   ✅ Active departments:', data.length);
            data.forEach(d => {
                console.log(`      - ${d.name} (${d.display_name}) - Active: ${d.is_active}, School Specific: ${d.is_school_specific}`);
            });
            report.database.departments = data;
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
    }

    // Check staff profiles
    console.log('\n5️⃣  Staff Profiles');
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('email, role, department_name, assigned_department_ids')
            .eq('role', 'department');

        if (error) {
            console.log('   ❌ FAILED:', error.message);
        } else {
            console.log('   ✅ Department staff:', data.length);
            data.forEach(p => {
                console.log(`      - ${p.email} (${p.department_name})`);
            });
            report.database.staffProfiles = data;
        }
    } catch (err) {
        console.log('   ❌ EXCEPTION:', err.message);
    }

    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                     FINAL SUMMARY                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('🔴 CRITICAL ISSUES (MUST FIX):');
    console.log('─────────────────────────────────────────');
    if (report.criticalIssues.length === 0) {
        console.log('   ✅ No critical issues found!\n');
    } else {
        report.criticalIssues.forEach((issue, i) => {
            console.log(`   ${i + 1}. ${issue.component}`);
            console.log(`      Error: ${issue.error}`);
            if (issue.impact) console.log(`      Impact: ${issue.impact}`);
            if (issue.fix) console.log(`      Fix: ${issue.fix}`);
            console.log('');
        });
    }

    console.log('🟡 WARNINGS (SHOULD FIX):');
    console.log('─────────────────────────────────────────');
    if (report.warnings.length === 0) {
        console.log('   ✅ No warnings\n');
    } else {
        report.warnings.forEach((warning, i) => {
            console.log(`   ${i + 1}. ${warning.component}`);
            console.log(`      Issue: ${warning.error || warning.message}`);
            if (warning.impact) console.log(`      Impact: ${warning.impact}`);
            if (warning.fix) console.log(`      Fix: ${warning.fix}`);
            console.log('');
        });
    }

    console.log('✅ WORKING COMPONENTS:');
    console.log('─────────────────────────────────────────');
    report.working.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item}`);
    });

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  END OF REPORT                                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    return report;
}

generateFinalReport().then(report => {
    // Save report to file
    const fs = require('fs');
    fs.writeFileSync('verification_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Full report saved to: verification_report.json');
}).catch(err => {
    console.error('Report generation failed:', err);
});
