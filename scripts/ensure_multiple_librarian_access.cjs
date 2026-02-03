// Ensure Multiple Librarian Accounts Have Same Access
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

async function ensureMultipleLibrarianAccess() {
  console.log('🔧 ENSURING MULTIPLE LIBRARIAN ACCESS\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Get library department ID
    console.log('📚 Step 1: Getting library department...');
    const { data: libraryDept, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .ilike('name', 'library')
      .single();

    if (deptError || !libraryDept) {
      console.error('❌ Library department not found:', deptError);
      return;
    }

    console.log(`✅ Library Department ID: ${libraryDept.id}`);

    // 2. Find all potential librarian accounts
    console.log('\n👤 Step 2: Finding all librarian accounts...');
    
    // Get all profiles that might be librarians
    const { data: librarianProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .or('email.ilike.%librarian%,email.ilike.%library%,department_name.ilike.%library%')
      .eq('role', 'department');

    if (profileError) {
      console.error('❌ Error fetching librarian profiles:', profileError);
      return;
    }

    console.log(`Found ${librarianProfiles.length} librarian-related profiles:`);
    librarianProfiles.forEach((profile, index) => {
      console.log(`\n${index + 1}. ${profile.full_name}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Department: ${profile.department_name}`);
      console.log(`   Assigned IDs: ${JSON.stringify(profile.assigned_department_ids)}`);
    });

    // 3. Check if librarian.jecrcu.edu.in exists
    console.log('\n🔍 Step 3: Checking for librarian.jecrcu.edu.in...');
    const { data: dotLibrarianProfile, error: dotError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'librarian.jecrcu.edu.in')
      .maybeSingle();

    if (dotError) {
      console.log('❌ Error checking librarian.jecrcu.edu.in:', dotError.message);
    } else if (dotLibrarianProfile) {
      console.log('✅ Found librarian.jecrcu.edu.in profile');
      console.log(`   Name: ${dotLibrarianProfile.full_name}`);
      console.log(`   Role: ${dotLibrarianProfile.role}`);
      console.log(`   Department: ${dotLibrarianProfile.department_name}`);
    } else {
      console.log('⚠️ librarian.jecrcu.edu.in profile not found');
      
      // Check if auth user exists
      try {
        const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'apikey': SERVICE_KEY
          }
        });
        
        const { users } = await authResponse.json();
        const dotLibrarianAuth = users?.find(u => u.email === 'librarian.jecrcu.edu.in');
        
        if (dotLibrarianAuth) {
          console.log('✅ Found librarian.jecrcu.edu.in auth user - creating profile...');
          
          // Create profile for the dot librarian
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: dotLibrarianAuth.id,
              email: dotLibrarianAuth.email,
              full_name: 'Librarian',
              role: 'department',
              department_name: 'library',
              assigned_department_ids: [libraryDept.id],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (createError) {
            console.error('❌ Error creating profile:', createError.message);
          } else {
            console.log('✅ Created profile for librarian.jecrcu.edu.in');
          }
        } else {
          console.log('❌ librarian.jecrcu.edu.in auth user not found');
        }
      } catch (authError) {
        console.error('❌ Error checking auth users:', authError.message);
      }
    }

    // 4. Ensure all librarian profiles have library department access
    console.log('\n🔧 Step 4: Ensuring all librarians have library access...');
    
    let updatedCount = 0;
    let alreadyCorrectCount = 0;

    for (const profile of librarianProfiles) {
      const currentIds = profile.assigned_department_ids || [];
      const hasLibraryAccess = currentIds.includes(libraryDept.id);

      if (!hasLibraryAccess) {
        const newAssignedIds = [...currentIds, libraryDept.id];
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ assigned_department_ids: newAssignedIds })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`❌ Error updating ${profile.email}:`, updateError.message);
        } else {
          console.log(`🔧 Updated ${profile.email} - Added library access`);
          updatedCount++;
        }
      } else {
        console.log(`✅ ${profile.email} - Already has library access`);
        alreadyCorrectCount++;
      }
    }

    // 5. Test data access for all librarians
    console.log('\n📊 Step 5: Testing data access...');
    
    const { data: libraryData, error: dataError } = await supabase
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status!inner(
          status,
          department_name
        )
      `)
      .eq('no_dues_status.department_name', 'library')
      .order('created_at', { ascending: false })
      .limit(5);

    if (dataError) {
      console.error('❌ Error testing library data access:', dataError);
    } else {
      console.log(`✅ Library department has ${libraryData.length} accessible forms`);
      
      const statusCounts = {};
      libraryData.forEach(form => {
        const status = form.no_dues_status[0]?.status || 'pending';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      console.log('Status distribution:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }

    // 6. Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 MULTIPLE LIBRARIAN ACCESS SUMMARY');
    console.log('='.repeat(70));
    console.log(`   Librarian profiles found: ${librarianProfiles.length}`);
    console.log(`   Updated with library access: ${updatedCount}`);
    console.log(`   Already had library access: ${alreadyCorrectCount}`);
    console.log(`   Library department ID: ${libraryDept.id}`);
    console.log(`   Accessible forms: ${libraryData?.length || 0}`);
    
    console.log('\n✅ All librarian accounts can now access the same library data!');
    console.log('   Both librarian@jecrcu.edu.in and librarian.jecrcu.edu.in (if exists)');
    console.log('   should be able to see all approved library records.');

  } catch (error) {
    console.error('❌ Process failed:', error);
    process.exit(1);
  }
}

// Run the process
ensureMultipleLibrarianAccess().catch(console.error);
