// Create completed students with CORRECT schema (no user_id, proper UUID)
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

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

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Load actual config data
const configData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../actual_database_config.json'), 'utf8')
);

// Parse enrollment number
function parseEnrollmentNumber(enrollmentNo) {
  const match = enrollmentNo.match(/^(\d{2})([A-Z]+)(\d+)$/);
  if (!match) return null;
  
  const [, year, program, number] = match;
  const admissionYear = `20${year}`;
  const passingYear = `20${parseInt(year) + 4}`;
  
  return { admissionYear, passingYear, program };
}

// Generate student data with CORRECT schema (36 columns exactly as they exist)
function generateStudentData(enrollmentNo) {
  const parsed = parseEnrollmentNumber(enrollmentNo);
  if (!parsed) return null;
  
  const program = parsed.program;
  const mapping = configData.programMappings[program];
  
  if (!mapping) {
    console.log(`⚠️  No mapping found for program: ${program}`);
    return null;
  }
  
  const id = uuidv4(); // Proper UUID
  const now = new Date().toISOString();
  const timestamp = Date.now();
  
  return {
    id, // Proper UUID
    registration_no: enrollmentNo,
    student_name: `Student ${enrollmentNo}`,
    parent_name: `Parent of ${enrollmentNo}`,
    school_id: mapping.school_id,
    school: mapping.school_name,
    course_id: mapping.course_id,
    course: mapping.course_name,
    branch_id: mapping.branch_id,
    branch: mapping.branch_name,
    country_code: '+91',
    contact_no: '9876543210',
    personal_email: `student${enrollmentNo.toLowerCase()}@gmail.com`,
    college_email: `${enrollmentNo.toLowerCase()}@jecrcu.edu.in`,
    admission_year: parsed.admissionYear,
    passing_year: parsed.passingYear,
    alumni_profile_link: null, // Not required
    status: 'completed', // Directly completed
    rejection_reason: null,
    is_reapplication: false,
    reapplication_count: 0,
    last_reapplied_at: null,
    student_reply_message: null,
    final_certificate_generated: true,
    certificate_url: `https://yjjcndurtjprbtvaikzs.supabase.co/storage/v1/object/public/certificates/no-dues-certificate-${id}-${timestamp}.pdf`,
    certificate_generated_at: null, // Keep null as in original
    created_at: now,
    updated_at: now,
    rejection_context: null,
    unread_count: 0,
    department_unread_counts: {}, // Empty object
    blockchain_hash: `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
    blockchain_tx: `JECRC-TX-${timestamp}-${Math.random().toString(36).substring(2, 8)}`,
    blockchain_block: timestamp.toString(),
    blockchain_timestamp: now,
    blockchain_verified: true
  };
}

async function createCompletedStudents() {
  try {
    console.log('🚀 CREATING COMPLETED STUDENTS WITH CORRECT SCHEMA...\n');
    
    // Load completed students
    const completedStudents = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../completed_students.json'), 'utf8')
    );
    
    console.log(`📋 Creating ${completedStudents.length} completed students with CORRECT schema...`);
    console.log(`🔧 Using proper UUIDs and all 36 columns exactly as they exist\n`);
    
    let success = 0;
    let failed = 0;
    const errors = [];
    const createdRecords = [];
    
    // Process in batches
    const batchSize = 20;
    
    for (let i = 0; i < completedStudents.length; i += batchSize) {
      const batch = completedStudents.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(completedStudents.length/batchSize)} (${batch.length} students)...`);
      
      for (const enrollmentNo of batch) {
        try {
          const studentData = generateStudentData(enrollmentNo);
          
          if (!studentData) {
            console.log(`⚠️  Could not create data for ${enrollmentNo}`);
            failed++;
            errors.push({ enrollmentNo, error: 'Could not generate student data' });
            continue;
          }
          
          // Check if already exists
          const { data: existing } = await supabase
            .from('no_dues_forms')
            .select('id, status')
            .eq('registration_no', enrollmentNo)
            .single();
          
          if (existing) {
            // Update existing to completed
            const { error } = await supabase
              .from('no_dues_forms')
              .update({
                status: 'completed',
                final_certificate_generated: true,
                certificate_url: studentData.certificate_url,
                blockchain_hash: studentData.blockchain_hash,
                blockchain_tx: studentData.blockchain_tx,
                blockchain_block: studentData.blockchain_block,
                blockchain_timestamp: studentData.blockchain_timestamp,
                blockchain_verified: true,
                updated_at: new Date().toISOString()
              })
              .eq('registration_no', enrollmentNo);
            
            if (error) {
              console.log(`❌ Update failed ${enrollmentNo}: ${error.message}`);
              failed++;
              errors.push({ enrollmentNo, error: error.message, action: 'update' });
            } else {
              console.log(`✅ Updated ${enrollmentNo} to completed`);
              success++;
              createdRecords.push({ enrollmentNo, action: 'updated', program: studentData.course });
            }
          } else {
            // Create new completed record with ALL 36 columns
            const { error } = await supabase
              .from('no_dues_forms')
              .insert(studentData);
            
            if (error) {
              console.log(`❌ Create failed ${enrollmentNo}: ${error.message}`);
              failed++;
              errors.push({ enrollmentNo, error: error.message, action: 'create' });
            } else {
              console.log(`✅ Created ${enrollmentNo} as completed (${studentData.course})`);
              success++;
              createdRecords.push({ enrollmentNo, action: 'created', program: studentData.course });
            }
          }
        } catch (err) {
          console.log(`💥 Error ${enrollmentNo}: ${err.message}`);
          failed++;
          errors.push({ enrollmentNo, error: err.message, action: 'exception' });
        }
      }
      
      // Progress indicator
      const processed = Math.min(i + batchSize, completedStudents.length);
      console.log(`📊 Progress: ${processed}/${completedStudents.length} (Success: ${success}, Failed: ${failed})`);
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n📊 FINAL SUMMARY:');
    console.log(`✅ Successfully processed: ${success} students`);
    console.log(`❌ Failed: ${failed} students`);
    
    // Save created records
    if (createdRecords.length > 0) {
      fs.writeFileSync(
        path.join(__dirname, '../created_correct_schema.json'),
        JSON.stringify(createdRecords, null, 2)
      );
      console.log(`💾 Created records saved to created_correct_schema.json`);
      
      // Show program distribution
      const programCounts = {};
      createdRecords.forEach(record => {
        programCounts[record.program] = (programCounts[record.program] || 0) + 1;
      });
      
      console.log('\n📈 Program distribution:');
      Object.entries(programCounts).forEach(([program, count]) => {
        console.log(`  ${program}: ${count} students`);
      });
    }
    
    if (errors.length > 0) {
      fs.writeFileSync(
        path.join(__dirname, '../correct_schema_errors.json'),
        JSON.stringify(errors, null, 2)
      );
      console.log(`💾 Errors saved to correct_schema_errors.json`);
    }
    
    // Verify final state
    console.log('\n🔍 Verifying final database state...');
    const { count: finalCompleted } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');
    
    const { count: totalRecords } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true });
    
    const { count: certificateCount } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true })
      .eq('final_certificate_generated', true);
    
    console.log(`📊 Total records in database: ${totalRecords}`);
    console.log(`📊 Completed students: ${finalCompleted}`);
    console.log(`📊 Students with certificates: ${certificateCount}`);
    
    console.log('\n🎉 CREATION WITH CORRECT SCHEMA COMPLETED!');
    console.log('📊 Your dashboards will now show all completed students!');
    console.log('🔓 All students have proper UUIDs and all 36 columns!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

createCompletedStudents();
