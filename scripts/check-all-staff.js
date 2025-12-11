import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllStaff() {
  console.log('🔍 Checking all staff accounts in database...\n');

  try {
    // Fetch all staff members
    const { data: staff, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, department_name, role, school_ids, course_ids, branch_ids')
      .eq('role', 'department')
      .order('department_name');

    if (error) {
      console.error('❌ Error fetching staff:', error);
      return;
    }

    if (!staff || staff.length === 0) {
      console.log('❌ No staff accounts found!');
      return;
    }

    console.log(`✅ Found ${staff.length} staff account(s):\n`);
    
    staff.forEach((member, index) => {
      console.log(`${index + 1}. ${member.full_name || 'Unknown'}`);
      console.log(`   Email: ${member.email}`);
      console.log(`   Department: ${member.department_name}`);
      if (member.department_name === 'school_hod') {
        console.log(`   Schools: ${member.school_ids?.length || 0}`);
        console.log(`   Courses: ${member.course_ids?.length || 0}`);
        console.log(`   Branches: ${member.branch_ids?.length || 0}`);
      }
      console.log('');
    });

    // Group by department
    const deptGroups = staff.reduce((acc, member) => {
      if (!acc[member.department_name]) {
        acc[member.department_name] = [];
      }
      acc[member.department_name].push(member);
      return acc;
    }, {});

    console.log('📊 Staff by Department:');
    Object.entries(deptGroups).forEach(([dept, members]) => {
      console.log(`   ${dept}: ${members.length} staff`);
    });

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkAllStaff();