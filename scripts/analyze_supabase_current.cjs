// Analyze Current Supabase Database Structure
// Check existing data before migration

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
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function analyzeDatabase() {
  console.log('🔍 ANALYZING CURRENT SUPABASE DATABASE\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Check no_dues_forms table
    console.log('\n1️⃣  NO_DUES_FORMS TABLE');
    console.log('-'.repeat(70));
    
    const { data: forms, error: formsError } = await supabase
      .from('no_dues_forms')
      .select('*')
      .limit(5);
      
    if (formsError) {
      console.error('❌ Error accessing no_dues_forms:', formsError);
    } else {
      console.log(`✅ Total forms count: ${forms?.length || 0} (showing first 5)`);
      
      if (forms && forms.length > 0) {
        console.log('\nSample form structure:');
        Object.keys(forms[0]).forEach(key => {
          console.log(`   ${key}: ${typeof forms[0][key]}`);
        });
        
        console.log('\nSample records:');
        forms.forEach((form, index) => {
          console.log(`   ${index + 1}. ${form.registration_no} - ${form.student_name} - Status: ${form.status}`);
        });
      }
    }
    
    // 2. Get total count
    const { count: totalForms, error: countError } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true });
      
    if (!countError) {
      console.log(`\n📊 Total forms in database: ${totalForms}`);
    }
    
    // 3. Check no_dues_status table
    console.log('\n2️⃣  NO_DUES_STATUS TABLE');
    console.log('-'.repeat(70));
    
    const { data: statuses, error: statusError } = await supabase
      .from('no_dues_status')
      .select('*')
      .limit(10);
      
    if (statusError) {
      console.error('❌ Error accessing no_dues_status:', statusError);
    } else {
      console.log(`✅ Total status records: ${statuses?.length || 0} (showing first 10)`);
      
      if (statuses && statuses.length > 0) {
        console.log('\nSample status structure:');
        Object.keys(statuses[0]).forEach(key => {
          console.log(`   ${key}: ${typeof statuses[0][key]}`);
        });
        
        // Group by form
        const statusByForm = {};
        statuses.forEach(status => {
          if (!statusByForm[status.form_id]) {
            statusByForm[status.form_id] = [];
          }
          statusByForm[status.form_id].push(status);
        });
        
        console.log('\nStatus distribution:');
        Object.entries(statusByForm).forEach(([formId, formStatuses]) => {
          console.log(`   Form ${formId.substring(0, 8)}...: ${formStatuses.length} departments`);
          formStatuses.forEach(s => {
            console.log(`      - ${s.department_name}: ${s.status}`);
          });
        });
      }
    }
    
    // 4. Check departments table
    console.log('\n3️⃣  DEPARTMENTS TABLE');
    console.log('-'.repeat(70));
    
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
      
    if (deptError) {
      console.error('❌ Error accessing departments:', deptError);
    } else {
      console.log(`✅ Active departments: ${departments?.length || 0}`);
      departments?.forEach((dept, index) => {
        console.log(`   ${index + 1}. ${dept.name} (Order: ${dept.display_order})`);
      });
    }
    
    // 5. Check student_data table
    console.log('\n4️⃣  STUDENT_DATA TABLE');
    console.log('-'.repeat(70));
    
    const { data: studentData, error: studentError } = await supabase
      .from('student_data')
      .select('*')
      .limit(5);
      
    if (studentError) {
      console.error('❌ Error accessing student_data:', studentError);
    } else {
      console.log(`✅ Student data records: ${studentData?.length || 0} (showing first 5)`);
      
      if (studentData && studentData.length > 0) {
        console.log('\nSample student data structure:');
        Object.keys(studentData[0]).forEach(key => {
          console.log(`   ${key}: ${typeof studentData[0][key]}`);
        });
      }
    }
    
    // 6. Status distribution analysis
    console.log('\n5️⃣  STATUS DISTRIBUTION ANALYSIS');
    console.log('-'.repeat(70));
    
    const { data: statusCounts, error: statusCountError } = await supabase
      .from('no_dues_forms')
      .select('status')
      .then(({ data, error }) => {
        if (error) throw error;
        const counts = {};
        data?.forEach(item => {
          counts[item.status] = (counts[item.status] || 0) + 1;
        });
        return { data: counts, error: null };
      });
      
    if (!statusCountError && statusCounts) {
      console.log('Forms by status:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }
    
    // 7. Certificate generation analysis
    console.log('\n6️⃣  CERTIFICATE GENERATION ANALYSIS');
    console.log('-'.repeat(70));
    
    const { data: certAnalysis, error: certError } = await supabase
      .from('no_dues_forms')
      .select('final_certificate_generated, certificate_url, status')
      .then(({ data, error }) => {
        if (error) throw error;
        const withCert = data?.filter(d => d.final_certificate_generated === true && d.certificate_url).length || 0;
        const withoutCert = data?.filter(d => d.final_certificate_generated !== true || !d.certificate_url).length || 0;
        return { 
          data: { withCert, withoutCert, total: data?.length || 0 }, 
          error: null 
        };
      });
      
    if (!certError && certAnalysis) {
      console.log(`   With certificates: ${certAnalysis.withCert}`);
      console.log(`   Without certificates: ${certAnalysis.withoutCert}`);
      console.log(`   Total: ${certAnalysis.total}`);
    }
    
    // 8. Recent activity
    console.log('\n7️⃣  RECENT ACTIVITY');
    console.log('-'.repeat(70));
    
    const { data: recentForms, error: recentError } = await supabase
      .from('no_dues_forms')
      .select('registration_no, student_name, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);
      
    if (!recentError && recentForms) {
      console.log('Last 10 updated forms:');
      recentForms.forEach((form, index) => {
        console.log(`   ${index + 1}. ${form.registration_no} - ${form.student_name}`);
        console.log(`      Status: ${form.status}`);
        console.log(`      Updated: ${new Date(form.updated_at).toLocaleString()}`);
        console.log('');
      });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ DATABASE ANALYSIS COMPLETE');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run analysis
analyzeDatabase().catch(console.error);
