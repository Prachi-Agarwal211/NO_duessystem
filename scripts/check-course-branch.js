// Check actual course/branch values in database
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkValues() {
    console.log('🔍 CHECKING COURSE/BRANCH VALUES IN DATABASE...\n');

    // Get a few forms to see what values are stored
    const { data: forms, error } = await supabase
        .from('no_dues_forms')
        .select('id, registration_no, student_name, course, course_id, branch, branch_id')
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Sample forms with course/branch data:');
    forms.forEach(form => {
        console.log('\n---');
        console.log(`Registration: ${form.registration_no}`);
        console.log(`Student: ${form.student_name}`);
        console.log(`course (NAME): ${form.course}`);
        console.log(`course_id (ID): ${form.course_id}`);
        console.log(`branch (NAME): ${form.branch}`);
        console.log(`branch_id (ID): ${form.branch_id}`);
    });

    console.log('\n\n✅ CHECK COMPLETE');
}

checkValues().catch(console.error);
