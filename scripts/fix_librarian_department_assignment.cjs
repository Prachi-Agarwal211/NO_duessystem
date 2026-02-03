// Script to fix librarian's assigned_department_ids to match the library department
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixLibrarianDepartmentAssignment() {
  console.log('🔍 Fixing librarian department assignment...\n');

  // Step 1: Find the library department
  console.log('📋 Step 1: Finding library department...');
  const { data: libraryDept, error: deptError } = await supabase
    .from('departments')
    .select('id, name, display_name')
    .ilike('name', 'library')
    .single();

  if (deptError || !libraryDept) {
    console.error('❌ Library department not found:', deptError);
    return;
  }

  console.log(`✅ Found library department: ${libraryDept.name} (ID: ${libraryDept.id})`);

  // Step 2: Find the librarian profile
  console.log('\n📋 Step 2: Finding librarian profile...');
  const { data: librarianProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, assigned_department_ids, department_name')
    .eq('role', 'department');

  if (profileError) {
    console.error('❌ Error fetching profiles:', profileError);
    return;
  }

  console.log(`Found ${librarianProfiles.length} department staff profiles`);
  
  // Find librarian by department_name containing 'library'
  const librarianProfile = librarianProfiles.find(p => 
    p.department_name?.toLowerCase().includes('library') || 
    p.email?.toLowerCase().includes('librarian')
  );

  if (!librarianProfile) {
    console.log('\n🔍 Searching all profiles for librarian...');
    
    // List all profiles to find librarian
    for (const profile of librarianProfiles) {
      console.log(`  - ${profile.full_name} (${profile.email}): dept=${profile.department_name}, role=${profile.role}`);
      console.log(`    assigned_department_ids: ${JSON.stringify(profile.assigned_department_ids)}`);
    }
    
    console.log('\n⚠️ No librarian profile found with department_name containing "library"');
    console.log('   Checking if any profile needs library assignment...');
    
    // Try to find any profile that's likely the librarian
    const likelyLibrarian = librarianProfiles.find(p => 
      p.email?.toLowerCase().includes('library') ||
      p.full_name?.toLowerCase().includes('library')
    );
    
    if (likelyLibrarian) {
      console.log(`\n✅ Found likely librarian: ${likelyLibrarian.full_name} (${likelyLibrarian.email})`);
      await updateLibrarianProfile(likelyLibrarian, libraryDept.id);
    } else {
      console.log('\n❌ Could not identify librarian profile');
      console.log('\nTo fix manually, run:');
      console.log(`UPDATE profiles SET assigned_department_ids = '["${libraryDept.id}"]' WHERE id = 'librarian_profile_id';`);
    }
    return;
  }

  await updateLibrarianProfile(librarianProfile, libraryDept.id);
}

async function updateLibrarianProfile(profile, libraryDeptId) {
  console.log(`\n📋 Step 3: Updating librarian profile...`);
  console.log(`   Current profile:`);
  console.log(`   - ID: ${profile.id}`);
  console.log(`   - Name: ${profile.full_name}`);
  console.log(`   - Email: ${profile.email}`);
  console.log(`   - Current assigned_department_ids: ${JSON.stringify(profile.assigned_department_ids)}`);
  console.log(`   - Library department ID needed: ${libraryDeptId}`);

  // Check if already correct
  const currentIds = profile.assigned_department_ids || [];
  if (currentIds.includes(libraryDeptId)) {
    console.log('\n✅ Librarian already has correct department assignment!');
    return;
  }

  // Add library department ID to assigned_department_ids
  const newAssignedIds = [...currentIds, libraryDeptId];

  console.log(`\n📝 Updating assigned_department_ids to: ${JSON.stringify(newAssignedIds)}`);

  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({ assigned_department_ids: newAssignedIds })
    .eq('id', profile.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating profile:', updateError);
    return;
  }

  console.log('\n✅ Librarian profile updated successfully!');
  console.log(`   New assigned_department_ids: ${JSON.stringify(updatedProfile.assigned_department_ids)}`);

  // Verify the fix
  console.log('\n📋 Step 4: Verifying the fix...');
  const { data: verifyProfile, error: verifyError } = await supabase
    .from('profiles')
    .select('id, full_name, assigned_department_ids')
    .eq('id', profile.id)
    .single();

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError);
    return;
  }

  const isFixed = verifyProfile.assigned_department_ids?.includes(libraryDeptId);
  if (isFixed) {
    console.log('✅ Verification passed! Librarian can now access library department.');
  } else {
    console.log('❌ Verification failed! Department ID still not in assigned_department_ids.');
  }
}

// Also fix any other department staff who might have wrong assignments
async function fixAllDepartmentAssignments() {
  console.log('\n\n🔍 Fixing all department staff assignments...\n');

  // Get all departments
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('id, name');

  if (deptError) {
    console.error('❌ Error fetching departments:', deptError);
    return;
  }

  console.log('Available departments:');
  departments.forEach(d => console.log(`  - ${d.name}: ${d.id}`));

  // Get all department staff profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, department_name, assigned_department_ids')
    .eq('role', 'department');

  if (profileError) {
    console.error('❌ Error fetching profiles:', profileError);
    return;
  }

  console.log(`\nFound ${profiles.length} department staff profiles:`);
  
  for (const profile of profiles) {
    const deptName = profile.department_name;
    if (!deptName) continue;

    // Find matching department
    const matchingDept = departments.find(d => 
      d.name.toLowerCase() === deptName.toLowerCase() ||
      d.name.toLowerCase().includes(deptName.toLowerCase()) ||
      deptName.toLowerCase().includes(d.name.toLowerCase())
    );

    if (!matchingDept) {
      console.log(`\n⚠️ No matching department found for: ${profile.full_name} (dept: ${deptName})`);
      continue;
    }

    const currentIds = profile.assigned_department_ids || [];
    if (currentIds.includes(matchingDept.id)) {
      console.log(`✅ ${profile.full_name}: Already has correct assignment for ${matchingDept.name}`);
      continue;
    }

    console.log(`\n📝 ${profile.full_name}: Needs update for ${matchingDept.name}`);
    console.log(`   Current: ${JSON.stringify(currentIds)}`);
    console.log(`   Needed: ${matchingDept.id}`);

    const newAssignedIds = [...currentIds, matchingDept.id];
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ assigned_department_ids: newAssignedIds })
      .eq('id', profile.id);

    if (updateError) {
      console.error(`❌ Error updating ${profile.full_name}:`, updateError);
    } else {
      console.log(`✅ Updated ${profile.full_name}`);
    }
  }
}

// Run the fix
async function main() {
  try {
    await fixLibrarianDepartmentAssignment();
    await fixAllDepartmentAssignments();
    console.log('\n\n🎉 All fixes completed!');
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

main();
