// Create librarian.jecrcu.edu.in account with same access
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

async function createLibrarianDotAccount() {
  console.log('👤 CREATING LIBRARIAN.JECRCU.EDU.IN ACCOUNT\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Get library department info
    const { data: libraryDept, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .ilike('name', 'library')
      .single();

    if (deptError || !libraryDept) {
      console.error('❌ Library department not found:', deptError);
      return;
    }

    console.log(`✅ Library Department: ${libraryDept.name} (ID: ${libraryDept.id})`);

    // 2. Create the auth user for librarian.jecrcu.edu.in
    console.log('\n🔐 Step 1: Creating auth user...');
    
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'librarian.jecrcu.edu.in',
        password: 'Librarian@2026', // You should change this password
        email_confirm: true,
        user_metadata: {
          full_name: 'Librarian',
          role: 'department',
          department: 'library'
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log('✅ Auth user already exists');
          
          // Get existing user
          const { data: users } = await supabase.auth.admin.listUsers();
          const existingUser = users.users.find(u => u.email === 'librarian.jecrcu.edu.in');
          
          if (existingUser) {
            console.log(`   User ID: ${existingUser.id}`);
            
            // Create profile for existing user
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: existingUser.id,
                email: existingUser.email,
                full_name: 'Librarian',
                role: 'department',
                department_name: 'library',
                assigned_department_ids: [libraryDept.id],
                created_at: existingUser.created_at,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'id'
              });
              
            if (profileError) {
              console.error('❌ Error creating profile:', profileError.message);
            } else {
              console.log('✅ Profile created/updated for existing user');
            }
          }
        } else {
          console.error('❌ Error creating auth user:', authError.message);
          return;
        }
      } else {
        console.log('✅ Auth user created successfully');
        console.log(`   User ID: ${authData.user.id}`);
        
        // Create profile for new user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: authData.user.email,
            full_name: 'Librarian',
            role: 'department',
            department_name: 'library',
            assigned_department_ids: [libraryDept.id],
            created_at: authData.user.created_at,
            updated_at: new Date().toISOString()
          });
          
        if (profileError) {
          console.error('❌ Error creating profile:', profileError.message);
        } else {
          console.log('✅ Profile created for new user');
        }
      }
    } catch (createError) {
      console.error('❌ Error in user creation:', createError.message);
      return;
    }

    // 3. Verify both librarian accounts
    console.log('\n🔍 Step 2: Verifying both librarian accounts...');
    
    const { data: librarianProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .or('email.eq.librarian@jecrcu.edu.in,email.eq.librarian.jecrcu.edu.in')
      .eq('role', 'department');

    if (verifyError) {
      console.error('❌ Error verifying profiles:', verifyError);
    } else {
      console.log(`Found ${librarianProfiles.length} librarian profiles:`);
      
      librarianProfiles.forEach((profile, index) => {
        console.log(`\n${index + 1}. ${profile.full_name}`);
        console.log(`   Email: ${profile.email}`);
        console.log(`   Department: ${profile.department_name}`);
        console.log(`   Has Library Access: ${profile.assigned_department_ids?.includes(libraryDept.id) ? '✅ YES' : '❌ NO'}`);
        console.log(`   Assigned IDs: ${JSON.stringify(profile.assigned_department_ids)}`);
      });
    }

    // 4. Test data access
    console.log('\n📊 Step 3: Testing library data access...');
    
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
      .order('created_at', { ascending: false });

    if (testError) {
      console.error('❌ Error testing data access:', testError);
    } else {
      const approvedCount = testData.filter(d => d.no_dues_status[0]?.status === 'approved').length;
      const pendingCount = testData.filter(d => d.no_dues_status[0]?.status === 'pending').length;
      
      console.log(`✅ Library data access test:`);
      console.log(`   Total forms: ${testData.length}`);
      console.log(`   Approved: ${approvedCount}`);
      console.log(`   Pending: ${pendingCount}`);
    }

    // 5. Instructions
    console.log('\n' + '='.repeat(70));
    console.log('🎉 LIBRARIAN.JECRCU.EDU.IN ACCOUNT SETUP COMPLETE!');
    console.log('='.repeat(70));
    console.log('\n📋 ACCOUNT DETAILS:');
    console.log('   Email: librarian.jecrcu.edu.in');
    console.log('   Password: Librarian@2026 (CHANGE THIS!)');
    console.log('   Department: Library');
    console.log('   Role: Department Staff');
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Change the password for security');
    console.log('2. Test login at /staff/login');
    console.log('3. Verify access to library dashboard');
    console.log('4. Both accounts should see identical data');
    
    console.log('\n✅ Both librarian@jecrcu.edu.in and librarian.jecrcu.edu.in');
    console.log('   now have access to the same library department data!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
createLibrarianDotAccount().catch(console.error);
