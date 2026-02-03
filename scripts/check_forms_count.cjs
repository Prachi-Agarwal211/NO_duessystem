// Script to check all forms count and status
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

async function checkForms() {
  console.log('🔍 CHECKING NO_DUES_FORMS...\n');

  // Count all forms
  const { count: totalForms } = await supabase
    .from('no_dues_forms')
    .select('*', { count: 'exact', head: true });

  console.log('📊 Total no_dues_forms:', totalForms);

  // Get forms by status
  const statuses = ['pending', 'in_progress', 'approved', 'rejected', 'completed'];
  
  console.log('\n📋 Forms by status:');
  for (const status of statuses) {
    const { count } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    console.log(`   ${status}: ${count || 0}`);
  }

  // Sample recent forms
  console.log('\n📋 Sample recent forms:');
  const { data: forms } = await supabase
    .from('no_dues_forms')
    .select('id, student_name, registration_no, status, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (forms && forms.length > 0) {
    forms.forEach((f, i) => {
      console.log(`${i + 1}. ${f.registration_no} - ${f.student_name} - ${f.status}`);
    });
  } else {
    console.log('   No forms found');
  }

  // Check no_dues_status records
  console.log('\n📋 Checking no_dues_status records:');
  const { count: statusCount } = await supabase
    .from('no_dues_status')
    .select('*', { count: 'exact', head: true });
  
  console.log('   Total status records:', statusCount);

  // Check if forms have status records
  if (forms && forms.length > 0) {
    const { data: formIds } = await supabase
      .from('no_dues_status')
      .select('form_id');

    const uniqueFormIds = new Set(formIds?.map(s => s.form_id) || []);
    console.log('   Forms with status records:', uniqueFormIds.size);
  }

  // Check profiles (students)
  console.log('\n📋 Checking student profiles:');
  const { count: studentCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');
  
  console.log('   Total student profiles:', studentCount);
}

checkForms().catch(console.error);
