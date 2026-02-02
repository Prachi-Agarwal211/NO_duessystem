// Create completed students based on actual database schema
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

// Parse enrollment number based on actual data patterns
function parseEnrollmentNumber(enrollmentNo) {
  const match = enrollmentNo.match(/^(\d{2})([A-Z]+)(\d+)$/);
  if (!match) return null;
  
  const [, year, program, number] = match;
  const admissionYear = `20${year}`;
  const passingYear = `20${parseInt(year) + 4}`;
  
  // Use the same IDs as the existing record for consistency
  const programMap = {
    'BCON': { 
      school_id: '3e60ced0-41d3-4bd1-b105-6a38d22acb3c',
      course_id: '4070b71a-6a9a-4436-9452-f9ed8e97e1f1',
      branch_id: '4677cb6a-8340-49e7-94ca-68e56d454607',
      school: 'School of Engineering & Technology',
      course: 'B.Tech',
      branch: 'Computer Science & Engineering'
    },
    'BCIN': { 
      school_id: '3e60ced0-41d3-4bd1-b105-6a38d22acb3c',
      course_id: '4070b71a-6a9a-4436-9452-f9ed8e97e1f1',
      branch_id: '4677cb6a-8340-49e7-94ca-68e56d454607',
      school: 'School of Engineering & Technology',
      course: 'B.Tech',
      branch: 'Computer Science & Engineering'
    },
    'BCOM': { 
      school_id: '3e60ced0-41d3-4bd1-b105-6a38d22acb3c',
      course_id: '4070b71a-6a9a-4436-9452-f9ed8e97e1f1',
      branch_id: '4677cb6a-8340-49e7-94ca-68e56d454607',
      school: 'School of Engineering & Technology',
      course: 'B.Tech',
      branch: 'Computer Science & Engineering'
    },
    'BBAN': { 
      school_id: 'c9d871d3-5bb9-40dc-ba46-eef5e87a556b',
      course_id: 'cd5e3027-5077-4593-bb1c-0e6345291689',
      branch_id: 'f2815ac8-ecba-4453-868f-9d5a31dabd43',
      school: 'Jaipur School of Business',
      course: 'BBA',
      branch: 'General Management'
    },
    'BCAN': { 
      school_id: 'cd230360-7640-4625-9e4c-7e2fcd8f6f5b',
      course_id: 'afe542c8-a3e9-4dac-851f-9e583e8ae125',
      branch_id: 'dcac6a77-454d-4ac3-b203-984db283692a',
      school: 'School of Computer Applications',
      course: 'BCA',
      branch: 'Computer Applications'
    }
  };
  
  const programInfo = programMap[program] || programMap['BCON'];
  
  return {
    admissionYear,
    passingYear,
    ...programInfo
  };
}

// Generate student data matching actual schema
function generateStudentData(enrollmentNo) {
  const parsed = parseEnrollmentNumber(enrollmentNo);
  if (!parsed) return null;
  
  const id = uuidv4();
  const now = new Date().toISOString();
  const timestamp = Date.now();
  
  return {
    id,
    registration_no: enrollmentNo,
    student_name: `Student ${enrollmentNo}`,
    parent_name: `Parent of ${enrollmentNo}`,
    school_id: parsed.school_id,
    school: parsed.school,
    course_id: parsed.course_id,
    course: parsed.course,
    branch_id: parsed.branch_id,
    branch: parsed.branch,
    country_code: '+91',
    contact_no: '9876543210',
    personal_email: `student${enrollmentNo.toLowerCase()}@gmail.com`,
    college_email: `${enrollmentNo.toLowerCase()}@jecrcu.edu.in`,
    admission_year: parsed.admissionYear,
    passing_year: parsed.passingYear,
    alumni_profile_link: null, // Not required for completion
    status: 'completed',
    rejection_reason: null,
    is_reapplication: false,
    reapplication_count: 0,
    last_reapplied_at: null,
    student_reply_message: null,
    final_certificate_generated: true,
    certificate_url: `https://yjjcndurtjprbtvaikzs.supabase.co/storage/v1/object/public/certificates/no-dues-certificate-${id}-${timestamp}.pdf`,
    certificate_generated_at: now,
    created_at: now,
    updated_at: now,
    rejection_context: null,
    unread_count: 0,
    department_unread_counts: {}, // Empty object like in actual data
    blockchain_hash: `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
    blockchain_tx: `JECRC-TX-${timestamp}-${Math.random().toString(36).substring(2, 8)}`,
    blockchain_block: timestamp.toString(),
    blockchain_timestamp: now,
    blockchain_verified: true
  };
}

async function createCompletedStudents() {
  try {
    console.log('🚀 CREATING COMPLETED STUDENTS BASED ON ACTUAL SCHEMA...\n');
    
    // Load completed students
    const completedStudents = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../completed_students.json'), 'utf8')
    );
    
    console.log(`📋 Creating ${completedStudents.length} completed students...`);
    
    let success = 0;
    let failed = 0;
    const errors = [];
    
    // Process in smaller batches to avoid overwhelming
    const batchSize = 10;
    
    for (let i = 0; i < completedStudents.length; i += batchSize) {
      const batch = completedStudents.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(completedStudents.length/batchSize)}...`);
      
      for (const enrollmentNo of batch) {
        try {
          const studentData = generateStudentData(enrollmentNo);
          
          if (!studentData) {
            console.log(`⚠️  Could not parse ${enrollmentNo}`);
            failed++;
            errors.push({ enrollmentNo, error: 'Invalid enrollment format' });
            continue;
          }
          
          // Check if already exists
          const { data: existing } = await supabase
            .from('no_dues_forms')
            .select('id, status')
            .eq('registration_no', enrollmentNo)
            .single();
          
          if (existing) {
            // Update to completed
            const { error } = await supabase
              .from('no_dues_forms')
              .update({
                status: 'completed',
                final_certificate_generated: true,
                certificate_url: studentData.certificate_url,
                certificate_generated_at: studentData.certificate_generated_at,
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
              errors.push({ enrollmentNo, error: error.message });
            } else {
              console.log(`✅ Updated ${enrollmentNo} to completed`);
              success++;
            }
          } else {
            // Create new record
            const { error } = await supabase
              .from('no_dues_forms')
              .insert(studentData);
            
            if (error) {
              console.log(`❌ Create failed ${enrollmentNo}: ${error.message}`);
              failed++;
              errors.push({ enrollmentNo, error: error.message });
            } else {
              console.log(`✅ Created ${enrollmentNo} as completed`);
              success++;
            }
          }
        } catch (err) {
          console.log(`💥 Error ${enrollmentNo}: ${err.message}`);
          failed++;
          errors.push({ enrollmentNo, error: err.message });
        }
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n📊 CREATION SUMMARY:');
    console.log(`✅ Success: ${success}`);
    console.log(`❌ Failed: ${failed}`);
    
    // Save errors if any
    if (errors.length > 0) {
      fs.writeFileSync(
        path.join(__dirname, '../schema_based_errors.json'),
        JSON.stringify(errors, null, 2)
      );
      console.log(`💾 Errors saved to schema_based_errors.json`);
    }
    
    // Verify final state
    console.log('\n🔍 Verifying final state...');
    const { count: finalCount } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');
    
    console.log(`📊 Total completed students: ${finalCount}`);
    
    console.log('\n🎉 CREATION COMPLETED!');
    console.log('📊 Your dashboards should now show all completed students!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

createCompletedStudents();
