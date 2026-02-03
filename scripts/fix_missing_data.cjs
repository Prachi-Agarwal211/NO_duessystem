// Fix Missing Data for 240 Student Records
// Creates missing department statuses and syncs student data

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fixMissingData() {
  console.log('🔧 FIXING MISSING DATA FOR 240 STUDENTS\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Get all forms
    console.log('📋 Fetching all student forms...');
    const { data: forms, error: formsError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status, created_at, updated_at');
      
    if (formsError) {
      console.error('❌ Error fetching forms:', formsError);
      return;
    }
    
    console.log(`✅ Found ${forms.length} forms\n`);
    
    // 2. Get departments
    console.log('🏢 Fetching active departments...');
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('name, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
      
    if (deptError) {
      console.error('❌ Error fetching departments:', deptError);
      return;
    }
    
    console.log(`✅ Found ${departments.length} active departments\n`);
    
    // 3. Check existing statuses
    console.log('🔍 Checking existing department statuses...');
    const { data: existingStatuses, error: statusError } = await supabase
      .from('no_dues_status')
      .select('form_id, department_name, status');
      
    if (statusError) {
      console.error('❌ Error checking existing statuses:', statusError);
      return;
    }
    
    // Create lookup for existing statuses
    const existingStatusMap = new Map();
    existingStatuses?.forEach(status => {
      existingStatusMap.set(`${status.form_id}-${status.department_name}`, status);
    });
    
    console.log(`✅ Found ${existingStatuses?.length || 0} existing status records\n`);
    
    // 4. Create missing department statuses
    console.log('🔄 Creating missing department statuses...');
    let statusCreated = 0;
    let statusSkipped = 0;
    
    for (const form of forms) {
      for (const dept of departments) {
        const key = `${form.id}-${dept.name}`;
        
        if (existingStatusMap.has(key)) {
          statusSkipped++;
          continue;
        }
        
        // Create status record
        const { error: insertError } = await supabase
          .from('no_dues_status')
          .insert({
            form_id: form.id,
            department_name: dept.name,
            status: form.status === 'completed' ? 'approved' : 'pending',
            action_at: form.status === 'completed' ? form.updated_at : null,
            action_by: form.status === 'completed' ? dept.name : null,
            created_at: form.created_at,
            updated_at: form.updated_at
          });
          
        if (insertError) {
          console.error(`❌ Error creating status for ${form.registration_no} - ${dept.name}:`, insertError);
        } else {
          statusCreated++;
          console.log(`✅ Created status: ${form.registration_no} - ${dept.name} (${form.status === 'completed' ? 'approved' : 'pending'})`);
        }
      }
    }
    
    console.log(`\n📊 Status Creation Summary:`);
    console.log(`   ✅ Created: ${statusCreated}`);
    console.log(`   ⏭️  Skipped (already exists): ${statusSkipped}`);
    
    // 5. Sync student data
    console.log('\n🔄 Syncing student data...');
    let dataSynced = 0;
    let dataSkipped = 0;
    
    // Check existing student data
    const { data: existingStudentData, error: studentDataError } = await supabase
      .from('student_data')
      .select('form_id');
      
    if (studentDataError) {
      console.error('❌ Error checking existing student data:', studentDataError);
    } else {
      const existingFormIds = new Set(existingStudentData?.map(s => s.form_id) || []);
      
      for (const form of forms) {
        if (existingFormIds.has(form.id)) {
          dataSkipped++;
          continue;
        }
        
        const studentData = {
          form_id: form.id,
          registration_no: form.registration_no,
          student_name: form.student_name,
          parent_name: form.parent_name,
          school: form.school,
          course: form.course,
          branch: form.branch,
          contact_no: form.contact_no,
          personal_email: form.personal_email,
          college_email: form.college_email,
          admission_year: form.admission_year,
          passing_year: form.passing_year,
          alumni_profile_link: form.alumni_profile_link || '',
          updated_at: new Date().toISOString(),
          updated_by: 'fix_script'
        };
        
        const { error: syncError } = await supabase
          .from('student_data')
          .insert(studentData);
          
        if (syncError) {
          console.error(`❌ Error syncing data for ${form.registration_no}:`, syncError);
        } else {
          dataSynced++;
          console.log(`✅ Synced student data: ${form.registration_no} - ${form.student_name}`);
        }
      }
    }
    
    console.log(`\n📊 Student Data Sync Summary:`);
    console.log(`   ✅ Synced: ${dataSynced}`);
    console.log(`   ⏭️  Skipped (already exists): ${dataSkipped}`);
    
    // 6. Final verification
    console.log('\n🔍 Final verification...');
    
    const { count: finalStatusCount, error: finalStatusError } = await supabase
      .from('no_dues_status')
      .select('*', { count: 'exact', head: true });
      
    const { count: finalStudentDataCount, error: finalStudentError } = await supabase
      .from('student_data')
      .select('*', { count: 'exact', head: true });
      
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(70));
    console.log(`   📋 Total Forms: ${forms.length}`);
    console.log(`   🏢 Departments: ${departments.length}`);
    console.log(`   📊 Expected Status Records: ${forms.length * departments.length}`);
    console.log(`   ✅ Actual Status Records: ${finalStatusCount || 0}`);
    console.log(`   👥 Student Data Records: ${finalStudentDataCount || 0}`);
    
    if (finalStatusCount === forms.length * departments.length) {
      console.log('\n🎉 SUCCESS: All department statuses created!');
    } else {
      console.log('\n⚠️  WARNING: Some department statuses may still be missing');
    }
    
    if (finalStudentDataCount === forms.length) {
      console.log('🎉 SUCCESS: All student data synced!');
    } else {
      console.log('⚠️  WARNING: Some student data may still be missing');
    }
    
    console.log('\n✅ Data fix completed! Students should now be visible in all dashboards.');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

// Run fix
fixMissingData().catch(console.error);
