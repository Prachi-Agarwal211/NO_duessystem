// Script to create missing no_dues_status records for forms that don't have them
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

async function createMissingStatusRecords() {
  console.log('🔧 CREATING MISSING NO_DUES_STATUS RECORDS...\n');

  // Get all departments
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name');

  console.log(`Found ${departments.length} departments`);
  departments.forEach(d => console.log(`  - ${d.name}: ${d.id}`));

  // Get all form IDs from no_dues_status
  const { data: statusForms } = await supabase
    .from('no_dues_status')
    .select('form_id');

  const formsWithStatus = new Set(statusForms?.map(s => s.form_id) || []);
  console.log(`\nForms with status records: ${formsWithStatus.size}`);

  // Get all forms
  const { data: allForms } = await supabase
    .from('no_dues_forms')
    .select('id, registration_no, status')
    .order('created_at', { ascending: false });

  // Find forms without status records
  const formsWithoutStatus = allForms.filter(f => !formsWithStatus.has(f.id));
  console.log(`Forms WITHOUT status records: ${formsWithoutStatus.length}`);

  if (formsWithoutStatus.length === 0) {
    console.log('\n✅ All forms already have status records!');
    return;
  }

  // Create status records for each missing form
  console.log(`\n📋 Creating status records for ${formsWithoutStatus.length} forms...`);

  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const form of formsWithoutStatus) {
    // Get existing status records for this form (if any)
    const { data: existingStatus } = await supabase
      .from('no_dues_status')
      .select('department_name')
      .eq('form_id', form.id);

    const existingDepts = new Set(existingStatus?.map(s => s.department_name) || []);

    // Find departments that don't have status for this form
    const missingDepts = departments.filter(d => !existingDepts.has(d.name));

    for (const dept of missingDepts) {
      const statusData = {
        form_id: form.id,
        department_name: dept.name,
        status: 'approved', // Auto-approve since form is completed
        action_at: form.updated_at || new Date().toISOString(),
        rejection_reason: null,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('no_dues_status')
        .insert(statusData);

      if (error) {
        console.error(`❌ Error creating status for ${form.registration_no} (${dept.name}):`, error.message);
        errorCount++;
      } else {
        createdCount++;
      }
    }

    console.log(`  Created ${missingDepts.length} records for ${form.registration_no}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY:');
  console.log(`   Created: ${createdCount} status records`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log('='.repeat(80));

  if (createdCount > 0) {
    console.log('\n✅ Missing status records have been created!');
    console.log('   All forms should now be visible in the dashboard.');
  }

  // Verify
  console.log('\n📋 Verifying...');
  const { count: newTotalStatus } = await supabase
    .from('no_dues_status')
    .select('*', { count: 'exact', head: true });

  console.log(`   Total status records now: ${newTotalStatus}`);
  console.log(`   Expected: ${formsWithStatus.size + createdCount}`);
}

createMissingStatusRecords().catch(console.error);
