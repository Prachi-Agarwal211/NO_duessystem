import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
function loadEnv() {
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
}

// Initialize Supabase
function initSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, key);
}

// Parse enrollment number to extract info
function parseEnrollmentNumber(enrollmentNo) {
  // Examples: 21BCON063, 22BBAN069, 23MBAN0029
  const match = enrollmentNo.match(/^(\d{2})([A-Z]+)(\d+)$/);
  if (!match) return null;
  
  const [, year, program, number] = match;
  const admissionYear = `20${year}`;
  const passingYear = `20${parseInt(year) + 4}`; // Assume 4-year course
  
  // Map program codes to school/course info
  const programMap = {
    'BCON': { school: 'School of Engineering & Technology', course: 'B.Tech', branch: 'Computer Science & Engineering' },
    'BCIN': { school: 'School of Engineering & Technology', course: 'B.Tech', branch: 'Computer Science & Engineering' },
    'BDEN': { school: 'Jaipur School of Design', course: 'B.Des', branch: 'Interior Design' },
    'BVIN': { school: 'Jaipur School of Design', course: 'B.Des', branch: 'Interior Design' },
    'BBAN': { school: 'Jaipur School of Business', course: 'BBA', branch: 'General Management' },
    'BCAN': { school: 'School of Computer Applications', course: 'BCA', branch: 'Computer Applications' },
    'BCOM': { school: 'School of Engineering & Technology', course: 'B.Tech', branch: 'Computer Science & Engineering' },
    'BJMN': { school: 'Jaipur School of Mass Communication', course: 'BJMC', branch: 'Journalism & Mass Communication' },
    'BMIN': { school: 'Jaipur School of Mass Communication', course: 'BJMC', branch: 'Journalism & Mass Communication' },
    'BBAL': { school: 'Jaipur School of Business', course: 'BBA', branch: 'General Management' },
    'BCAL': { school: 'School of Computer Applications', course: 'BCA', branch: 'Computer Applications' },
    'MBAN': { school: 'Jaipur School of Business', course: 'MBA', branch: 'Human Resource Management' },
    'MCAN': { school: 'School of Computer Applications', course: 'MCA', branch: 'Computer Applications' },
    'MCON': { school: 'School of Computer Applications', course: 'MCA', branch: 'Computer Applications' }
  };
  
  const programInfo = programMap[program] || programMap['BCON']; // Default to BCON
  
  return {
    admissionYear,
    passingYear,
    ...programInfo
  };
}

// Generate student data
function generateStudentData(enrollmentNo) {
  const parsed = parseEnrollmentNumber(enrollmentNo);
  if (!parsed) return null;
  
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  return {
    id,
    user_id: null,
    registration_no: enrollmentNo,
    student_name: `Student ${enrollmentNo}`, // Placeholder name
    personal_email: `student${enrollmentNo.toLowerCase()}@gmail.com`,
    college_email: `${enrollmentNo.toLowerCase()}@jecrcu.edu.in`,
    admission_year: parsed.admissionYear,
    passing_year: parsed.passingYear,
    parent_name: `Parent of ${enrollmentNo}`,
    school_id: crypto.randomUUID(),
    course_id: crypto.randomUUID(),
    branch_id: crypto.randomUUID(),
    school: parsed.school,
    course: parsed.course,
    branch: parsed.branch,
    country_code: '+91',
    contact_no: '9876543210',
    alumni_screenshot_url: null,
    certificate_url: `https://ycvorjengbxcikqcwjnv.supabase.co/storage/v1/object/public/certificates/no-dues-certificate-${id}-${Date.now()}.pdf`,
    status: 'completed',
    reapplication_count: 0,
    last_reapplied_at: null,
    is_reapplication: false,
    student_reply_message: null,
    rejection_context: null,
    final_certificate_generated: true,
    blockchain_hash: `cert_${crypto.randomUUID()}`,
    blockchain_tx: `JECRC-TX-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`,
    blockchain_block: Date.now().toString(),
    blockchain_timestamp: now,
    blockchain_verified: true,
    created_at: now,
    updated_at: now,
    rejection_reason: null
  };
}

// Create completed students
async function createCompletedStudents() {
  try {
    console.log('🚀 Creating completed student records...');
    
    loadEnv();
    const supabase = initSupabase();
    
    // Load completed students
    const completedStudentsFile = path.join(__dirname, '../completed_students.json');
    const completedStudents = JSON.parse(fs.readFileSync(completedStudentsFile, 'utf8'));
    
    console.log(`📋 Creating records for ${completedStudents.length} completed students...`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const createdRecords = [];
    
    // Process in batches
    const batchSize = 10;
    
    for (let i = 0; i < completedStudents.length; i += batchSize) {
      const batch = completedStudents.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(completedStudents.length/batchSize)}...`);
      
      for (const enrollmentNo of batch) {
        try {
          const studentData = generateStudentData(enrollmentNo);
          
          if (!studentData) {
            console.log(`⚠️  Could not parse enrollment number: ${enrollmentNo}`);
            errorCount++;
            errors.push({ enrollmentNo, error: 'Invalid enrollment format' });
            continue;
          }
          
          // Check if record already exists
          const { data: existing } = await supabase
            .from('no_dues_forms')
            .select('id')
            .eq('registration_no', enrollmentNo)
            .single();
          
          if (existing) {
            // Update existing record to completed
            const { data, error } = await supabase
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
              .eq('registration_no', enrollmentNo)
              .select();
            
            if (error) {
              console.error(`❌ Error updating ${enrollmentNo}:`, error.message);
              errorCount++;
              errors.push({ enrollmentNo, error: error.message });
            } else {
              console.log(`✅ Updated ${enrollmentNo} to completed status`);
              successCount++;
              createdRecords.push(data[0]);
            }
          } else {
            // Create new record
            const { data, error } = await supabase
              .from('no_dues_forms')
              .insert(studentData)
              .select();
            
            if (error) {
              console.error(`❌ Error creating ${enrollmentNo}:`, error.message);
              errorCount++;
              errors.push({ enrollmentNo, error: error.message });
            } else {
              console.log(`✅ Created ${enrollmentNo} as completed`);
              successCount++;
              createdRecords.push(data[0]);
            }
          }
        } catch (err) {
          console.error(`💥 Unexpected error for ${enrollmentNo}:`, err.message);
          errorCount++;
          errors.push({ enrollmentNo, error: err.message });
        }
      }
      
      // Small delay between batches
      if (i + batchSize < completedStudents.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Successfully processed: ${successCount} students`);
    console.log(`❌ Failed: ${errorCount} students`);
    
    // Save created records
    if (createdRecords.length > 0) {
      fs.writeFileSync(
        path.join(__dirname, '../created_completed_students.json'),
        JSON.stringify(createdRecords, null, 2)
      );
      console.log(`💾 Created records saved to created_completed_students.json`);
    }
    
    if (errors.length > 0) {
      fs.writeFileSync(
        path.join(__dirname, '../create_errors.json'),
        JSON.stringify(errors, null, 2)
      );
      console.log(`💾 Errors saved to create_errors.json`);
    }
    
    // Save summary
    const summary = {
      totalProcessed: completedStudents.length,
      successCount,
      errorCount,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../create_summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n🎉 Student creation completed!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Verify creation
async function verifyCreation() {
  try {
    console.log('\n🔍 Verifying created records...');
    
    loadEnv();
    const supabase = initSupabase();
    
    // Count completed students
    const { count: completedCount, error: countError } = await supabase
      .from('no_dues_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');
    
    if (countError) {
      console.error('❌ Error counting completed:', countError);
    } else {
      console.log(`✅ Total completed students in database: ${completedCount}`);
    }
    
    // Get status breakdown
    const { data: allRecords } = await supabase
      .from('no_dues_forms')
      .select('status');
    
    const statusCounts = {};
    allRecords.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });
    
    console.log('\n📈 Current status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
  } catch (error) {
    console.error('💥 Verification error:', error);
  }
}

// Main execution
async function main() {
  await createCompletedStudents();
  await verifyCreation();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createCompletedStudents, verifyCreation };
