// Script to read and display departments, profiles, and auth_users
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

async function readDatabaseStructure() {
  try {
    console.log('🔍 READING DATABASE STRUCTURE...\n');
    console.log('=' .repeat(80));

    // 1. READ DEPARTMENTS
    console.log('\n📋 TABLE: departments');
    console.log('-'.repeat(80));
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name, display_name, created_at')
      .order('name');

    if (deptError) {
      console.log('❌ Error reading departments:', deptError.message);
    } else {
      console.log(`Found ${departments.length} departments:\n`);
      departments.forEach((dept, index) => {
        console.log(`${index + 1}. ${dept.name} (${dept.display_name})`);
        console.log(`   ID: ${dept.id}`);
        console.log(`   Created: ${dept.created_at}`);
        console.log('');
      });
    }

    // 2. READ PROFILES
    console.log('\n📋 TABLE: profiles');
    console.log('-'.repeat(80));
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, department_name, assigned_department_ids')
      .order('role', { ascending: false })
      .order('department_name', { ascending: true });

    if (profileError) {
      console.log('❌ Error reading profiles:', profileError.message);
    } else {
      console.log(`Found ${profiles.length} profiles:\n`);
      
      // Group by role
      const adminProfiles = profiles.filter(p => p.role === 'admin');
      const departmentProfiles = profiles.filter(p => p.role === 'department');
      const studentProfiles = profiles.filter(p => p.role === 'student');
      const otherProfiles = profiles.filter(p => !['admin', 'department', 'student'].includes(p.role));

      console.log('👨‍💼 ADMIN PROFILES:');
      if (adminProfiles.length === 0) {
        console.log('   None found');
      } else {
        adminProfiles.forEach((profile, index) => {
          console.log(`${index + 1}. ${profile.full_name} (${profile.email})`);
          console.log(`   ID: ${profile.id}`);
          console.log(`   Assigned Depts: ${JSON.stringify(profile.assigned_department_ids)}`);
          console.log('');
        });
      }

      console.log('\n👨‍💻 DEPARTMENT STAFF PROFILES:');
      if (departmentProfiles.length === 0) {
        console.log('   None found');
      } else {
        departmentProfiles.forEach((profile, index) => {
          console.log(`${index + 1}. ${profile.full_name} (${profile.email})`);
          console.log(`   ID: ${profile.id}`);
          console.log(`   Department: ${profile.department_name}`);
          console.log(`   Assigned Dept IDs: ${JSON.stringify(profile.assigned_department_ids)}`);
          console.log('');
        });
      }

      console.log('\n👨‍🎓 STUDENT PROFILES:');
      console.log(`   Count: ${studentProfiles.length}`);
      if (studentProfiles.length > 0) {
        console.log('   Sample (first 5):');
        studentProfiles.slice(0, 5).forEach((profile, index) => {
          console.log(`   ${index + 1}. ${profile.full_name} (${profile.email}) - ID: ${profile.id}`);
        });
      }
      console.log('');

      if (otherProfiles.length > 0) {
        console.log('\n❓ OTHER PROFILES:');
        otherProfiles.forEach((profile, index) => {
          console.log(`${index + 1}. ${profile.full_name} (${profile.email}) - Role: ${profile.role}`);
        });
      }
    }

    // 3. READ AUTH USERS
    console.log('\n📋 AUTH USERS (from auth.users)');
    console.log('-'.repeat(80));
    
    // Note: We can't directly query auth.users with service role through the JS client
    // But we can list users through the admin API
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.log('❌ Error reading auth users:', authError.message);
      } else {
        const users = authUsers.users || [];
        console.log(`Found ${users.length} auth users:\n`);
        
        users.forEach((user, index) => {
          console.log(`${index + 1}. ${user.email}`);
          console.log(`   ID: ${user.id}`);
          console.log(`   Created: ${user.created_at}`);
          console.log(`   Last Sign In: ${user.last_sign_in_at || 'Never'}`);
          console.log('');
        });
      }
    } catch (e) {
      console.log('❌ Cannot list auth users (may need different permissions):', e.message);
      console.log('   Note: Service role key may not have permission to list users');
    }

    // 4. CHECK NO_DUES_STATUS FORMS (to see which departments are involved)
    console.log('\n📋 TABLE: no_dues_status (recent entries)');
    console.log('-'.repeat(80));
    const { data: statusRecords, error: statusError } = await supabase
      .from('no_dues_status')
      .select('id, form_id, department_name, status, action_by_user_id')
      .order('created_at', { ascending: false })
      .limit(20);

    if (statusError) {
      console.log('❌ Error reading no_dues_status:', statusError.message);
    } else {
      console.log(`Found ${statusRecords.length} recent status records:\n`);
      statusRecords.forEach((record, index) => {
        console.log(`${index + 1}. Form: ${record.form_id} | Dept: ${record.department_name} | Status: ${record.status}`);
        console.log(`   Action By: ${record.action_by_user_id || 'Pending'}`);
      });
    }

    // 5. SUMMARY OF THE ISSUE
    console.log('\n' + '=' .repeat(80));
    console.log('🔍 ANALYSIS SUMMARY');
    console.log('=' .repeat(80));
    
    if (departments && profiles) {
      const libraryDept = departments.find(d => d.name.toLowerCase().includes('library'));
      const librarianProfile = departmentProfiles.find(p => 
        p.department_name?.toLowerCase().includes('library') ||
        p.email?.toLowerCase().includes('library')
      );

      console.log('\n📚 LIBRARY DEPARTMENT:');
      if (libraryDept) {
        console.log(`   Name: ${libraryDept.name}`);
        console.log(`   ID: ${libraryDept.id}`);
      } else {
        console.log('   ❌ Library department not found!');
      }

      console.log('\n👤 LIBRARIAN PROFILE:');
      if (librarianProfile) {
        console.log(`   Name: ${librarianProfile.full_name}`);
        console.log(`   Email: ${librarianProfile.email}`);
        console.log(`   Department: ${librarianProfile.department_name}`);
        console.log(`   Assigned Dept IDs: ${JSON.stringify(librarianProfile.assigned_department_ids)}`);
        
        if (libraryDept) {
          const hasCorrectDept = librarianProfile.assigned_department_ids?.includes(libraryDept.id);
          console.log(`\n   🔍 Has library dept ID in assigned_department_ids: ${hasCorrectDept ? '✅ YES' : '❌ NO'}`);
          
          if (!hasCorrectDept) {
            console.log('\n   ⚠️  THIS IS THE ISSUE!');
            console.log(`   The librarian needs their assigned_department_ids updated to include: ${libraryDept.id}`);
          }
        }
      } else {
        console.log('   ❌ Librarian profile not found!');
        console.log('   Available department staff:');
        departmentProfiles.forEach(p => {
          console.log(`   - ${p.full_name} (${p.email}) - dept: ${p.department_name}`);
        });
      }
    }

    console.log('\n' + '=' .repeat(80));
    console.log('🎯 RECOMMENDATIONS:');
    console.log('=' .repeat(80));
    
    if (departments && libraryDept && librarianProfile) {
      const hasCorrectDept = librarianProfile.assigned_department_ids?.includes(libraryDept.id);
      if (!hasCorrectDept) {
        console.log('\n1. Fix librarian profile by adding library department ID to assigned_department_ids');
        console.log(`   SQL Command: UPDATE profiles SET assigned_department_ids = '["${libraryDept.id}"]' WHERE id = '${librarianProfile.id}';`);
      } else {
        console.log('\n1. Librarian profile appears correct. Check other issues.');
      }
    }
    
    console.log('\n2. Verify the staff action API authorization logic');
    console.log('3. Check if there are any other department staff with incorrect assignments');

    console.log('\n' + '=' .repeat(80));

  } catch (error) {
    console.error('💥 Error reading database structure:', error);
  }
}

readDatabaseStructure();
