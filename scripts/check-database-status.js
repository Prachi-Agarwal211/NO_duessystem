const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabase() {
  console.log('🔍 Checking Database Status...\n');
  console.log('📡 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('');

  // Check config_schools
  console.log('1️⃣ Checking config_schools table...');
  const { data: schools, error: schoolsError } = await supabase
    .from('config_schools')
    .select('*')
    .limit(5);

  if (schoolsError) {
    if (schoolsError.code === '42P01') {
      console.log('   ❌ Table does NOT exist');
    } else {
      console.log('   ❌ Error:', schoolsError.message);
    }
  } else {
    console.log(`   ✅ Table exists with ${schools?.length || 0} records (showing first 5)`);
    if (schools && schools.length > 0) {
      schools.forEach(s => console.log(`      - ${s.name} (active: ${s.is_active})`));
    }
  }

  // Check total count
  const { count: schoolCount } = await supabase
    .from('config_schools')
    .select('*', { count: 'exact', head: true });
  console.log(`   📊 Total schools: ${schoolCount || 0}\n`);

  // Check config_courses
  console.log('2️⃣ Checking config_courses table...');
  const { data: courses, error: coursesError } = await supabase
    .from('config_courses')
    .select('*')
    .limit(5);

  if (coursesError) {
    if (coursesError.code === '42P01') {
      console.log('   ❌ Table does NOT exist');
    } else {
      console.log('   ❌ Error:', coursesError.message);
    }
  } else {
    console.log(`   ✅ Table exists with ${courses?.length || 0} records (showing first 5)`);
    if (courses && courses.length > 0) {
      courses.forEach(c => console.log(`      - ${c.name} (school_id: ${c.school_id})`));
    }
  }

  const { count: courseCount } = await supabase
    .from('config_courses')
    .select('*', { count: 'exact', head: true });
  console.log(`   📊 Total courses: ${courseCount || 0}\n`);

  // Check config_branches
  console.log('3️⃣ Checking config_branches table...');
  const { data: branches, error: branchesError } = await supabase
    .from('config_branches')
    .select('*')
    .limit(5);

  if (branchesError) {
    if (branchesError.code === '42P01') {
      console.log('   ❌ Table does NOT exist');
    } else {
      console.log('   ❌ Error:', branchesError.message);
    }
  } else {
    console.log(`   ✅ Table exists with ${branches?.length || 0} records (showing first 5)`);
    if (branches && branches.length > 0) {
      branches.forEach(b => console.log(`      - ${b.name} (course_id: ${b.course_id})`));
    }
  }

  const { count: branchCount } = await supabase
    .from('config_branches')
    .select('*', { count: 'exact', head: true });
  console.log(`   📊 Total branches: ${branchCount || 0}\n`);

  // Check config_emails
  console.log('4️⃣ Checking config_emails table...');
  const { data: emails, error: emailsError } = await supabase
    .from('config_emails')
    .select('*');

  if (emailsError) {
    if (emailsError.code === '42P01') {
      console.log('   ❌ Table does NOT exist');
    } else {
      console.log('   ❌ Error:', emailsError.message);
    }
  } else {
    console.log(`   ✅ Table exists with ${emails?.length || 0} records`);
    if (emails && emails.length > 0) {
      emails.forEach(e => console.log(`      - ${e.key}: ${e.value}`));
    }
  }
  console.log('');

  // Check college domain specifically
  const { data: domain } = await supabase
    .from('config_emails')
    .select('value')
    .eq('key', 'college_domain')
    .single();
  
  if (domain) {
    console.log(`   📧 College Domain: ${domain.value}`);
  } else {
    console.log('   ⚠️  College domain not configured');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY:');
  console.log('='.repeat(60));
  console.log(`Schools:  ${schoolCount || 0} records`);
  console.log(`Courses:  ${courseCount || 0} records`);
  console.log(`Branches: ${branchCount || 0} records`);
  console.log(`Domain:   ${domain?.value || 'NOT SET'}`);
  console.log('='.repeat(60));

  if (schoolCount === 0 || courseCount === 0 || branchCount === 0) {
    console.log('\n⚠️  WARNING: Config tables are empty!');
    console.log('📝 Solution: Run FINAL_COMPLETE_DATABASE_SETUP.sql in Supabase SQL Editor');
  } else {
    console.log('\n✅ Database has data - dropdowns should work!');
  }
}

checkDatabase().catch(console.error);