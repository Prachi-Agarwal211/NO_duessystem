// Fix Missing Status Records for All Forms
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

async function fixMissingStatusRecords() {
  console.log('🔧 FIXING MISSING STATUS RECORDS\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Get all forms
    console.log('📋 Step 1: Getting all forms...');
    const { data: allForms, error: formsError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (formsError) {
      console.error('❌ Error fetching forms:', formsError);
      return;
    }

    console.log(`✅ Found ${allForms.length} total forms`);

    // 2. Get all existing status records
    console.log('\n📋 Step 2: Getting existing status records...');
    const { data: existingStatuses, error: statusError } = await supabase
      .from('no_dues_status')
      .select('form_id, department_name, status');

    if (statusError) {
      console.error('❌ Error fetching statuses:', statusError);
      return;
    }

    // Group existing statuses by form_id
    const existingStatusMap = new Map();
    existingStatuses?.forEach(status => {
      if (!existingStatusMap.has(status.form_id)) {
        existingStatusMap.set(status.form_id, new Set());
      }
      existingStatusMap.get(status.form_id).add(status.department_name);
    });

    console.log(`✅ Found status records for ${existingStatusMap.size} forms`);

    // 3. Get all departments
    console.log('\n📋 Step 3: Getting all departments...');
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name');

    if (deptError) {
      console.error('❌ Error fetching departments:', deptError);
      return;
    }

    console.log(`✅ Found ${departments.length} active departments`);

    // 4. Find forms missing status records
    const formsMissingStatuses = allForms.filter(form => !existingStatusMap.has(form.id));
    console.log(`\n⚠️ Found ${formsMissingStatuses.length} forms missing status records`);

    if (formsMissingStatuses.length === 0) {
      console.log('🎉 All forms already have status records!');
      return;
    }

    // 5. Create missing status records
    console.log('\n🔧 Step 4: Creating missing status records...');
    
    let createdCount = 0;
    let errorCount = 0;

    for (const form of formsMissingStatuses) {
      try {
        // Determine status based on form status
        let status = 'pending';
        let actionAt = null;
        let actionBy = null;

        if (form.status === 'completed') {
          status = 'approved';
          actionAt = form.updated_at;
          actionBy = 'system';
        } else if (form.status === 'rejected') {
          status = 'rejected';
          actionAt = form.updated_at;
          actionBy = 'system';
        }

        // Create status records for all departments
        const statusRecords = departments.map(dept => ({
          form_id: form.id,
          department_name: dept.name,
          status: status,
          action_at: actionAt,
          action_by: actionBy,
          created_at: form.created_at,
          updated_at: form.updated_at
        }));

        const { error: insertError } = await supabase
          .from('no_dues_status')
          .insert(statusRecords);

        if (insertError) {
          console.error(`❌ Error creating statuses for ${form.registration_no}:`, insertError.message);
          errorCount++;
        } else {
          createdCount++;
          if (createdCount <= 10) { // Show first 10 for brevity
            console.log(`✅ Created ${departments.length} status records for ${form.registration_no} - ${status}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${form.registration_no}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Status Creation Summary:`);
    console.log(`   ✅ Created: ${createdCount} forms × ${departments.length} departments = ${createdCount * departments.length} records`);
    console.log(`   ❌ Errors: ${errorCount}`);

    // 6. Verify the fix
    console.log('\n🔍 Step 5: Verification...');
    const { count: finalStatusCount, error: finalError } = await supabase
      .from('no_dues_status')
      .select('*', { count: 'exact', head: true });

    if (!finalError) {
      console.log(`✅ Total status records now: ${finalStatusCount}`);
      
      const expectedTotal = allForms.length * departments.length;
      console.log(`✅ Expected total: ${allForms.length} forms × ${departments.length} departments = ${expectedTotal}`);
      
      if (finalStatusCount === expectedTotal) {
        console.log('🎉 SUCCESS: All forms now have complete status records!');
      } else {
        console.log(`⚠️  WARNING: Expected ${expectedTotal}, got ${finalStatusCount}`);
      }
    }

    // 7. Test library department access
    console.log('\n📚 Step 6: Testing library department access...');
    const { data: libraryData, error: libraryError } = await supabase
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status!inner(
          status,
          department_name
        )
      `)
      .eq('no_dues_status.department_name', 'library');

    if (!libraryError) {
      const approvedCount = libraryData.filter(d => d.no_dues_status[0]?.status === 'approved').length;
      const pendingCount = libraryData.filter(d => d.no_dues_status[0]?.status === 'pending').length;
      
      console.log(`✅ Library department access:`);
      console.log(`   Total forms: ${libraryData.length}`);
      console.log(`   Approved: ${approvedCount}`);
      console.log(`   Pending: ${pendingCount}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 MISSING STATUS RECORDS FIX COMPLETE!');
    console.log('='.repeat(70));
    console.log('   Frontend should now show correct counts and data!');

  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

// Run the fix
fixMissingStatusRecords().catch(console.error);
