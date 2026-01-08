require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMscCourses() {
    console.log('\n🔍 Checking M.Sc courses...\n');

    // Get all courses with M.Sc in name
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
        console.error('Error:', error);
        return;
    }

    console.log('M.Sc Courses Found:\n');
    for (const c of courses) {
        console.log(`  School: ${c.config_schools?.name}`);
        console.log(`  Course: ${c.name}`);
        console.log(`  ID: ${c.id}`);

        // Get branch count
        const { count } = await supabase
            .from('config_branches')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', c.id);

        console.log(`  Branches: ${count}`);
        console.log('  ---');
    }
}

checkMscCourses().then(() => process.exit(0));
