require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// The M.Sc course in Jaipur School of Design that needs to be removed
// We'll keep only the one in School of Sciences

async function removeDuplicateMsc() {
    console.log('\n🔍 Finding M.Sc courses...\n');

    // Get all M.Sc courses
    const { data: courses, error } = await supabase
        .from('config_courses')
        .select(`
      id, 
      name, 
      school_id,
      config_schools (name)
    `)
        .ilike('name', '%M.Sc%');

    if (error) {
        console.error('Error fetching courses:', error);
        return;
    }

    console.log('M.Sc Courses Found:\n');
    for (const c of courses) {
        const { count } = await supabase
            .from('config_branches')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', c.id);

        console.log(`  School: ${c.config_schools?.name}`);
        console.log(`  Course: ${c.name}`);
        console.log(`  ID: ${c.id}`);
        console.log(`  Branches: ${count}`);
        console.log('  ---');
    }

    // Find the M.Sc in Jaipur School of Design (the one to remove)
    const designMsc = courses.find(c =>
        c.config_schools?.name === 'Jaipur School of Design' &&
        c.name.includes('M.Sc')
    );

    if (!designMsc) {
        console.log('\n✅ No M.Sc in Jaipur School of Design found. Nothing to remove.');
        return;
    }

    console.log(`\n🗑️  Removing M.Sc from Jaipur School of Design (ID: ${designMsc.id})...`);

    // First delete branches for this course
    const { error: branchErr } = await supabase
        .from('config_branches')
        .delete()
        .eq('course_id', designMsc.id);

    if (branchErr) {
        console.error('Error deleting branches:', branchErr);
        return;
    }
    console.log('   ✅ Branches deleted');

    // Then delete the course
    const { error: courseErr } = await supabase
        .from('config_courses')
        .delete()
        .eq('id', designMsc.id);

    if (courseErr) {
        console.error('Error deleting course:', courseErr);
        return;
    }
    console.log('   ✅ Course deleted');

    // Verify
    console.log('\n🔍 Verifying remaining M.Sc courses...\n');

    const { data: remaining } = await supabase
        .from('config_courses')
        .select(`
      id, 
      name, 
      config_schools (name)
    `)
        .ilike('name', '%M.Sc%');

    for (const c of remaining) {
        const { count } = await supabase
            .from('config_branches')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', c.id);

        console.log(`  ✅ ${c.config_schools?.name} -> ${c.name} (${count} branches)`);
    }

    console.log('\n✅ Duplicate M.Sc removed. Only School of Sciences M.Sc remains.\n');
}

removeDuplicateMsc().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
