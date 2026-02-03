// Check forms data in database
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

async function checkFormsData() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                    FORMS DATA ANALYSIS                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Check total forms count
    console.log('1️⃣  TOTAL FORMS IN no_dues_forms TABLE');
    console.log('-'.repeat(70));
    
    const { count: totalForms, error: countError } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting forms:', countError);
      return;
    }
    
    console.log(`📊 Total forms: ${totalForms || 0}`);
    
    // 2. Check forms by status
    console.log('\n2️⃣  FORMS BY STATUS');
    console.log('-'.repeat(70));
    
    const statuses = ['pending', 'in_progress', 'completed', 'rejected'];
    for (const status of statuses) {
      const { count: statusCount, error: statusError } = await supabase
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      
      if (!statusError) {
        console.log(`   ${status.toUpperCase()}: ${statusCount || 0}`);
      }
    }
    
    // 3. Check no_dues_status table
    console.log('\n3️⃣  NO_DUES_STATUS TABLE');
    console.log('-'.repeat(70));
    
    const { count: totalStatus, error: totalStatusError } = await supabase
      .from('no_dues_status')
      .select('*', { count: 'exact', head: true });
    
    if (totalStatusError) {
      console.error('❌ Error counting status records:', totalStatusError);
      return;
    }
    
    console.log(`📊 Total status records: ${totalStatus || 0}`);
    
    // 4. Check department-wise status
    console.log('\n4️⃣  DEPARTMENT-WISE STATUS BREAKDOWN');
    console.log('-'.repeat(70));
    
    const { data: deptStatus, error: deptError } = await supabase
      .from('no_dues_status')
      .select('department_name, status')
      .order('department_name');
    
    if (!deptError && deptStatus) {
      const deptMap = new Map();
      
      deptStatus.forEach(record => {
        if (!deptMap.has(record.department_name)) {
          deptMap.set(record.department_name, { pending: 0, approved: 0, rejected: 0, total: 0 });
        }
        const dept = deptMap.get(record.department_name);
        dept.total++;
        if (record.status === 'pending') dept.pending++;
        else if (record.status === 'approved') dept.approved++;
        else if (record.status === 'rejected') dept.rejected++;
      });
      
      console.log('┌─────────────────────────────────────────────────────────────────────┐');
      console.log('│ Department           │ Total │ Pending │ Approved │ Rejected │');
      console.log('├─────────────────────────────────────────────────────────────────────┤');
      
      Array.from(deptMap.entries()).forEach(([deptName, stats]) => {
        const name = (deptName || '').padEnd(19).substring(0, 19);
        const total = stats.total.toString().padEnd(6);
        const pending = stats.pending.toString().padEnd(8);
        const approved = stats.approved.toString().padEnd(9);
        const rejected = stats.rejected.toString().padEnd(9);
        console.log(`│ ${name} │ ${total} │ ${pending} │ ${approved} │ ${rejected} │`);
      });
      
      console.log('└─────────────────────────────────────────────────────────────────────┘');
    }
    
    // 5. Sample forms data
    console.log('\n5️⃣  SAMPLE FORMS DATA');
    console.log('-'.repeat(70));
    
    const { data: sampleForms, error: sampleError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!sampleError && sampleForms) {
      console.log('┌─────────────────────────────────────────────────────────────────────┐');
      console.log('│ # │ Reg No       │ Student Name          │ Status    │ Created At    │');
      console.log('├─────────────────────────────────────────────────────────────────────┤');
      
      sampleForms.forEach((form, i) => {
        const regNo = (form.registration_no || '').padEnd(12).substring(0, 12);
        const name = (form.student_name || '').padEnd(21).substring(0, 21);
        const status = (form.status || '').padEnd(10).substring(0, 10);
        const created = new Date(form.created_at).toLocaleDateString();
        
        console.log(`│ ${(i+1).toString().padEnd(2)} │ ${regNo} │ ${name} │ ${status} │ ${created} │`);
      });
      
      console.log('└─────────────────────────────────────────────────────────────────────┘');
    }
    
    // 6. Check for forms without status records
    console.log('\n6️⃣  FORMS WITHOUT STATUS RECORDS');
    console.log('-'.repeat(70));
    
    const { data: formsWithoutStatus, error: withoutStatusError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, student_name')
      .not('no_dues_status', 'gt', 0)
      .limit(5);
    
    if (!withoutStatusError && formsWithoutStatus) {
      console.log(`Forms without department status records: ${formsWithoutStatus.length}`);
      formsWithoutStatus.forEach((form, i) => {
        console.log(`   ${i+1}. ${form.registration_no} - ${form.student_name}`);
      });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 ANALYSIS COMPLETE');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkFormsData();
