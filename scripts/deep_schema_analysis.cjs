// Deep analysis of the complete schema and relationships
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

async function deepSchemaAnalysis() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║              DEEP SCHEMA & RELATIONSHIP ANALYSIS                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Get all tables and their structures
    console.log('1️⃣  ANALYZING ALL TABLES');
    console.log('-'.repeat(70));
    
    const tables = [
      'no_dues_forms',
      'no_dues_status', 
      'no_dues_messages',
      'profiles',
      'departments',
      'auth.users'
    ];
    
    for (const tableName of tables) {
      console.log(`\n📋 TABLE: ${tableName}`);
      console.log('-'.repeat(50));
      
      try {
        let query;
        if (tableName === 'auth.users') {
          // Handle auth.users differently
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          if (authUsers && authUsers.users && authUsers.users.length > 0) {
            const sampleUser = authUsers.users[0];
            console.log('   Columns:', Object.keys(sampleUser).join(', '));
            console.log('   Sample:', {
              id: sampleUser.id,
              email: sampleUser.email,
              created_at: sampleUser.created_at
            });
          }
        } else {
          // Get sample data to understand structure
          const { data: sampleData, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (error) {
            console.log(`   ❌ Error: ${error.message}`);
          } else if (sampleData && sampleData.length > 0) {
            console.log('   Columns:', Object.keys(sampleData[0]).join(', '));
            console.log('   Sample Data:', sampleData[0]);
            
            // Get count
            const { count, error: countError } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true });
            
            if (!countError) {
              console.log(`   Total Records: ${count || 0}`);
            }
          } else {
            console.log('   ⚠️  No data found');
          }
        }
      } catch (e) {
        console.log(`   ❌ Exception: ${e.message}`);
      }
    }
    
    // 2. Analyze relationships between forms and status
    console.log('\n2️⃣  ANALYZING FORM-STATUS RELATIONSHIPS');
    console.log('-'.repeat(70));
    
    // Get a sample form with all its status records
    const { data: sampleFormWithStatus, error: formStatusError } = await supabase
      .from('no_dues_forms')
      .select(`
        id,
        registration_no,
        student_name,
        status,
        no_dues_status (
          id,
          department_name,
          status,
          action_at,
          action_by,
          created_at
        )
      `)
      .limit(3);
    
    if (formStatusError) {
      console.error('❌ Error getting form-status relationships:', formStatusError);
    } else {
      sampleFormWithStatus?.forEach((form, i) => {
        console.log(`\n📝 Form ${i+1}: ${form.registration_no}`);
        console.log(`   Form Status: ${form.status}`);
        console.log(`   Status Records: ${form.no_dues_status?.length || 0}`);
        
        if (form.no_dues_status) {
          form.no_dues_status.forEach((status, idx) => {
            console.log(`   [${idx}] ${status.department_name}: ${status.status} (Action: ${status.action_at || 'Pending'})`);
          });
        }
      });
    }
    
    // 3. Check library department specifically
    console.log('\n3️⃣  LIBRARY DEPARTMENT DEEP DIVE');
    console.log('-'.repeat(70));
    
    const { data: libraryDept, error: libraryError } = await supabase
      .from('departments')
      .select('*')
      .eq('name', 'library')
      .single();
    
    if (libraryError) {
      console.error('❌ Error finding library department:', libraryError);
    } else {
      console.log('📚 Library Department:', libraryDept);
    }
    
    // Get all library status records
    const { data: libraryStatus, error: libStatusError } = await supabase
      .from('no_dues_status')
      .select(`
        form_id,
        status,
        action_at,
        created_at,
        no_dues_forms!inner(
          registration_no,
          student_name,
          status as form_status
        )
      `)
      .eq('department_name', 'library')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (libStatusError) {
      console.error('❌ Error getting library status:', libStatusError);
    } else {
      console.log(`\n📊 Library Status Records (showing 10 of ${libraryStatus?.length || 0}):`);
      libraryStatus?.forEach((record, i) => {
        console.log(`   ${i+1}. ${record.no_dues_forms.registration_no} - ${record.no_dues_forms.student_name}`);
        console.log(`      Form Status: ${record.no_dues_forms.form_status}`);
        console.log(`      Library Status: ${record.status}`);
        console.log(`      Created: ${record.created_at}`);
        console.log(`      Action: ${record.action_at || 'Pending'}`);
      });
    }
    
    // 4. Test different query approaches
    console.log('\n4️⃣  TESTING DIFFERENT QUERY APPROACHES');
    console.log('-'.repeat(70));
    
    // Approach 1: Current frontend query
    console.log('\n🔍 Approach 1: Current Frontend Query');
    const { data: approach1, error: error1 } = await supabase
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
    
    console.log(`   Results: ${approach1?.length || 0} forms`);
    console.log(`   Error: ${error1?.message || 'None'}`);
    
    // Approach 2: Using subquery
    console.log('\n🔍 Approach 2: Using Subquery');
    const { data: libraryFormIds, error: idsError } = await supabase
      .from('no_dues_status')
      .select('form_id')
      .eq('department_name', 'library');
    
    if (!idsError && libraryFormIds) {
      const formIds = libraryFormIds.map(f => f.form_id);
      const { data: approach2, error: error2 } = await supabase
        .from('no_dues_forms')
        .select('*')
        .in('id', formIds)
        .limit(5);
      
      console.log(`   Results: ${approach2?.length || 0} forms`);
      console.log(`   Error: ${error2?.message || 'None'}`);
    }
    
    // 5. Check librarian profiles
    console.log('\n5️⃣  LIBRARIAN PROFILES ANALYSIS');
    console.log('-'.repeat(70));
    
    const { data: librarianProfiles, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .or('department_name.eq.library,assigned_department_ids.cs.{library}');
    
    if (profError) {
      console.error('❌ Error getting librarian profiles:', profError);
    } else {
      console.log(`👥 Found ${librarianProfiles?.length || 0} librarian profiles:`);
      librarianProfiles?.forEach((profile, i) => {
        console.log(`   ${i+1}. ${profile.email}`);
        console.log(`      Name: ${profile.full_name}`);
        console.log(`      Department: ${profile.department_name}`);
        console.log(`      Assigned: ${profile.assigned_department_ids?.join(', ') || 'None'}`);
        console.log(`      Profile ID: ${profile.id}`);
      });
    }
    
    // 6. Summary and recommendations
    console.log('\n6️⃣  SUMMARY & RECOMMENDATIONS');
    console.log('-'.repeat(70));
    
    const { count: totalForms, error: totalError } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true });
    
    const { count: libraryStatusCount, error: libCountError } = await supabase
      .from('no_dues_status')
      .select('*', { count: 'exact', head: true })
      .eq('department_name', 'library');
    
    const { count: approvedLibraryCount, error: approvedError } = await supabase
      .from('no_dues_status')
      .select('*', { count: 'exact', head: true })
      .eq('department_name', 'library')
      .eq('status', 'approved');
    
    console.log('📊 CURRENT STATE:');
    console.log(`   Total Forms: ${totalForms || 0}`);
    console.log(`   Library Status Records: ${libraryStatusCount || 0}`);
    console.log(`   Library Approved: ${approvedLibraryCount || 0}`);
    
    console.log('\n🎯 ISSUES IDENTIFIED:');
    if ((totalForms || 0) > 0 && (libraryStatusCount || 0) === 0) {
      console.log('   ❌ NO library status records exist for forms');
    }
    if ((libraryStatusCount || 0) > 0 && (approvedLibraryCount || 0) === 0) {
      console.log('   ❌ NO library approved records exist');
    }
    if ((libraryStatusCount || 0) > 0 && (approvedLibraryCount || 0) > 0) {
      console.log('   ✅ Data exists - issue is likely in frontend query logic');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 DEEP SCHEMA ANALYSIS COMPLETE');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deepSchemaAnalysis();
