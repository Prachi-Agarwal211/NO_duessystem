require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixDuplicateMscInSciences() {
    console.log('\n🔧 FIXING DUPLICATE M.Sc IN SCHOOL OF SCIENCES\n');
    console.log('='.repeat(60));

    // Find School of Sciences
    const { data: school } = await supabase
        .from('config_schools')
        .select('id, name')
        .eq('name', 'School of Sciences')
        .single();

    console.log(`\nSchool: ${school.name}\n`);

    // Get all courses in School of Sciences
    const { data: courses } = await supabase
        .from('config_courses')
        .select('id, name, display_order')
        .eq('school_id', school.id)
        .order('display_order');

    console.log('Current courses:');
    for (const c of courses) {
        const { count } = await supabase
            .from('config_branches')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', c.id);
        console.log(`  ${c.display_order}. ${c.name} - ${count} branches (ID: ${c.id})`);
    }

    // Find M.Sc courses (there might be M.Sc and M.Sc.)
    const mscCourses = courses.filter(c =>
        c.name.toLowerCase().includes('m.sc')
    );

    console.log(`\n Found ${mscCourses.length} M.Sc course(s):`);

    if (mscCourses.length <= 1) {
        console.log('   No duplicates to fix!');
        return;
    }

    // Keep the one with more branches, delete the other
    let keepCourse = null;
    let deleteCourse = null;
    let keepCount = 0;
    let deleteCount = 0;

    for (const c of mscCourses) {
        const { count } = await supabase
            .from('config_branches')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', c.id);

        console.log(`   - ${c.name} (${count} branches, ID: ${c.id})`);

        if (!keepCourse || count > keepCount) {
            if (keepCourse) {
                deleteCourse = keepCourse;
                deleteCount = keepCount;
            }
            keepCourse = c;
            keepCount = count;
        } else {
            deleteCourse = c;
            deleteCount = count;
        }
    }

    console.log(`\n📌 Keeping: ${keepCourse.name} (${keepCount} branches)`);
    console.log(`🗑️  Deleting: ${deleteCourse.name} (${deleteCount} branches)`);

    // Delete branches first
    console.log('\n   Deleting branches...');
    const { error: branchErr } = await supabase
        .from('config_branches')
        .delete()
        .eq('course_id', deleteCourse.id);

    if (branchErr) {
        console.error('   ❌ Error:', branchErr);
        return;
    }
    console.log('   ✅ Branches deleted');

    // Delete course
    console.log('   Deleting course...');
    const { error: courseErr } = await supabase
        .from('config_courses')
        .delete()
        .eq('id', deleteCourse.id);

    if (courseErr) {
        console.error('   ❌ Error:', courseErr);
        return;
    }
    console.log('   ✅ Course deleted');

    // Verify
    console.log('\n✅ FIXED! Remaining courses in School of Sciences:\n');

    const { data: remaining } = await supabase
        .from('config_courses')
        .select('id, name')
        .eq('school_id', school.id)
        .order('display_order');

    for (const c of remaining) {
        const { count } = await supabase
            .from('config_branches')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', c.id);
        console.log(`   ${c.name} - ${count} branches`);
    }

    console.log('\n');
}

fixDuplicateMscInSciences()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
