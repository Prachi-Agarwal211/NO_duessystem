require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchoolOfSciences() {
    console.log('\n🔍 SCHOOL OF SCIENCES - ALL COURSES\n');
    console.log('='.repeat(60));

    // Find School of Sciences
    const { data: school } = await supabase
        .from('config_schools')
        .select('id, name')
        .eq('name', 'School of Sciences')
        .single();

    if (!school) {
        console.log('School not found!');
        return;
    }

    console.log(`\nSchool: ${school.name}`);
    console.log(`ID: ${school.id}\n`);

    // Get all courses in School of Sciences
    const { data: courses } = await supabase
        .from('config_courses')
        .select('id, name, display_order')
        .eq('school_id', school.id)
        .order('display_order');

    console.log('Courses:\n');
    for (const c of courses) {
        const { count } = await supabase
            .from('config_branches')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', c.id);

        console.log(`  ${c.display_order}. ${c.name}`);
        console.log(`     ID: ${c.id}`);
        console.log(`     Branches: ${count}`);

        // Get branch names
        const { data: branches } = await supabase
            .from('config_branches')
            .select('name')
            .eq('course_id', c.id)
            .order('display_order');

        if (branches && branches.length > 0) {
            console.log(`     Branch names: ${branches.map(b => b.name).join(', ')}`);
        }
        console.log('');
    }

    // Check for duplicates
    const courseNames = courses.map(c => c.name.toLowerCase().trim());
    const duplicates = courseNames.filter((name, idx) => courseNames.indexOf(name) !== idx);

    if (duplicates.length > 0) {
        console.log('='.repeat(60));
        console.log('⚠️  DUPLICATE COURSES FOUND:');
        console.log('   ' + [...new Set(duplicates)].join(', '));
        console.log('='.repeat(60));
    } else {
        console.log('='.repeat(60));
        console.log('✅ No duplicate course names found');
        console.log('='.repeat(60));
    }
}

checkSchoolOfSciences()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
