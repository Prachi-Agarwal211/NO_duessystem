import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchoolCourseBranch() {
  console.log('🏫 Checking Schools, Courses, and Branches...');
  
  try {
    // Get schools
    const { data: schools, error: schoolError } = await supabase
      .from('config_schools')
      .select('id, name, display_name')
      .eq('is_active', true)
      .order('display_order');
    
    if (schoolError) throw schoolError;
    console.log('\n=== SCHOOLS ===');
    schools.forEach(s => console.log(`ID: ${s.id}, Name: '${s.name}', Display: '${s.display_name}'`));
    
    // Get courses
    const { data: courses, error: courseError } = await supabase
      .from('config_courses')
      .select('id, name, display_name, school_id')
      .eq('is_active', true)
      .order('display_order');
    
    if (courseError) throw courseError;
    console.log('\n=== COURSES ===');
    courses.forEach(c => console.log(`ID: ${c.id}, Name: '${c.name}', Display: '${c.display_name}', School: ${c.school_id}`));
    
    // Get branches
    const { data: branches, error: branchError } = await supabase
      .from('config_branches')
      .select('id, name, display_name, course_id')
      .eq('is_active', true)
      .order('display_order');
    
    if (branchError) throw branchError;
    console.log('\n=== BRANCHES ===');
    branches.forEach(b => console.log(`ID: ${b.id}, Name: '${b.name}', Display: '${b.display_name}', Course: ${b.course_id}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchoolCourseBranch().then(() => process.exit(0));
