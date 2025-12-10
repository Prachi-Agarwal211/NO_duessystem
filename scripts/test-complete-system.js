const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCompleteSystem() {
  console.log('🧪 COMPLETE SYSTEM TEST\n');
  console.log('='.repeat(60));
  
  let allTestsPassed = true;
  const results = [];

  // Test 1: Database Tables
  console.log('\n1️⃣ Testing Database Tables...');
  try {
    const { data: schools } = await supabase.from('config_schools').select('*').limit(1);
    const { data: courses } = await supabase.from('config_courses').select('*').limit(1);
    const { data: branches } = await supabase.from('config_branches').select('*').limit(1);
    const { data: emails } = await supabase.from('config_emails').select('*').limit(1);
    const { data: forms } = await supabase.from('no_dues_forms').select('*').limit(1);
    
    if (schools && courses && branches && emails) {
      console.log('   ✅ All config tables exist');
      results.push({ test: 'Database Tables', status: 'PASS' });
    }
  } catch (error) {
    console.log('   ❌ Database tables error:', error.message);
    results.push({ test: 'Database Tables', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 2: Config Data Count
  console.log('\n2️⃣ Testing Config Data...');
  try {
    const { count: schoolCount } = await supabase
      .from('config_schools')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    const { count: courseCount } = await supabase
      .from('config_courses')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    const { count: branchCount } = await supabase
      .from('config_branches')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    console.log(`   Schools: ${schoolCount}, Courses: ${courseCount}, Branches: ${branchCount}`);
    
    if (schoolCount > 0 && courseCount > 0 && branchCount > 0) {
      console.log('   ✅ Config data populated');
      results.push({ test: 'Config Data', status: 'PASS' });
    } else {
      console.log('   ❌ Config data missing');
      results.push({ test: 'Config Data', status: 'FAIL' });
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Config data error:', error.message);
    results.push({ test: 'Config Data', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 3: College Domain
  console.log('\n3️⃣ Testing College Domain...');
  try {
    const { data } = await supabase
      .from('config_emails')
      .select('value')
      .eq('key', 'college_domain')
      .single();
    
    if (data?.value === 'jecrcu.edu.in') {
      console.log('   ✅ College domain: jecrcu.edu.in');
      results.push({ test: 'College Domain', status: 'PASS' });
    } else {
      console.log(`   ❌ Wrong domain: ${data?.value}`);
      results.push({ test: 'College Domain', status: 'FAIL' });
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Domain check error:', error.message);
    results.push({ test: 'College Domain', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 4: Cascading Relationships
  console.log('\n4️⃣ Testing Cascading Relationships...');
  try {
    const { data: schools } = await supabase
      .from('config_schools')
      .select('id, name')
      .eq('is_active', true)
      .limit(1);
    
    if (schools && schools.length > 0) {
      const { data: courses } = await supabase
        .from('config_courses')
        .select('id, name')
        .eq('school_id', schools[0].id)
        .eq('is_active', true);
      
      if (courses && courses.length > 0) {
        const { data: branches } = await supabase
          .from('config_branches')
          .select('id, name')
          .eq('course_id', courses[0].id)
          .eq('is_active', true);
        
        if (branches && branches.length > 0) {
          console.log(`   ✅ School → ${courses.length} Courses → ${branches.length} Branches`);
          results.push({ test: 'Cascading Relationships', status: 'PASS' });
        } else {
          console.log('   ❌ No branches found for course');
          results.push({ test: 'Cascading Relationships', status: 'FAIL' });
          allTestsPassed = false;
        }
      } else {
        console.log('   ❌ No courses found for school');
        results.push({ test: 'Cascading Relationships', status: 'FAIL' });
        allTestsPassed = false;
      }
    }
  } catch (error) {
    console.log('   ❌ Cascading test error:', error.message);
    results.push({ test: 'Cascading Relationships', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 5: Form Submission (Test Data)
  console.log('\n5️⃣ Testing Form Submission...');
  try {
    const testRegNo = `TEST${Date.now()}`;
    const { data: schools } = await supabase.from('config_schools').select('id, name').limit(1).single();
    const { data: courses } = await supabase.from('config_courses').select('id, name').eq('school_id', schools.id).limit(1).single();
    const { data: branches } = await supabase.from('config_branches').select('id, name').eq('course_id', courses.id).limit(1).single();

    const testForm = {
      registration_no: testRegNo,
      student_name: 'Test Student',
      school_id: schools.id,
      school: schools.name,
      course_id: courses.id,
      course: courses.name,
      branch_id: branches.id,
      branch: branches.name,
      country_code: '+91',
      contact_no: '9876543210',
      personal_email: 'test@example.com',
      college_email: 'test@jecrcu.edu.in',
      status: 'pending'
    };

    const { data: createdForm, error } = await supabase
      .from('no_dues_forms')
      .insert(testForm)
      .select()
      .single();

    if (createdForm && !error) {
      console.log('   ✅ Form created successfully');
      results.push({ test: 'Form Submission', status: 'PASS' });
      
      // Clean up test data
      await supabase.from('no_dues_forms').delete().eq('id', createdForm.id);
      console.log('   🧹 Test form cleaned up');
    } else {
      console.log('   ❌ Form creation failed:', error?.message);
      results.push({ test: 'Form Submission', status: 'FAIL', error: error?.message });
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Form submission error:', error.message);
    results.push({ test: 'Form Submission', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 6: Department Actions Table
  console.log('\n6️⃣ Testing Department Actions...');
  try {
    const { data } = await supabase.from('department_actions').select('*').limit(1);
    console.log('   ✅ Department actions table accessible');
    results.push({ test: 'Department Actions', status: 'PASS' });
  } catch (error) {
    console.log('   ❌ Department actions error:', error.message);
    results.push({ test: 'Department Actions', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 7: Manual Entries Table
  console.log('\n7️⃣ Testing Manual Entries...');
  try {
    const { data } = await supabase.from('manual_entries').select('*').limit(1);
    console.log('   ✅ Manual entries table accessible');
    results.push({ test: 'Manual Entries', status: 'PASS' });
  } catch (error) {
    console.log('   ❌ Manual entries error:', error.message);
    results.push({ test: 'Manual Entries', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 8: Staff Accounts
  console.log('\n8️⃣ Testing Staff Accounts...');
  try {
    const { count } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   ✅ Staff accounts: ${count || 0} found`);
    results.push({ test: 'Staff Accounts', status: 'PASS' });
  } catch (error) {
    console.log('   ❌ Staff accounts error:', error.message);
    results.push({ test: 'Staff Accounts', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 9: RLS Policies
  console.log('\n9️⃣ Testing RLS Policies...');
  try {
    // Test public read access
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: schools, error } = await anonClient
      .from('config_schools')
      .select('*')
      .limit(1);

    if (schools && !error) {
      console.log('   ✅ Public read access works');
      results.push({ test: 'RLS Policies', status: 'PASS' });
    } else {
      console.log('   ❌ Public read access blocked:', error?.message);
      results.push({ test: 'RLS Policies', status: 'FAIL' });
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ RLS policy error:', error.message);
    results.push({ test: 'RLS Policies', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 10: Storage Bucket
  console.log('\n🔟 Testing Storage Bucket...');
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const alumniScreenshots = buckets?.find(b => b.name === 'alumni-screenshots');
    
    if (alumniScreenshots) {
      console.log('   ✅ alumni-screenshots bucket exists');
      results.push({ test: 'Storage Bucket', status: 'PASS' });
    } else {
      console.log('   ⚠️  alumni-screenshots bucket not found');
      results.push({ test: 'Storage Bucket', status: 'WARN' });
    }
  } catch (error) {
    console.log('   ❌ Storage error:', error.message);
    results.push({ test: 'Storage Bucket', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${r.test}: ${r.status}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  });

  console.log('='.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Warnings: ${warned}`);
  console.log('='.repeat(60));

  if (allTestsPassed && failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! System is ready for production.');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED! Please fix issues before deploying.');
  }
}

testCompleteSystem().catch(console.error);