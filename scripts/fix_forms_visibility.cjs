// Fix forms visibility issue by creating missing department status records
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

async function fixFormsVisibility() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║              FIXING FORMS VISIBILITY ISSUE                         ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Get all departments
    console.log('1️⃣  GETTING ALL DEPARTMENTS');
    console.log('-'.repeat(70));
    
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('name, display_name')
      .eq('is_active', true)
      .order('display_order');
    
    if (deptError) {
      console.error('❌ Error fetching departments:', deptError);
      return;
    }
    
    console.log(`📊 Found ${departments?.length || 0} active departments`);
    departments.forEach((dept, i) => {
      console.log(`   ${i+1}. ${dept.name} (${dept.display_name})`);
    });
    
    // 2. Get all forms that don't have department status records
    console.log('\n2️⃣  FINDING FORMS WITHOUT DEPARTMENT STATUS');
    console.log('-'.repeat(70));
    
    const { data: allForms, error: allFormsError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status, created_at')
      .order('created_at', { ascending: false });
    
    if (allFormsError) {
      console.error('❌ Error fetching all forms:', allFormsError);
      return;
    }
    
    console.log(`📊 Total forms to process: ${allForms?.length || 0}`);
    
    // 3. Check which forms need status records
    console.log('\n3️⃣  CHECKING FORMS THAT NEED STATUS RECORDS');
    console.log('-'.repeat(70));
    
    const formsNeedingStatus = [];
    
    for (const form of allForms || []) {
      const { data: existingStatus, error: statusError } = await supabase
        .from('no_dues_status')
        .select('id')
        .eq('form_id', form.id)
        .limit(1);
      
      if (!statusError && (!existingStatus || existingStatus.length === 0)) {
        formsNeedingStatus.push(form);
      }
    }
    
    console.log(`📊 Forms needing department status records: ${formsNeedingStatus.length}`);
    
    if (formsNeedingStatus.length === 0) {
      console.log('✅ All forms already have department status records!');
      return;
    }
    
    // 4. Create missing department status records
    console.log('\n4️⃣  CREATING MISSING DEPARTMENT STATUS RECORDS');
    console.log('-'.repeat(70));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const form of formsNeedingStatus) {
      try {
        // Create status records for each department
        const statusRecords = departments.map(dept => ({
          form_id: form.id,
          department_name: dept.name,
          status: form.status === 'completed' ? 'approved' : 'pending',
          created_at: form.created_at,
          updated_at: form.created_at,
          action_at: form.status === 'completed' ? form.updated_at || form.created_at : null,
          action_by: null,
          remarks: form.status === 'completed' ? 'Auto-approved (form was completed)' : null,
          rejection_reason: null
        }));
        
        const { error: insertError } = await supabase
          .from('no_dues_status')
          .insert(statusRecords);
        
        if (insertError) {
          console.error(`❌ Error creating status for form ${form.registration_no}:`, insertError.message);
          errorCount++;
        } else {
          console.log(`✅ Created status records for form ${form.registration_no} (${form.student_name})`);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing form ${form.registration_no}:`, error.message);
        errorCount++;
      }
      
      // Add small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 5. Verify the fix
    console.log('\n5️⃣  VERIFYING THE FIX');
    console.log('-'.repeat(70));
    
    const { count: finalStatusCount, error: finalCountError } = await supabase
      .from('no_dues_status')
      .select('*', { count: 'exact', head: true });
    
    if (!finalCountError) {
      console.log(`📊 Total status records after fix: ${finalStatusCount || 0}`);
    }
    
    // Test admin query again
    const { data: testAdminData, error: testAdminError } = await supabase
      .from('no_dues_forms')
      .select(`
        id,
        student_name,
        registration_no,
        status,
        no_dues_status!inner (
          id,
          department_name,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .range(0, 19);
    
    if (!testAdminError) {
      console.log(`📊 Admin query now returns: ${testAdminData?.length || 0} records`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔧 FIX SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Successfully processed: ${successCount} forms`);
    console.log(`❌ Errors encountered: ${errorCount} forms`);
    console.log(`📊 Forms should now be visible in admin dashboard`);
    console.log(`📊 Forms should now be visible in department dashboards`);
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixFormsVisibility();
