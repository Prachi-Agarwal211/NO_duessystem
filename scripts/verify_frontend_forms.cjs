// Script to verify what forms would show in the frontend
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

async function verifyFrontendForms() {
  console.log('🔍 VERIFYING FRONTEND FORM VISIBILITY...\n');

  // Get librarian profile
  const { data: librarian } = await supabase
    .from('profiles')
    .select('id, email, full_name, department_name')
    .eq('email', 'librarian@jecrcu.edu.in')
    .single();

  console.log('Librarian:', librarian.email, '- Dept:', librarian.department_name);

  // Simulate the frontend query
  console.log('\n📋 Simulating frontend query...');
  console.log('   Query: no_dues_forms with inner join on no_dues_status where department_name = library');

  const { data: forms, error } = await supabase
    .from('no_dues_forms')
    .select(`
      id,
      registration_no,
      student_name,
      status,
      created_at,
      no_dues_status!inner(
        status,
        department_name
      )
    `)
    .eq('no_dues_status.department_name', librarian.department_name)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Query error:', error);
    return;
  }

  console.log(`✅ Query returned ${forms.length} forms\n`);

  // Count by status
  const statusCounts = {};
  forms.forEach(f => {
    const deptStatus = f.no_dues_status.find(s => s.department_name === librarian.department_name);
    const status = deptStatus?.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  console.log('📊 Forms by library status:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  console.log('\n📋 Sample forms (first 20):');
  forms.slice(0, 20).forEach((f, i) => {
    const deptStatus = f.no_dues_status.find(s => s.department_name === librarian.department_name);
    console.log(`${i + 1}. ${f.registration_no} - ${f.student_name} - library: ${deptStatus?.status}`);
  });

  if (forms.length > 20) {
    console.log(`\n... and ${forms.length - 20} more forms`);
  }

  // Check if all 240+ forms are visible
  console.log('\n' + '='.repeat(80));
  if (forms.length >= 240) {
    console.log('✅ SUCCESS: All 240+ forms are visible in the frontend!');
    console.log(`   Total forms visible: ${forms.length}`);
  } else {
    console.log('❌ ISSUE: Not all forms are visible!');
    console.log(`   Expected: 240+ forms`);
    console.log(`   Actual: ${forms.length} forms`);
    console.log(`   Missing: ${241 - forms.length} forms`);
  }
  console.log('='.repeat(80));
}

verifyFrontendForms().catch(console.error);
