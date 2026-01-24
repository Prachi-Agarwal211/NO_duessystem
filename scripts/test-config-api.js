/**
 * Test Public Config API Logic
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConfigAPI() {
    console.log('🧪 Testing Config API Data...\n');

    try {
        // 1. Fetch schools
        const { data: schools, error: schoolsError } = await supabase
            .from('config_schools')
            .select('id, name, display_order')
            .eq('is_active', true)
            .order('display_order');

        if (schoolsError) throw schoolsError;
        console.log(`✅ Schools found: ${schools.length}`);
        if (schools.length > 0) console.log('   Sample:', schools[0].name);

        // 2. Fetch courses
        const { data: courses, error: coursesError } = await supabase
            .from('config_courses')
            .select('id, school_id, name, display_order')
            .eq('is_active', true)
            .order('display_order');

        if (coursesError) throw coursesError;
        console.log(`✅ Courses found: ${courses.length}`);

        // 3. Fetch branches
        const { data: branches, error: branchesError } = await supabase
            .from('config_branches')
            .select('id, course_id, name, display_order')
            .eq('is_active', true)
            .order('display_order');

        if (branchesError) throw branchesError;
        console.log(`✅ Branches found: ${branches.length}`);

        // 4. Check linked integrity
        if (schools.length > 0 && courses.length > 0) {
            const schoolId = schools[0].id;
            const linkedCourses = courses.filter(c => c.school_id === schoolId);
            console.log(`ℹ️ Courses for school "${schools[0].name}": ${linkedCourses.length}`);
        }

    } catch (err) {
        console.error('❌ API Logic Failed:', err.message);
    }
}

testConfigAPI();
