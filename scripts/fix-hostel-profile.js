/**
 * Fix hostel staff profile - update assigned_department_ids to match actual hostel department ID
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixHostelProfile() {
    console.log('🔧 Fixing Hostel Staff Profile...\n');

    // 1. Get the actual hostel department ID
    const { data: hostelDept } = await supabase
        .from('departments')
        .select('id, name')
        .eq('name', 'hostel')
        .single();

    if (!hostelDept) {
        console.error('❌ Hostel department not found!');
        return;
    }

    console.log(`✅ Found hostel department: ${hostelDept.id}`);

    // 2. Find hostel staff profile
    const { data: hostelStaff, error: staffError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'hostel@jecrc.edu.in')
        .single();

    if (staffError || !hostelStaff) {
        console.error('❌ Hostel staff not found!', staffError);
        return;
    }

    console.log(`📋 Current hostel staff profile:`);
    console.log(`   ID: ${hostelStaff.id}`);
    console.log(`   Email: ${hostelStaff.email}`);
    console.log(`   Department: ${hostelStaff.department_name}`);
    console.log(`   Assigned Dept IDs: ${JSON.stringify(hostelStaff.assigned_department_ids)}`);

    // 3. Update the profile with correct department ID
    const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({
            assigned_department_ids: [hostelDept.id],
            updated_at: new Date().toISOString()
        })
        .eq('id', hostelStaff.id)
        .select()
        .single();

    if (updateError) {
        console.error('❌ Failed to update profile:', updateError);
        return;
    }

    console.log(`\n✅ Updated hostel staff profile:`);
    console.log(`   Assigned Dept IDs: ${JSON.stringify(updated.assigned_department_ids)}`);
    console.log(`   Updated at: ${updated.updated_at}`);

    // 4. Verify the fix
    console.log('\n🔍 Verifying the fix...');

    // Simulate what the API does
    const { data: deptData } = await supabase
        .from('departments')
        .select('name, display_name')
        .in('id', updated.assigned_department_ids);

    console.log(`   Department lookup result: ${deptData?.length || 0} departments found`);
    deptData?.forEach(d => {
        console.log(`   - ${d.name}: ${d.display_name}`);
    });

    if (deptData && deptData.length > 0) {
        console.log('\n✅ FIX SUCCESSFUL! Hostel staff can now see forms.');
    } else {
        console.log('\n❌ Still not working - check department IDs.');
    }
}

fixHostelProfile().catch(console.error);
