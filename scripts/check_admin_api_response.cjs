// Test admin API response to understand filtering issue
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment
function loadEnv() {
  const envFiles = ['../.env.local', '../.env'];
  envFiles.forEach(envFile => {
    const filePath = path.join(__dirname, envFile);
    if (fs.existsSync(filePath)) {
      const envContent = fs.readFileSync(filePath, 'utf8');
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
    }
  });
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAdminAPI() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                ADMIN API RESPONSE TEST                             ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Test the exact query used in admin dashboard API
    console.log('1️⃣  TESTING ADMIN DASHBOARD QUERY');
    console.log('-'.repeat(70));
    
    let query = supabase
      .from('no_dues_forms')
      .select(`
        id,
        student_name,
        registration_no,
        course,
        branch,
        school,
        contact_no,
        status,
        created_at,
        updated_at,
        reapplication_count,
        rejection_context,
        no_dues_status!inner (
          id,
          department_name,
          status,
          action_at,
          created_at,
          rejection_reason,
          action_by,
          profiles (
            full_name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range(0, 19); // First 20 records

    const { data: adminData, error: adminError } = await query;
    
    if (adminError) {
      console.error('❌ Admin query error:', adminError);
      return;
    }
    
    console.log(`📊 Admin query returned: ${adminData?.length || 0} records`);
    
    // 2. Test without inner join to see all forms
    console.log('\n2️⃣  TESTING WITHOUT INNER JOIN');
    console.log('-'.repeat(70));
    
    const { data: allForms, error: allFormsError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status')
      .order('created_at', { ascending: false })
      .range(0, 19);
    
    if (allFormsError) {
      console.error('❌ All forms error:', allFormsError);
      return;
    }
    
    console.log(`📊 All forms query returned: ${allForms?.length || 0} records`);
    
    // 3. Check forms with status = completed
    console.log('\n3️⃣  TESTING COMPLETED FORMS FILTER');
    console.log('-'.repeat(70));
    
    const { data: completedForms, error: completedError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .range(0, 19);
    
    if (completedError) {
      console.error('❌ Completed forms error:', completedError);
      return;
    }
    
    console.log(`📊 Completed forms query returned: ${completedForms?.length || 0} records`);
    
    // 4. Check forms that have no_dues_status records
    console.log('\n4️⃣  TESTING FORMS WITH STATUS RECORDS');
    console.log('-'.repeat(70));
    
    const { data: formsWithStatus, error: formsWithStatusError } = await supabase
      .from('no_dues_forms')
      .select(`
        id,
        registration_no,
        student_name,
        status,
        no_dues_status (
          id,
          department_name,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .range(0, 19);
    
    if (formsWithStatusError) {
      console.error('❌ Forms with status error:', formsWithStatusError);
      return;
    }
    
    console.log(`📊 Forms with status query returned: ${formsWithStatus?.length || 0} records`);
    
    // Analyze the results
    console.log('\n5️⃣  ANALYSIS');
    console.log('-'.repeat(70));
    
    if (formsWithStatus) {
      const withStatusRecords = formsWithStatus.filter(f => f.no_dues_status && f.no_dues_status.length > 0);
      const withoutStatusRecords = formsWithStatus.filter(f => !f.no_dues_status || f.no_dues_status.length === 0);
      
      console.log(`   Forms with status records: ${withStatusRecords.length}`);
      console.log(`   Forms without status records: ${withoutStatusRecords.length}`);
      
      if (withoutStatusRecords.length > 0) {
        console.log('\n   Sample forms without status records:');
        withoutStatusRecords.slice(0, 5).forEach((form, i) => {
          console.log(`     ${i+1}. ${form.registration_no} - ${form.student_name} (${form.status})`);
        });
      }
    }
    
    // 6. Test department filtering
    console.log('\n6️⃣  TESTING DEPARTMENT FILTER');
    console.log('-'.repeat(70));
    
    const { data: libraryForms, error: libraryError } = await supabase
      .from('no_dues_status')
      .select('form_id, department_name, status')
      .eq('department_name', 'library');
    
    if (!libraryError && libraryForms) {
      console.log(`📊 Library department has ${libraryForms.length} status records`);
      
      if (libraryForms.length > 0) {
        const formIds = libraryForms.map(f => f.form_id);
        
        const { data: libraryFormDetails, error: libraryDetailsError } = await supabase
          .from('no_dues_forms')
          .select('id, registration_no, student_name, status')
          .in('id', formIds)
          .limit(5);
        
        if (!libraryDetailsError && libraryFormDetails) {
          console.log('   Sample forms for library department:');
          libraryFormDetails.forEach((form, i) => {
            console.log(`     ${i+1}. ${form.registration_no} - ${form.student_name} (${form.status})`);
          });
        }
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 ADMIN API TEST COMPLETE');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAdminAPI();
