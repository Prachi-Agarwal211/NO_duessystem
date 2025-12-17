/**
 * Map Existing Profiles to Departments
 *
 * This script maps the existing profiles to the departments table
 * to ensure the rejection logic works correctly.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function mapExistingProfiles() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║     MAP EXISTING PROFILES TO DEPARTMENTS                   ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    try {
        // Get all existing profiles
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, department_name')
            .in('role', ['admin', 'department']);

        if (profilesError) {
            console.error('❌ Error fetching profiles:', profilesError.message);
            return;
        }

        console.log(`📋 Found ${profiles.length} profiles\n`);

        // Get all departments
        const { data: departments, error: deptError } = await supabase
            .from('departments')
            .select('name, display_name, email')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (deptError) {
            console.error('❌ Error fetching departments:', deptError.message);
            return;
        }

        console.log(`📋 Found ${departments.length} active departments\n`);

        // Map profiles to departments
        const results = {
            mapped: [],
            unmapped: [],
            errors: []
        };

        for (const profile of profiles) {
            console.log(`📧 Processing: ${profile.email}`);

            // Skip admin profiles
            if (profile.role === 'admin') {
                console.log(`   ℹ️  Admin profile - no department mapping needed`);
                results.unmapped.push(profile);
                continue;
            }

            // Find department by email
            const department = departments.find(dept =>
                dept.email && dept.email.toLowerCase() === profile.email.toLowerCase()
            );

            if (department) {
                console.log(`   ✅ Found matching department: ${department.display_name}`);

                // Update profile with department name
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ department_name: department.name })
                    .eq('id', profile.id);

                if (updateError) {
                    console.error(`   ❌ Error updating profile: ${updateError.message}`);
                    results.errors.push({ email: profile.email, error: updateError.message });
                } else {
                    console.log(`   ✅ Profile mapped to department: ${department.name}`);
                    results.mapped.push(profile);
                }
            } else {
                console.log(`   ⚠️  No matching department found for email: ${profile.email}`);
                results.unmapped.push(profile);
            }
        }

        // Print summary
        console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║                    MAPPING SUMMARY                         ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        if (results.mapped.length > 0) {
            console.log('✅ Profiles Mapped:');
            console.log('─'.repeat(70));
            results.mapped.forEach(profile => console.log(`   ✓ ${profile.email} → ${profile.department_name}`));
            console.log('─'.repeat(70));
        }

        if (results.unmapped.length > 0) {
            console.log('\n⚠️  Unmapped Profiles:');
            console.log('─'.repeat(70));
            results.unmapped.forEach(profile => console.log(`   ⊘ ${profile.email} (${profile.role})`));
            console.log('─'.repeat(70));
        }

        if (results.errors.length > 0) {
            console.log('\n❌ Errors:');
            console.log('─'.repeat(70));
            results.errors.forEach(err => console.log(`   ✗ ${err.email}: ${err.error}`));
            console.log('─'.repeat(70));
        }

        console.log('\n📊 Statistics:');
        console.log(`   Mapped: ${results.mapped.length}`);
        console.log(`   Unmapped: ${results.unmapped.length}`);
        console.log(`   Errors: ${results.errors.length}`);
        console.log(`   Total Processed: ${profiles.length}\n`);

        // Verify final count
        const { data: updatedProfiles, error: verifyError } = await supabase
            .from('profiles')
            .select('email, role, department_name')
            .in('role', ['admin', 'department']);

        if (!verifyError) {
            console.log('╔═══════════════════════════════════════════════════════════╗');
            console.log('║              FINAL VERIFICATION                           ║');
            console.log('╚═══════════════════════════════════════════════════════════╝\n');
            console.log(`✅ Total profiles in database: ${updatedProfiles.length}`);

            const admin = updatedProfiles.filter(p => p.role === 'admin').length;
            const dept = updatedProfiles.filter(p => p.role === 'department').length;
            const mappedDept = updatedProfiles.filter(p => p.role === 'department' && p.department_name).length;

            console.log(`   - Admin: ${admin}`);
            console.log(`   - Department Staff: ${dept}`);
            console.log(`   - Mapped Department Staff: ${mappedDept}`);

            if (mappedDept === dept) {
                console.log('\n🎉 SUCCESS! All department profiles mapped to departments!\n');
            } else {
                console.log(`\n⚠️  WARNING: ${dept - mappedDept} department profiles not mapped\n`);
            }
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        throw error;
    }
}

mapExistingProfiles()
    .then(() => {
        console.log('✅ Mapping completed successfully\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Mapping failed:', error);
        process.exit(1);
    });