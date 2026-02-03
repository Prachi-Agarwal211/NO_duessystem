// Restore profiles from backup CSV
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

async function restoreProfiles() {
  console.log('🔄 RESTORING PROFILES FROM BACKUP...\n');

  // Read the CSV
  const csvPath = path.join(__dirname, '../backups/profiles_rows.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  
  // Parse CSV
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  console.log(`📊 Found ${lines.length - 1} profiles in backup\n`);
  
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseCSVLine(line);
    
    if (values.length !== headers.length) {
      console.log(`⚠️ Skipping line ${i}: column mismatch`);
      continue;
    }
    
    const profile = {};
    headers.forEach((header, index) => {
      profile[header] = values[index];
    });

    // Check if profile already exists
    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profile.id)
      .single();

    if (existing) {
      console.log(`⏭️ Skipping (already exists): ${profile.email} (${profile.full_name})`);
      skipCount++;
      continue;
    }

    // Parse JSON arrays
    if (profile.school_ids && profile.school_ids.startsWith('[')) {
      try { profile.school_ids = JSON.parse(profile.school_ids); } catch(e) {}
    }
    if (profile.course_ids && profile.course_ids.startsWith('[')) {
      try { profile.course_ids = JSON.parse(profile.course_ids); } catch(e) {}
    }
    if (profile.branch_ids && profile.branch_ids.startsWith('[')) {
      try { profile.branch_ids = JSON.parse(profile.branch_ids); } catch(e) {}
    }
    if (profile.assigned_department_ids && profile.assigned_department_ids.startsWith('[')) {
      try { profile.assigned_department_ids = JSON.parse(profile.assigned_department_ids); } catch(e) {}
    }

    // Handle boolean conversion
    profile.is_active = profile.is_active === 'true';

    // Insert profile
    const { error: insertError } = await supabase
      .from('profiles')
      .insert(profile);

    if (insertError) {
      console.log(`❌ Failed to insert ${profile.email}: ${insertError.message}`);
      failCount++;
    } else {
      console.log(`✅ Inserted: ${profile.email} (${profile.role}) - ${profile.full_name}`);
      successCount++;
    }
  }

  console.log('\n📊 SUMMARY:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ⏭️ Skipped: ${skipCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  📋 Total: ${lines.length - 1}`);
}

// Helper function to parse CSV line handling quoted values
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

restoreProfiles().catch(console.error);
