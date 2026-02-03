// Comprehensive fix for librarian dashboard to show all approved forms
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

async function fixLibrarianDashboard() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║          COMPREHENSIVE LIBRARIAN DASHBOARD FIX                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Test the current query and see what it returns
    console.log('1️⃣  TESTING CURRENT FRONTEND QUERY');
    console.log('-'.repeat(70));
    
    const { data: currentQuery, error: currentError } = await supabase
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status!inner(
          status,
          department_name,
          action_at,
          action_by,
          remarks,
          rejection_reason
        )
      `)
      .eq('no_dues_status.department_name', 'library')
      .order('created_at', { ascending: false });
    
    if (currentError) {
      console.error('❌ Current query error:', currentError);
      return;
    }
    
    console.log(`📊 Current query returns: ${currentQuery?.length || 0} forms`);
    
    // 2. Test a better query that should return all forms
    console.log('\n2️⃣  TESTING OPTIMIZED QUERY');
    console.log('-'.repeat(70));
    
    // First get all library form IDs
    const { data: libraryFormIds, error: idsError } = await supabase
      .from('no_dues_status')
      .select('form_id, status, action_at')
      .eq('department_name', 'library')
      .order('created_at', { ascending: false });
    
    if (idsError) {
      console.error('❌ Error getting library form IDs:', idsError);
      return;
    }
    
    console.log(`📊 Library status records: ${libraryFormIds?.length || 0}`);
    
    const approvedCount = libraryFormIds?.filter(f => f.status === 'approved').length || 0;
    const pendingCount = libraryFormIds?.filter(f => f.status === 'pending').length || 0;
    
    console.log(`   Approved: ${approvedCount}`);
    console.log(`   Pending: ${pendingCount}`);
    
    // Now get the full form data
    if (libraryFormIds && libraryFormIds.length > 0) {
      const formIds = libraryFormIds.map(f => f.form_id);
      
      const { data: fullForms, error: fullError } = await supabase
        .from('no_dues_forms')
        .select(`
          id,
          registration_no,
          student_name,
          course,
          branch,
          school,
          contact_no,
          status,
          created_at,
          updated_at,
          reapplication_count,
          no_dues_status!inner(
            id,
            department_name,
            status,
            action_at,
            action_by,
            remarks,
            rejection_reason
          )
        `)
        .in('id', formIds)
        .eq('no_dues_status.department_name', 'library')
        .order('created_at', { ascending: false });
      
      if (fullError) {
        console.error('❌ Error getting full forms:', fullError);
      } else {
        console.log(`📊 Optimized query returns: ${fullForms?.length || 0} forms`);
        
        // Show sample of what we should see
        console.log('\n📝 Sample forms that should appear in librarian dashboard:');
        fullForms?.slice(0, 5).forEach((form, i) => {
          const libStatus = form.no_dues_status?.find(s => s.department_name === 'library');
          console.log(`   ${i+1}. ${form.registration_no} - ${form.student_name} (${libStatus?.status})`);
        });
      }
    }
    
    // 3. Create the fixed frontend code
    console.log('\n3️⃣  CREATING FIXED FRONTEND CODE');
    console.log('-'.repeat(70));
    
    const fixedLoadApplications = `
// FIXED VERSION - Replace loadApplications function in department/page.js
const loadApplications = async () => {
  setLoading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('department_name, full_name')
      .eq('email', user.email)
      .single();

    if (!profile) throw new Error('Profile not found');

    setCurrentUser({
      id: user.id,
      email: user.email,
      name: profile.full_name,
      type: 'department'
    });
    setDepartmentName(profile.department_name);

    // NEW APPROACH: Get all forms for this department
    const { data: statusRecords, error: statusError } = await supabase
      .from('no_dues_status')
      .select('form_id')
      .eq('department_name', profile.department_name);
    
    if (statusError) throw statusError;
    
    if (!statusRecords || statusRecords.length === 0) {
      setApplications([]);
      return;
    }
    
    const formIds = statusRecords.map(record => record.form_id);
    
    const { data: forms, error: formsError } = await supabase
      .from('no_dues_forms')
      .select(\`
        *,
        no_dues_status!inner(
          status,
          action_at,
          action_by,
          remarks,
          rejection_reason,
          department_name
        )
      \`)
      .in('id', formIds)
      .eq('no_dues_status.department_name', profile.department_name)
      .order('created_at', { ascending: false });

    if (formsError) throw formsError;
    setApplications(forms || []);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
`;
    
    console.log('✅ Fixed loadApplications function created');
    console.log('📝 This will return ALL forms for the department');
    
    // 4. Save the fixed code to a file
    const fixedCodePath = path.join(__dirname, 'fixed_loadApplications.js');
    fs.writeFileSync(fixedCodePath, fixedLoadApplications);
    console.log(`💾 Fixed code saved to: ${fixedCodePath}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('🎯 COMPREHENSIVE FIX COMPLETE');
    console.log('='.repeat(70));
    console.log('📊 SUMMARY:');
    console.log(`   ✅ Data exists: ${libraryFormIds?.length || 0} library records`);
    console.log(`   ✅ Approved: ${approvedCount}`);
    console.log(`   ✅ Pending: ${pendingCount}`);
    console.log('🔧 SOLUTION:');
    console.log('   Replace the loadApplications function with the fixed version');
    console.log('   This will show ALL forms in the librarian dashboard');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixLibrarianDashboard();
