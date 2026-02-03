// Script to check all department staff assignments
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

async function checkAllStaffAssignments() {
  console.log('🔍 CHECKING ALL DEPARTMENT STAFF ASSIGNMENTS...\n');

  // Get all departments
  const { data: departments } = await supabase.from('departments').select('id, name');
  console.log('📋 DEPARTMENTS:');
  departments.forEach(d => console.log(`   ${d.name}: ${d.id}`));

  // Get all department staff
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, email, full_name, department_name, assigned_department_ids')
    .eq('role', 'department');

  console.log('\n📋 DEPARTMENT STAFF ASSIGNMENTS:');
  console.log('-'.repeat(100));

  let wrongCount = 0;
  staff.forEach(s => {
    const dept = departments.find(d => d.name === s.department_name);
    const currentIds = s.assigned_department_ids || [];
    const hasCorrect = dept ? currentIds.includes(dept.id) : false;

    console.log(`\n👤 ${s.full_name} (${s.email})`);
    console.log(`   Department: ${s.department_name}`);
    console.log(`   Expected Dept ID: ${dept?.id || 'NOT FOUND'}`);
    console.log(`   Current IDs: ${JSON.stringify(currentIds)}`);
    console.log(`   Status: ${hasCorrect ? '✅ CORRECT' : '❌ WRONG'}`);

    if (!hasCorrect && dept) {
      wrongCount++;
      console.log(`   ⚠️  NEEDS FIX: Add "${dept.id}" to assigned_department_ids`);
    }
  });

  console.log('\n' + '-'.repeat(100));
  console.log(`\n📊 SUMMARY: ${wrongCount} staff members have incorrect assignments`);
  
  if (wrongCount > 0) {
    console.log('\n🔧 To fix all staff, run the fix script.');
  } else {
    console.log('\n✅ All staff have correct department assignments!');
  }
}

checkAllStaffAssignments().catch(console.error);
