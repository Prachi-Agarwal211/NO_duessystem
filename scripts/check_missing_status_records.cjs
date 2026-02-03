// Script to check forms missing no_dues_status records
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMissingStatusRecords() {
  console.log('🔍 CHECKING FORMS MISSING STATUS RECORDS...\n');

  // Get all form IDs from no_dues_status
  const { data: statusForms } = await supabase
    .from('no_dues_status')
    .select('form_id');

  const formsWithStatus = new Set(statusForms?.map(s => s.form_id) || []);
  console.log('Forms with status records:', formsWithStatus.size);

  // Get all forms
  const { data: allForms } = await supabase
    .from('no_dues_forms')
    .select('id, registration_no, student_name, status, created_at');

  console.log('Total forms:', allForms.length);

  // Find forms without status records
  const formsWithoutStatus = allForms.filter(f => !formsWithStatus.has(f.id));

  console.log('\n📋 Forms WITHOUT status records:', formsWithoutStatus.length);

  if (formsWithoutStatus.length > 0) {
    console.log('\nThese forms need no_dues_status records created:');
    formsWithoutStatus.forEach((f, i) => {
      console.log(`${i + 1}. ${f.registration_no} - ${f.student_name} (${f.status})`);
    });
  }

  // Check what status records exist for the forms that DO have records
  console.log('\n📋 Checking status records by department:');
  const { data: statusByDept } = await supabase
    .from('no_dues_status')
    .select('department_name, status');

  const deptStatusMap = {};
  statusByDept?.forEach(s => {
    if (!deptStatusMap[s.department_name]) {
      deptStatusMap[s.department_name] = { pending: 0, approved: 0, rejected: 0 };
    }
    if (s.status === 'pending') deptStatusMap[s.department_name].pending++;
    else if (s.status === 'approved') deptStatusMap[s.department_name].approved++;
    else if (s.status === 'rejected') deptStatusMap[s.department_name].rejected++;
  });

  Object.entries(deptStatusMap).forEach(([dept, counts]) => {
    console.log(`  ${dept}: pending=${counts.pending}, approved=${counts.approved}, rejected=${counts.rejected}`);
  });

  // For library specifically
  console.log('\n📚 Library department status:');
  const { data: libStatus } = await supabase
    .from('no_dues_status')
    .select('form_id, status')
    .eq('department_name', 'library');

  console.log('  Library status records:', libStatus?.length || 0);

  const libForms = new Set(libStatus?.map(s => s.form_id) || []);
  console.log('  Forms with library status:', libForms.size);

  // Check pending forms for library
  const pendingLib = libStatus?.filter(s => s.status === 'pending') || [];
  console.log('  Pending forms for library:', pendingLib.length);
}

checkMissingStatusRecords().catch(console.error);
