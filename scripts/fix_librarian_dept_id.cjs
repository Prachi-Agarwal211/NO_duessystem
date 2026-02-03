// Script to fix the librarian's assigned_department_ids
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
const envFile = path.join(__dirname, '../.env.local');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
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

// Initialize Supabase with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixLibrarianDepartmentId() {
  console.log('🔧 FIXING LIBRARIAN DEPARTMENT ID...\n');

  // Step 1: Get the library department
  console.log('📋 Step 1: Finding library department...');
  const { data: libraryDept, error: deptError } = await supabase
    .from('departments')
    .select('id, name')
    .ilike('name', 'library')
    .single();

  if (deptError || !libraryDept) {
    console.error('❌ Library department not found:', deptError);
    return;
  }

  console.log(`✅ Found library department: ${libraryDept.name}`);
  console.log(`   ID: ${libraryDept.id}`);

  // Step 2: Get the librarian profile
  console.log('\n📋 Step 2: Finding librarian profile (librarian@jecrcu.edu.in)...');
  const { data: librarianProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, assigned_department_ids')
    .eq('email', 'librarian@jecrcu.edu.in')
    .single();

  if (profileError || !librarianProfile) {
    console.error('❌ Librarian profile not found:', profileError);
    return;
  }

  console.log(`✅ Found librarian profile: ${librarianProfile.full_name}`);
  console.log(`   ID: ${librarianProfile.id}`);
  console.log(`   Current assigned_department_ids: ${JSON.stringify(librarianProfile.assigned_department_ids)}`);

  // Step 3: Check if the ID is already correct
  const currentIds = librarianProfile.assigned_department_ids || [];
  if (currentIds.includes(libraryDept.id)) {
    console.log('\n✅ Librarian already has correct department ID!');
    return;
  }

  // Step 4: Update the profile
  const newAssignedIds = [...currentIds, libraryDept.id];
  console.log(`\n📋 Step 3: Updating librarian profile...`);
  console.log(`   New assigned_department_ids: ${JSON.stringify(newAssignedIds)}`);

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

  console.log('\n✅ Librarian profile updated successfully!');
  console.log(`   New assigned_department_ids: ${JSON.stringify(updatedProfile.assigned_department_ids)}`);

  // Step 5: Verify the fix
  console.log('\n📋 Step 4: Verifying the fix...');
  const { data: verifyProfile, error: verifyError } = await supabase
    .from('profiles')
    .select('id, email, assigned_department_ids')
    .eq('id', librarianProfile.id)
    .single();

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError);
    return;
  }

  const isFixed = verifyProfile.assigned_department_ids?.includes(libraryDept.id);
  if (isFixed) {
    console.log('✅ VERIFICATION PASSED!');
    console.log('   The librarian can now approve/reject forms for the library department.');
  } else {
    console.log('❌ VERIFICATION FAILED!');
    console.log('   The library department ID is still not in assigned_department_ids.');
  }

  console.log('\n' + '='.repeat(80));
  console.log('🔍 SUMMARY OF ISSUE FIXED:');
  console.log('='.repeat(80));
  console.log('The librarian profile had assigned_department_ids containing a WRONG ID.');
  console.log(`   Old ID: ${currentIds[0] || 'none'}`);
  console.log(`   Correct Library Department ID: ${libraryDept.id}`);
  console.log(`   New assigned_department_ids: ${JSON.stringify(verifyProfile.assigned_department_ids)}`);
  console.log('\nThis should fix the 403 authorization error when trying to approve/reject forms.');
  console.log('='.repeat(80));
}

fixLibrarianDepartmentId().catch(console.error);
