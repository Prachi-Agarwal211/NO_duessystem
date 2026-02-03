// Migration Script for 240 Student Records
// Fixes data visibility issues by properly migrating CSV backup to Supabase

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

async function migrateStudents() {
  console.log('🚀 Starting migration of 240 student records...\n');
  
  try {
    // 1. Read CSV backup
    console.log('📖 Reading CSV backup...');
    const csvPath = path.join(__dirname, '../backups/no_dues_forms_rows.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    const students = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        const student = {};
        headers.forEach((header, index) => {
          student[header] = values[index] || '';
        });
        students.push(student);
      }
    }
    
    console.log(`✅ Found ${students.length} student records in CSV\n`);
    
    // 2. Get current database structure
    console.log('🔍 Analyzing current database structure...');
    
    // Check existing forms
    const { data: existingForms, error: formsError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no');
      
    if (formsError) {
      console.error('❌ Error checking existing forms:', formsError);
      return;
    }
    
    const existingRegNos = new Set(existingForms?.map(f => f.registration_no) || []);
    console.log(`📊 Found ${existingRegNos.size} existing forms in database\n`);
    
    // 3. Get departments for status creation
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('name, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
      
    if (deptError) {
      console.error('❌ Error fetching departments:', deptError);
      return;
    }
    
    console.log(`🏢 Found ${departments?.length || 0} active departments\n`);
    
    // 4. Process each student
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const student of students) {
      try {
        // Skip if already exists
        if (existingRegNos.has(student.registration_no)) {
          console.log(`⏭️  Skipping ${student.registration_no} - already exists`);
          skipped++;
          continue;
        }
        
        // Determine correct status based on certificate generation
        let status = 'pending';
        if (student.final_certificate_generated === 'true' && student.certificate_url) {
          status = 'completed';
        } else if (student.reapplication_count > 0) {
          status = 'in_progress';
        }
        
        // Prepare form data for new schema
        const formData = {
          id: student.id,
          registration_no: student.registration_no,
          student_name: student.student_name,
          parent_name: student.parent_name,
          admission_year: parseInt(student.admission_year),
          passing_year: parseInt(student.passing_year),
          school_id: student.school_id,
          school: student.school,
          course_id: student.course_id,
          course: student.course,
          branch_id: student.branch_id,
          branch: student.branch,
          country_code: student.country_code,
          contact_no: student.contact_no,
          personal_email: student.personal_email,
          college_email: student.college_email,
          alumni_profile_link: student.alumni_screenshot_url || '',
          status: status,
          is_reapplication: student.is_reapplication === 'true',
          reapplication_count: parseInt(student.reapplication_count) || 0,
          last_reapplied_at: student.last_reapplied_at || null,
          student_reply_message: student.student_reply_message || null,
          rejection_context: student.rejection_context || null,
          final_certificate_generated: student.final_certificate_generated === 'true',
          certificate_url: student.certificate_url || null,
          blockchain_hash: student.blockchain_hash || null,
          blockchain_tx: student.blockchain_tx || null,
          blockchain_block: student.blockchain_block || null,
          blockchain_timestamp: student.blockchain_timestamp || null,
          blockchain_verified: student.blockchain_verified === 'true',
          created_at: student.created_at || new Date().toISOString(),
          updated_at: student.updated_at || new Date().toISOString()
        };
        
        // Insert form
        const { error: insertError } = await supabase
          .from('no_dues_forms')
          .insert(formData);
          
        if (insertError) {
          console.error(`❌ Error inserting form for ${student.registration_no}:`, insertError);
          errors++;
          continue;
        }
        
        // Create department statuses
        if (departments && departments.length > 0) {
          const statusRecords = departments.map(dept => ({
            form_id: student.id,
            department_name: dept.name,
            status: status === 'completed' ? 'approved' : 'pending',
            action_at: status === 'completed' ? new Date().toISOString() : null,
            action_by: status === 'completed' ? dept.name : null
          }));
          
          const { error: statusError } = await supabase
            .from('no_dues_status')
            .insert(statusRecords);
            
          if (statusError) {
            console.error(`❌ Error creating statuses for ${student.registration_no}:`, statusError);
            errors++;
            continue;
          }
        }
        
        // Sync to student_data table
        const studentData = {
          form_id: student.id,
          registration_no: student.registration_no,
          student_name: student.student_name,
          parent_name: student.parent_name,
          school: student.school,
          course: student.course,
          branch: student.branch,
          contact_no: student.contact_no,
          personal_email: student.personal_email,
          college_email: student.college_email,
          admission_year: parseInt(student.admission_year),
          passing_year: parseInt(student.passing_year),
          alumni_profile_link: student.alumni_screenshot_url || '',
          updated_at: new Date().toISOString(),
          updated_by: 'migration_script'
        };
        
        const { error: syncError } = await supabase
          .from('student_data')
          .upsert(studentData, { onConflict: 'form_id' });
          
        if (syncError) {
          console.warn(`⚠️  Warning: Failed to sync student data for ${student.registration_no}:`, syncError.message);
        }
        
        console.log(`✅ Migrated ${student.registration_no} - ${student.student_name}`);
        migrated++;
        
      } catch (error) {
        console.error(`❌ Error processing ${student.registration_no}:`, error.message);
        errors++;
      }
    }
    
    // 5. Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`   ✅ Successfully migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped (already exists): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📋 Total processed: ${students.length}`);
    
    if (migrated > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('   Students should now be visible in all dashboards');
    }
    
    if (errors > 0) {
      console.log('\n⚠️  Some records failed to migrate. Check the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateStudents().catch(console.error);
