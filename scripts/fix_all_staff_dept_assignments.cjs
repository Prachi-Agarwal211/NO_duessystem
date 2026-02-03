// Script to fix ALL department staff assigned_department_ids
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

async function fixAllStaffAssignments() {
  console.log('🔧 FIXING ALL DEPARTMENT STAFF ASSIGNMENTS...\n');

  // Get all departments
  const { data: departments } = await supabase.from('departments').select('id, name');

  // Get all department staff
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, email, full_name, department_name, assigned_department_ids')
    .eq('role', 'department');

  console.log(`Found ${staff.length} department staff members\n`);

  let fixedCount = 0;
  let alreadyCorrect = 0;
  let errorCount = 0;

  for (const s of staff) {
    const dept = departments.find(d => d.name === s.department_name);
    const currentIds = s.assigned_department_ids || [];

    if (!dept) {
      console.log(`⚠️  No department found for: ${s.email} (${s.department_name})`);
      continue;
    }

    // Check if already has correct ID
    if (currentIds.includes(dept.id)) {
      alreadyCorrect++;
      console.log(`✅ ${s.email}: Already correct`);
      continue;
    }

    // Add the correct department ID
    const newAssignedIds = [...currentIds, dept.id];

    const { error } = await supabase
      .from('profiles')
      .update({ assigned_department_ids: newAssignedIds })
      .eq('id', s.id);

    if (error) {
      console.log(`❌ ${s.email}: Error - ${error.message}`);
      errorCount++;
    } else {
      console.log(`🔧 ${s.email}: Fixed! Added ${dept.id}`);
      fixedCount++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY:');
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   Already correct: ${alreadyCorrect}`);
  console.log(`   Errors: ${errorCount}`);
  console.log('='.repeat(80));

  if (fixedCount > 0) {
    console.log('\n✅ All staff assignments have been fixed!');
    console.log('   Staff can now approve/reject forms for their departments.');
  }
}

fixAllStaffAssignments().catch(console.error);
