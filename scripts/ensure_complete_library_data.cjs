// Ensure Complete Library Data Visibility
// Make sure all 240 forms have library department status

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

async function ensureCompleteLibraryData() {
  console.log('🔧 ENSURING COMPLETE LIBRARY DATA VISIBILITY\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Get all forms
    console.log('📋 Getting all forms...');
    const { data: allForms, error: formsError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status, created_at, updated_at')
      .order('created_at', { ascending: false });
      
    if (formsError) {
      console.error('❌ Error fetching forms:', formsError);
      return;
    }
    
    console.log(`✅ Found ${allForms.length} total forms`);
    
    // 2. Get existing library statuses
    console.log('\n🔍 Checking existing library statuses...');
    const { data: existingLibraryStatuses, error: libraryError } = await supabase
      .from('no_dues_status')
      .select('form_id, status, action_at, action_by')
      .eq('department_name', 'library');
      
    if (libraryError) {
      console.error('❌ Error checking library statuses:', libraryError);
      return;
    }
    
    const existingFormIds = new Set(existingLibraryStatuses?.map(s => s.form_id) || []);
    console.log(`✅ Found ${existingFormIds.size} forms with library status`);
    
    // 3. Find forms missing library status
    const missingLibraryStatus = allForms.filter(form => !existingFormIds.has(form.id));
    console.log(`\n⚠️  Found ${missingLibraryStatus.length} forms missing library status`);
    
    if (missingLibraryStatus.length === 0) {
      console.log('🎉 All forms already have library status!');
    } else {
      console.log('\n🔄 Creating missing library statuses...');
      
      let created = 0;
      let errors = 0;
      
      for (const form of missingLibraryStatus) {
        try {
          // Determine status based on form status
          let status = 'pending';
          let actionAt = null;
          let actionBy = null;
          
          if (form.status === 'completed') {
            status = 'approved';
            actionAt = form.updated_at;
            actionBy = 'library';
          }
          
          const { error: insertError } = await supabase
            .from('no_dues_status')
            .insert({
              form_id: form.id,
              department_name: 'library',
              status: status,
              action_at: actionAt,
              action_by: actionBy,
              created_at: form.created_at,
              updated_at: form.updated_at
            });
            
          if (insertError) {
            console.error(`❌ Error creating status for ${form.registration_no}:`, insertError.message);
            errors++;
          } else {
            created++;
            if (created <= 10) { // Show first 10 for brevity
              console.log(`✅ Created library status: ${form.registration_no} - ${status}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error processing ${form.registration_no}:`, error.message);
          errors++;
        }
      }
      
      console.log(`\n📊 Library Status Creation Summary:`);
      console.log(`   ✅ Created: ${created}`);
      console.log(`   ❌ Errors: ${errors}`);
    }
    
    // 4. Final verification
    console.log('\n🔍 Final verification...');
    
    const { count: finalLibraryCount, error: finalError } = await supabase
      .from('no_dues_status')
      .select('*', { count: 'exact', head: true })
      .eq('department_name', 'library');
      
    if (!finalError) {
      console.log(`✅ Total library status records: ${finalLibraryCount}`);
      
      if (finalLibraryCount === allForms.length) {
        console.log('🎉 SUCCESS: All forms now have library status!');
      } else {
        console.log(`⚠️  WARNING: Expected ${allForms.length}, got ${finalLibraryCount}`);
      }
    }
    
    // 5. Show current status distribution
    console.log('\n📊 Current library status distribution:');
    const { data: statusDistribution, error: distError } = await supabase
      .from('no_dues_status')
      .select('status')
      .eq('department_name', 'library');
      
    if (!distError && statusDistribution) {
      const counts = {};
      statusDistribution.forEach(s => {
        counts[s.status] = (counts[s.status] || 0) + 1;
      });
      
      Object.entries(counts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }
    
    // 6. Test librarian query again
    console.log('\n🔍 Testing librarian query...');
    const { data: librarianData, error: librarianError } = await supabase
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status!inner(
          status,
          action_at,
          action_by,
          department_name
        )
      `)
      .eq('no_dues_status.department_name', 'library')
      .order('created_at', { ascending: false });
      
    if (!librarianError) {
      console.log(`✅ Librarian query now returns ${librarianData.length} records`);
      
      const approvedCount = librarianData.filter(d => 
        d.no_dues_status[0]?.status === 'approved'
      ).length;
      
      const pendingCount = librarianData.filter(d => 
        d.no_dues_status[0]?.status === 'pending'
      ).length;
      
      console.log(`   Approved: ${approvedCount}`);
      console.log(`   Pending: ${pendingCount}`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ COMPLETE DATA ENSUREMENT DONE');
    console.log('='.repeat(70));
    console.log('   Librarian should now see all records in the dashboard!');
    console.log('   If still not visible, try:');
    console.log('   1. Clear browser cache');
    console.log('   2. Hard refresh (Ctrl+F5)');
    console.log('   3. Check filter settings (might be set to "pending" only)');
    
  } catch (error) {
    console.error('❌ Process failed:', error);
    process.exit(1);
  }
}

// Run process
ensureCompleteLibraryData().catch(console.error);
