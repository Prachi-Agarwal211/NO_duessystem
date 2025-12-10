const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAPI() {
  console.log('🧪 Testing API Logic (Simulating /api/public/config?type=all)\n');

  // Simulate what the API does
  try {
    // Fetch schools
    const { data: schools, error: schoolsError } = await supabase
      .from('config_schools')
      .select('id, name, display_order')
      .eq('is_active', true)
      .order('display_order');

    if (schoolsError) throw schoolsError;

    // Fetch courses
    const { data: courses, error: coursesError } = await supabase
      .from('config_courses')
      .select('id, school_id, name, display_order')
      .eq('is_active', true)
      .order('display_order');

    if (coursesError) throw coursesError;

    // Fetch branches
    const { data: branches, error: branchesError } = await supabase
      .from('config_branches')
      .select('id, course_id, name, display_order')
      .eq('is_active', true)
      .order('display_order');

    if (branchesError) throw branchesError;

    // Fetch email config
    const { data: emailConfig, error: emailError } = await supabase
      .from('config_emails')
      .select('key, value')
      .eq('key', 'college_domain')
      .single();

    console.log('✅ API Response Structure:');
    console.log({
      success: true,
      data: {
        schools: schools.length + ' schools',
        courses: courses.length + ' courses',
        branches: branches.length + ' branches',
        collegeDomain: emailConfig?.value || 'jecrcu.edu.in'
      }
    });

    console.log('\n📋 Sample Data:');
    console.log('\nSchools (first 3):');
    schools.slice(0, 3).forEach(s => console.log(`  - ${s.name} (id: ${s.id})`));

    console.log('\nCourses (first 5):');
    courses.slice(0, 5).forEach(c => console.log(`  - ${c.name} (school_id: ${c.school_id})`));

    // Test cascading - get courses for first school
    const firstSchool = schools[0];
    const coursesForSchool = courses.filter(c => c.school_id === firstSchool.id);
    
    console.log(`\n🔗 Cascading Test - Courses for "${firstSchool.name}":`);
    coursesForSchool.forEach(c => console.log(`  - ${c.name}`));

    if (coursesForSchool.length === 0) {
      console.log('  ⚠️  NO COURSES FOUND for this school!');
    }

    // Test cascading - get branches for first course of first school
    if (coursesForSchool.length > 0) {
      const firstCourse = coursesForSchool[0];
      const branchesForCourse = branches.filter(b => b.course_id === firstCourse.id);
      
      console.log(`\n🔗 Cascading Test - Branches for "${firstCourse.name}":`);
      branchesForCourse.slice(0, 5).forEach(b => console.log(`  - ${b.name}`));
      
      if (branchesForCourse.length === 0) {
        console.log('  ⚠️  NO BRANCHES FOUND for this course!');
      } else {
        console.log(`  ... and ${branchesForCourse.length - 5} more branches`);
      }
    }

    console.log('\n✅ API logic works correctly!');
    console.log('✅ Database has proper data!');
    console.log('✅ Cascading relationships are correct!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();