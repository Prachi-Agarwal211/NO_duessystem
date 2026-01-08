/**
 * Check existing courses in Design and Sciences schools
 * This will help us identify the correct course names
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkCourses() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     Check Design & Sciences Schools Courses                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get schools
    const { data: schools, error: schoolError } = await supabase
      .from('config_schools')
      .select('id, name')
      .in('name', ['Jaipur School of Design', 'School of Sciences']);

    if (schoolError) throw schoolError;

    console.log('🏫 Found Schools:\n');
    schools.forEach(s => {
      console.log(`   ${s.name}`);
      console.log(`   ID: ${s.id}\n`);
    });

    // Get all courses for these schools
    const { data: courses, error: courseError } = await supabase
      .from('config_courses')
      .select('id, name, school_id, is_active')
      .in('school_id', schools.map(s => s.id))
      .order('name');

    if (courseError) throw courseError;

    console.log('📚 Existing Courses:\n');
    
    schools.forEach(school => {
      const schoolCourses = courses.filter(c => c.school_id === school.id);
      console.log(`\n${school.name}:`);
      console.log('─'.repeat(60));
      
      if (schoolCourses.length === 0) {
        console.log('   ⚠️  No courses found');
      } else {
        schoolCourses.forEach(c => {
          const activeStatus = c.is_active ? '✅' : '❌';
          console.log(`   ${activeStatus} ${c.name}`);
          console.log(`      ID: ${c.id}`);
        });
      }
    });

    // Get branch counts for each course
    console.log('\n\n📊 Branch Counts:\n');
    
    for (const school of schools) {
      const schoolCourses = courses.filter(c => c.school_id === school.id);
      console.log(`\n${school.name}:`);
      console.log('─'.repeat(60));
      
      for (const course of schoolCourses) {
        const { count } = await supabase
          .from('config_branches')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);
        
        console.log(`   ${course.name}: ${count} branches`);
      }
    }

    console.log('\n✅ Check complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

checkCourses()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });