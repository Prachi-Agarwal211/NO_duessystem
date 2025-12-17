/**
 * Add Two HOD Staff Accounts
 * 1. prachiagarwal211@gmail.com - MBA/BBA (Jaipur School of Business)
 * 2. razorrag.official@gmail.com - B.Tech/M.Tech (School of Engineering & Technology)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addHODAccounts() {
  console.log('🚀 Adding Two HOD Staff Accounts...\n');

  try {
    // Get school and course IDs
    const { data: schools } = await supabase
      .from('config_schools')
      .select('id, name')
      .in('name', ['School of Engineering & Technology', 'Jaipur School of Business']);

    const { data: courses } = await supabase
      .from('config_courses')
      .select('id, name, school_id')
      .in('name', ['B.Tech', 'M.Tech', 'BBA', 'MBA']);

    if (!schools || schools.length === 0) {
      throw new Error('Schools not found in database');
    }

    if (!courses || courses.length === 0) {
      throw new Error('Courses not found in database');
    }

    // Map schools and courses
    const engineeringSchool = schools.find(s => s.name === 'School of Engineering & Technology');
    const businessSchool = schools.find(s => s.name === 'Jaipur School of Business');

    const btechCourse = courses.find(c => c.name === 'B.Tech' && c.school_id === engineeringSchool.id);
    const mtechCourse = courses.find(c => c.name === 'M.Tech' && c.school_id === engineeringSchool.id);
    const bbaCourse = courses.find(c => c.name === 'BBA' && c.school_id === businessSchool.id);
    const mbaCourse = courses.find(c => c.name === 'MBA' && c.school_id === businessSchool.id);

    // Account 1: Engineering HOD
    console.log('📧 Creating account: razorrag.official@gmail.com');
    const { data: engAuth, error: engAuthError } = await supabase.auth.admin.createUser({
      email: 'razorrag.official@gmail.com',
      password: 'JECRC@2024',
      email_confirm: true,
      user_metadata: {
        full_name: 'Engineering HOD',
        role: 'department'
      }
    });

    if (engAuthError) {
      console.error('❌ Error creating Engineering HOD auth:', engAuthError.message);
    } else {
      console.log('✅ Auth user created:', engAuth.user.id);

      // Create profile
      const { error: engProfileError } = await supabase
        .from('profiles')
        .insert({
          id: engAuth.user.id,
          email: 'razorrag.official@gmail.com',
          full_name: 'Engineering HOD',
          role: 'department',
          department_name: 'school_hod',
          school_ids: [engineeringSchool.id],
          course_ids: [btechCourse.id, mtechCourse.id],
          branch_ids: [], // Empty = all branches in these courses
          is_active: true
        });

      if (engProfileError) {
        console.error('❌ Error creating Engineering HOD profile:', engProfileError.message);
      } else {
        console.log('✅ Profile created for Engineering HOD');
        console.log(`   - School: ${engineeringSchool.name}`);
        console.log(`   - Courses: B.Tech, M.Tech`);
        console.log(`   - Branches: All branches in these courses\n`);
      }
    }

    // Account 2: Business HOD
    console.log('📧 Creating account: prachiagarwal211@gmail.com');
    const { data: bizAuth, error: bizAuthError } = await supabase.auth.admin.createUser({
      email: 'prachiagarwal211@gmail.com',
      password: 'JECRC@2024',
      email_confirm: true,
      user_metadata: {
        full_name: 'Business School HOD',
        role: 'department'
      }
    });

    if (bizAuthError) {
      console.error('❌ Error creating Business HOD auth:', bizAuthError.message);
    } else {
      console.log('✅ Auth user created:', bizAuth.user.id);

      // Create profile
      const { error: bizProfileError } = await supabase
        .from('profiles')
        .insert({
          id: bizAuth.user.id,
          email: 'prachiagarwal211@gmail.com',
          full_name: 'Business School HOD',
          role: 'department',
          department_name: 'school_hod',
          school_ids: [businessSchool.id],
          course_ids: [bbaCourse.id, mbaCourse.id],
          branch_ids: [], // Empty = all branches in these courses
          is_active: true
        });

      if (bizProfileError) {
        console.error('❌ Error creating Business HOD profile:', bizProfileError.message);
      } else {
        console.log('✅ Profile created for Business School HOD');
        console.log(`   - School: ${businessSchool.name}`);
        console.log(`   - Courses: BBA, MBA`);
        console.log(`   - Branches: All branches in these courses\n`);
      }
    }

    console.log('✅ Two HOD accounts created successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Engineering HOD (B.Tech/M.Tech)');
    console.log('   Email: razorrag.official@gmail.com');
    console.log('   Password: JECRC@2024');
    console.log('   Dashboard: https://no-duessystem.onrender.com/staff/login');
    console.log('');
    console.log('2. Business School HOD (BBA/MBA)');
    console.log('   Email: prachiagarwal211@gmail.com');
    console.log('   Password: JECRC@2024');
    console.log('   Dashboard: https://no-duessystem.onrender.com/staff/login');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

addHODAccounts();