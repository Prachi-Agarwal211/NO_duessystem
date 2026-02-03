// Test the frontend logic to understand why approved forms aren't showing
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

async function testFrontendLogic() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║              TESTING FRONTEND LOGIC                                ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Test the exact query used in frontend
    console.log('1️⃣  TESTING FRONTEND QUERY');
    console.log('-'.repeat(70));
    
    const { data: forms, error: formsError } = await supabase
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status!inner(
          status,
          action_at,
          action_by,
          remarks,
          rejection_reason
        )
      `)
      .eq('no_dues_status.department_name', 'library')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (formsError) {
      console.error('❌ Error:', formsError);
      return;
    }
    
    console.log(`📊 Found ${forms?.length || 0} forms`);
    
    // 2. Analyze the status structure for each form
    console.log('\n2️⃣  ANALYZING STATUS STRUCTURE');
    console.log('-'.repeat(70));
    
    forms.forEach((form, i) => {
      console.log(`\n${i+1}. ${form.registration_no} - ${form.student_name}`);
      console.log(`   Form Status: ${form.status}`);
      console.log(`   no_dues_status length: ${form.no_dues_status?.length || 0}`);
      
      if (form.no_dues_status && form.no_dues_status.length > 0) {
        form.no_dues_status.forEach((status, idx) => {
          console.log(`   [${idx}] Dept: ${status.department_name || 'N/A'} - Status: ${status.status}`);
        });
        
        // Test frontend logic
        const frontendStatus = form.no_dues_status[0]?.status || 'pending';
        console.log(`   Frontend sees: ${frontendStatus}`);
        
        // Test if library status is in the array
        const libraryStatus = form.no_dues_status.find(s => s.department_name === 'library');
        console.log(`   Library status: ${libraryStatus?.status || 'NOT FOUND'}`);
        
        // Check if library is first in array
        const isFirstLibrary = form.no_dues_status[0]?.department_name === 'library';
        console.log(`   Is library first: ${isFirstLibrary}`);
      }
    });
    
    // 3. Test with different query approaches
    console.log('\n3️⃣  TESTING ALTERNATIVE QUERIES');
    console.log('-'.repeat(70));
    
    // Query that gets only library status
    const { data: libraryOnlyForms, error: libraryOnlyError } = await supabase
      .from('no_dues_forms')
      .select(`
        id,
        registration_no,
        student_name,
        status,
        created_at,
        library_status!left(
          status,
          action_at,
          action_by
        )
      `)
      .eq('library_status.department_name', 'library')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (libraryOnlyError) {
      console.log('❌ Library-only query failed:', libraryOnlyError.message);
    } else {
      console.log('✅ Library-only query works:');
      libraryOnlyForms?.forEach((form, i) => {
        console.log(`   ${i+1}. ${form.registration_no} - Library Status: ${form.library_status?.status || 'NULL'}`);
      });
    }
    
    // 4. Count approved forms using different methods
    console.log('\n4️⃣  COUNTING APPROVED FORMS');
    console.log('-'.repeat(70));
    
    // Method 1: Frontend current logic (likely wrong)
    const frontendApprovedCount = forms?.filter(app => 
      (app.no_dues_status?.[0]?.status || app.status) === 'approved'
    ).length || 0;
    
    console.log(`Frontend logic count: ${frontendApprovedCount}`);
    
    // Method 2: Correct logic - find library status
    const correctApprovedCount = forms?.filter(app => 
      app.no_dues_status?.some(s => s.department_name === 'library' && s.status === 'approved')
    ).length || 0;
    
    console.log(`Correct logic count: ${correctApprovedCount}`);
    
    // Method 3: Database count
    const { count: dbApprovedCount, error: dbCountError } = await supabase
      .from('no_dues_status')
      .select('*', { count: 'exact', head: true })
      .eq('department_name', 'library')
      .eq('status', 'approved');
    
    if (!dbCountError) {
      console.log(`Database approved count: ${dbApprovedCount || 0}`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 FRONTEND LOGIC ANALYSIS COMPLETE');
    console.log('='.repeat(70));
    console.log('🎯 ISSUE: Frontend only checks no_dues_status[0] but library status');
    console.log('   might not be the first item in the array!');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFrontendLogic();
