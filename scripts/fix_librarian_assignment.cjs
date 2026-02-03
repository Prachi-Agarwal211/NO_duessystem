// Fix Librarian Department Assignment - CommonJS Version
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

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fixLibrarianAssignment() {
  console.log('🔧 FIXING LIBRARIAN DEPARTMENT ASSIGNMENT\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Get library department
    console.log('📚 Step 1: Finding library department...');
    const { data: libraryDept, error: deptError } = await supabase
      .from('departments')
      .select('id, name, display_name')
      .ilike('name', 'library')
      .single();

    if (deptError || !libraryDept) {
      console.error('❌ Library department not found:', deptError);
      return;
    }

    console.log(`✅ Found: ${libraryDept.name} (ID: ${libraryDept.id})`);

    // 2. Find librarian profile
    console.log('\n👤 Step 2: Finding librarian profile...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, assigned_department_ids, department_name')
      .eq('role', 'department');

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError);
      return;
    }

    console.log(`Found ${profiles.length} department staff profiles`);

    // Find librarian
    const librarianProfile = profiles.find(p => 
      p.email?.toLowerCase().includes('librarian') ||
      p.department_name?.toLowerCase().includes('library')
    );

    if (!librarianProfile) {
      console.log('\n❌ Librarian profile not found');
      console.log('Available department staff:');
      profiles.forEach(p => {
        console.log(`  - ${p.full_name} (${p.email}) - Dept: ${p.department_name}`);
      });
      return;
    }

    console.log(`✅ Found librarian: ${librarianProfile.full_name} (${librarianProfile.email})`);
    console.log(`   Current department: ${librarianProfile.department_name}`);
    console.log(`   Current assigned IDs: ${JSON.stringify(librarianProfile.assigned_department_ids)}`);

    // 3. Check if needs fixing
    const currentIds = librarianProfile.assigned_department_ids || [];
    const needsFix = !currentIds.includes(libraryDept.id);

    if (!needsFix) {
      console.log('\n✅ Librarian already has correct department assignment!');
      return;
    }

    // 4. Fix the assignment
    console.log('\n🔧 Step 3: Fixing department assignment...');
    const newAssignedIds = [...currentIds, libraryDept.id];

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ assigned_department_ids: newAssignedIds })
      .eq('id', librarianProfile.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
      return;
    }

    console.log('✅ Profile updated successfully!');
    console.log(`   New assigned IDs: ${JSON.stringify(updatedProfile.assigned_department_ids)}`);

    // 5. Verify the fix
    console.log('\n🔍 Step 4: Verification...');
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('assigned_department_ids')
      .eq('id', librarianProfile.id)
      .single();

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return;
    }

    const isFixed = verifyProfile.assigned_department_ids?.includes(libraryDept.id);
    console.log(`✅ Verification: ${isFixed ? 'PASSED' : 'FAILED'}`);

    // 6. Test librarian query
    console.log('\n📊 Step 5: Testing librarian data access...');
    const { data: testData, error: testError } = await supabase
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status!inner(
          status,
          department_name
        )
      `)
      .eq('no_dues_status.department_name', 'library')
      .limit(5);

    if (testError) {
      console.error('❌ Librarian query test failed:', testError);
    } else {
      console.log(`✅ Librarian can access ${testData.length} forms`);
      testData.forEach((form, index) => {
        console.log(`   ${index + 1}. ${form.registration_no} - ${form.student_name} - Status: ${form.no_dues_status[0]?.status}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 LIBRARIAN ASSIGNMENT FIX COMPLETE!');
    console.log('='.repeat(70));
    console.log('   Librarian should now be able to see all library department data');

  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

// Run the fix
fixLibrarianAssignment().catch(console.error);
