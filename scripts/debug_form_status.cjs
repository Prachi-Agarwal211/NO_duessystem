// Debug script to check one form's status
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

async function debugForm() {
  console.log('🔍 DEBUGGING FORM STATUS...\n');

  // Find the form by registration number
  const { data: form } = await supabase
    .from('no_dues_forms')
    .select('id, registration_no, student_name, status')
    .eq('registration_no', '21BCON532')
    .single();

  if (!form) {
    console.log('Form not found!');
    return;
  }

  console.log('Form found:', form);
  console.log('Form ID:', form.id);

  // Check what status records exist for this form
  const { data: status } = await supabase
    .from('no_dues_status')
    .select('department_name, status')
    .eq('form_id', form.id);

  console.log('\nStatus records for this form:');
  console.log('Count:', status?.length || 0);
  status?.forEach(s => {
    console.log(`  - ${s.department_name}: ${s.status}`);
  });

  // Check all departments
  const { data: departments } = await supabase.from('departments').select('name');
  console.log('\nAll departments:', departments?.map(d => d.name));

  // Check which departments are missing
  const existingDepts = new Set(status?.map(s => s.department_name) || []);
  const missingDepts = departments?.filter(d => !existingDepts.has(d.name)) || [];

  console.log('\nMissing departments for this form:');
  missingDepts.forEach(d => {
    console.log(`  - ${d.name}`);
  });

  if (missingDepts.length > 0) {
    console.log(`\nNeed to create ${missingDepts.length} status records for this form`);
  } else {
    console.log('\n✅ All departments have status records for this form');
  }
}

debugForm().catch(console.error);
