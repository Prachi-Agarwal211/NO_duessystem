const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deepDatabaseCheck() {
    console.log('🔍 DEEP DATABASE CHECK - NO DUES APPLICATION\n');
    console.log('='.repeat(80));

    try {
        // 1. CHECK ALL TABLES
        console.log('\n📊 1. CHECKING ALL TABLES AND THEIR STRUCTURE\n');

        const tables = [
            'students',
            'departments',
            'clearance_requests',
            'reapplications',
            'department_messages',
            'config',
            'staff_profiles'
        ];

        for (const table of tables) {
            console.log(`\n--- TABLE: ${table} ---`);
            const { data, error, count } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: false })
                .limit(3);

            if (error) {
                console.log(`❌ Error accessing ${table}:`, error.message);
            } else {
                console.log(`✅ Row count: ${count}`);
                if (data && data.length > 0) {
                    console.log(`📋 Columns: ${Object.keys(data[0]).join(', ')}`);
                    console.log(`📄 Sample data (first record):`, JSON.stringify(data[0], null, 2));
                }
            }
        }

        // 2. CHECK CLEARANCE REQUESTS STRUCTURE
        console.log('\n\n📋 2. CLEARANCE REQUESTS DETAILED ANALYSIS\n');
        const { data: requests, error: reqError } = await supabase
            .from('clearance_requests')
            .select('*')
            .limit(5);

        if (requests && requests.length > 0) {
            console.log('Sample clearance request structure:');
            console.log(JSON.stringify(requests[0], null, 2));

            // Check status distribution
            const { data: statusData } = await supabase
                .from('clearance_requests')
                .select('status, department');

            const statusCount = {};
            const deptCount = {};
            statusData?.forEach(r => {
                statusCount[r.status] = (statusCount[r.status] || 0) + 1;
                deptCount[r.department] = (deptCount[r.department] || 0) + 1;
            });

            console.log('\n📊 Status Distribution:', statusCount);
            console.log('📊 Department Distribution:', deptCount);
        }

        // 3. CHECK REAPPLICATIONS
        console.log('\n\n🔄 3. REAPPLICATIONS ANALYSIS\n');
        const { data: reapps, error: reappError, count: reappCount } = await supabase
            .from('reapplications')
            .select('*', { count: 'exact' })
            .limit(5);

        console.log(`Total reapplications: ${reappCount}`);
        if (reapps && reapps.length > 0) {
            console.log('Sample reapplication structure:');
            console.log(JSON.stringify(reapps[0], null, 2));

            // Check reapplication status
            const { data: reappStatus } = await supabase
                .from('reapplications')
                .select('status, department, student_id');

            const reappStatusCount = {};
            reappStatus?.forEach(r => {
                reappStatusCount[r.status] = (reappStatusCount[r.status] || 0) + 1;
            });

            console.log('\n📊 Reapplication Status Distribution:', reappStatusCount);
        }

        // 4. CHECK DEPARTMENT MESSAGES (CHAT)
        console.log('\n\n💬 4. DEPARTMENT MESSAGES (CHAT) ANALYSIS\n');
        const { data: messages, error: msgError, count: msgCount } = await supabase
            .from('department_messages')
            .select('*', { count: 'exact' })
            .limit(5);

        console.log(`Total messages: ${msgCount}`);
        if (messages && messages.length > 0) {
            console.log('Sample message structure:');
            console.log(JSON.stringify(messages[0], null, 2));

            // Check which departments have messages
            const { data: msgDepts } = await supabase
                .from('department_messages')
                .select('department, student_id, sender_type');

            const deptMsgCount = {};
            const senderTypeCount = {};
            msgDepts?.forEach(m => {
                deptMsgCount[m.department] = (deptMsgCount[m.department] || 0) + 1;
                senderTypeCount[m.sender_type] = (senderTypeCount[m.sender_type] || 0) + 1;
            });

            console.log('\n📊 Messages per Department:', deptMsgCount);
            console.log('📊 Messages by Sender Type:', senderTypeCount);
        } else {
            console.log('⚠️ No messages found in database!');
        }

        // 5. CHECK STUDENTS
        console.log('\n\n👨‍🎓 5. STUDENTS TABLE ANALYSIS\n');
        const { data: students, count: studentCount } = await supabase
            .from('students')
            .select('*', { count: 'exact' })
            .limit(3);

        console.log(`Total students: ${studentCount}`);
        if (students && students.length > 0) {
            console.log('Sample student structure:');
            console.log(JSON.stringify(students[0], null, 2));
        }

        // 6. CHECK DEPARTMENTS
        console.log('\n\n🏢 6. DEPARTMENTS TABLE ANALYSIS\n');
        const { data: depts } = await supabase
            .from('departments')
            .select('*');

        if (depts && depts.length > 0) {
            console.log('All departments:');
            depts.forEach(d => {
                console.log(`  - ${d.id}: ${d.name} (is_active: ${d.is_active})`);
            });
        }

        // 7. CHECK CONFIG
        console.log('\n\n⚙️ 7. CONFIG TABLE ANALYSIS\n');
        const { data: config } = await supabase
            .from('config')
            .select('*');

        if (config && config.length > 0) {
            console.log('Configuration settings:');
            console.log(JSON.stringify(config, null, 2));
        }

        // 8. CHECK RELATIONSHIPS
        console.log('\n\n🔗 8. CHECKING DATA RELATIONSHIPS\n');

        // Get a sample student with their clearance requests
        const { data: sampleStudent } = await supabase
            .from('students')
            .select('*')
            .limit(1)
            .single();

        if (sampleStudent) {
            console.log(`Sample Student ID: ${sampleStudent.id}`);

            const { data: studentRequests } = await supabase
                .from('clearance_requests')
                .select('*')
                .eq('student_id', sampleStudent.id);

            console.log(`Clearance requests for this student: ${studentRequests?.length || 0}`);

            const { data: studentReapps } = await supabase
                .from('reapplications')
                .select('*')
                .eq('student_id', sampleStudent.id);

            console.log(`Reapplications for this student: ${studentReapps?.length || 0}`);

            const { data: studentMsgs } = await supabase
                .from('department_messages')
                .select('*')
                .eq('student_id', sampleStudent.id);

            console.log(`Messages for this student: ${studentMsgs?.length || 0}`);
        }

        console.log('\n' + '='.repeat(80));
        console.log('✅ DATABASE CHECK COMPLETE\n');

    } catch (error) {
        console.error('❌ Fatal error:', error);
    }
}

deepDatabaseCheck();
