import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConfigTables() {
  try {
    // Get schools structure
    const { data: schools, error: schoolError } = await supabase
      .from('config_schools')
      .select('*')
      .limit(3);
    
    if (schoolError) throw schoolError;
    console.log('=== SCHOOLS STRUCTURE ===');
    console.log('Columns:', Object.keys(schools[0] || {}));
    schools.forEach(s => console.log(`ID: ${s.id}, Name: '${s.name}'`));
    
    // Get courses structure
    const { data: courses, error: courseError } = await supabase
      .from('config_courses')
      .select('*')
      .limit(3);
    
    if (courseError) throw courseError;
    console.log('\n=== COURSES STRUCTURE ===');
    console.log('Columns:', Object.keys(courses[0] || {}));
    courses.forEach(c => console.log(`ID: ${c.id}, Name: '${c.name}', School: ${c.school_id}`));
    
    // Get branches structure
    const { data: branches, error: branchError } = await supabase
      .from('config_branches')
      .select('*')
      .limit(3);
    
    if (branchError) throw branchError;
    console.log('\n=== BRANCHES STRUCTURE ===');
    console.log('Columns:', Object.keys(branches[0] || {}));
    branches.forEach(b => console.log(`ID: ${b.id}, Name: '${b.name}', Course: ${b.course_id}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkConfigTables().then(() => process.exit(0));
