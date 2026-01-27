/**
 * Debug hostel dashboard - check if Hostel department has forms assigned
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugHostelDashboard() {
    console.log('🔍 Debugging Hostel Dashboard Issues...\n');

    // 1. Check what departments exist
    console.log('📋 All Departments in Database:');
    const { data: departments } = await supabase.from('departments').select('*').order('name');
    departments?.forEach(d => {
        console.log(`   - ID: ${d.id}, Name: "${d.name}", Active: ${d.is_active}`);
    });

    // 2. Check hostel staff profile
    console.log('\n📋 Hostel Staff Profiles:');
    const { data: hostelStaff } = await supabase
        .from('profiles')
        .select('*')
        .ilike('department_name', '%hostel%');

    hostelStaff?.forEach(s => {
        console.log(`   - ID: ${s.id}`);
        console.log(`     Email: ${s.email}`);
        console.log(`     Role: ${s.role}`);
        console.log(`     Department: ${s.department_name}`);
        console.log(`     Assigned Dept IDs: ${JSON.stringify(s.assigned_department_ids)}`);
    });

    if (!hostelStaff || hostelStaff.length === 0) {
        console.log('   ⚠️ No hostel staff found!');
    }

    // 3. Check no_dues_status records for Hostel
    console.log('\n📋 Department Status Records for "Hostel":');
    const { data: hostelStatus } = await supabase
        .from('no_dues_status')
        .select('*, no_dues_forms(*)')
        .ilike('department_name', '%hostel%');

    console.log(`   Found ${hostelStatus?.length || 0} records`);
    hostelStatus?.forEach(s => {
        console.log(`   - Form ID: ${s.form_id}`);
        console.log(`     Status: ${s.status}`);
        console.log(`     Student: ${s.no_dues_forms?.student_name} (${s.no_dues_forms?.registration_no})`);
    });

    // 4. Check ALL status records
    console.log('\n📋 All Department Status Records:');
    const { data: allStatus } = await supabase.from('no_dues_status').select('*');
    console.log(`   Total: ${allStatus?.length || 0}`);
    allStatus?.forEach(s => {
        console.log(`   - Form: ${s.form_id}, Dept: "${s.department_name}", Status: ${s.status}`);
    });

    // 5. Check if form has status for each department
    console.log('\n📋 Form Statuses by Department:');
    const { data: form } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no, student_name')
        .eq('registration_no', '21BCON532')
        .single();

    if (form) {
        console.log(`   Form: ${form.registration_no} - ${form.student_name}`);
        const { data: formStatuses } = await supabase
            .from('no_dues_status')
            .select('department_name, status')
            .eq('form_id', form.id);

        formStatuses?.forEach(s => {
            console.log(`   - ${s.department_name}: ${s.status}`);
        });
    }

    // 6. Check if Hostel department has any status records at all
    console.log('\n📋 Hostel Department Statistics:');
    const hostelDepts = departments?.filter(d => d.name.toLowerCase().includes('hostel'));
    if (hostelDepts && hostelDepts.length > 0) {
        const hostelDeptIds = hostelDepts.map(d => d.id);
        console.log(`   Found ${hostelDepts.length} hostel departments`);

        const { data: hostelAllStatus } = await supabase
            .from('no_dues_status')
            .select('status')
            .in('department_name', hostelDepts.map(d => d.name));

        const pending = hostelAllStatus?.filter(s => s.status === 'pending').length || 0;
        const approved = hostelAllStatus?.filter(s => s.status === 'approved').length || 0;
        const rejected = hostelAllStatus?.filter(s => s.status === 'rejected').length || 0;

        console.log(`   Pending: ${pending}, Approved: ${approved}, Rejected: ${rejected}`);
    }
}

debugHostelDashboard().catch(console.error);
