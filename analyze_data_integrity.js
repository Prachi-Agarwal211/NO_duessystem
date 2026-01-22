const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeDiscrepancies() {
    console.log('--- Analyzing Schools ---');
    const { data: sdSchools } = await supabase.from('student_data').select('school').not('school', 'is', null);
    const uniqueSdSchools = [...new Set(sdSchools.map(s => s.school))];

    const { data: configSchools } = await supabase.from('config_schools').select('name');
    const configSchoolNames = configSchools.map(s => s.name);

    const missingSchools = uniqueSdSchools.filter(s => !configSchoolNames.includes(s));
    console.log('Missing Schools in Config:', missingSchools);

    console.log('\n--- Analyzing Courses ---');
    const { data: sdCourses } = await supabase.from('student_data').select('school, course').not('course', 'is', null);
    const uniqueSdCourses = sdCourses.reduce((acc, curr) => {
        const key = `${curr.school} | ${curr.course}`;
        if (!acc.includes(key)) acc.push(key);
        return acc;
    }, []);

    const { data: configCourses } = await supabase.from('config_courses').select('name, config_schools(name)');
    const configCourseKeys = configCourses.map(c => `${c.config_schools.name} | ${c.name}`);

    const missingCourses = uniqueSdCourses.filter(c => !configCourseKeys.includes(c));
    console.log('Missing Courses in Config:', missingCourses.length > 20 ? `${missingCourses.length} entries (truncated)` : missingCourses);

    console.log('\n--- Analyzing Branches ---');
    const { data: sdBranches } = await supabase.from('student_data').select('school, course, branch').not('branch', 'is', null);
    const uniqueSdBranches = sdBranches.reduce((acc, curr) => {
        const key = `${curr.school} | ${curr.course} | ${curr.branch}`;
        if (!acc.includes(key)) acc.push(key);
        return acc;
    }, []);

    // This is a bit complex for a simple script, but let's see if we can get the idea
    console.log('Total unique combinations in student_data:', uniqueSdBranches.length);
}

analyzeDiscrepancies().catch(console.error);
